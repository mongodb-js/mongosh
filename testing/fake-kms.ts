import DuplexPair from 'duplexpair';
import http from 'http';

// Exact values specified by RFC6749 ;)
const oauthToken = { access_token: '2YotnFZFEjr1zCsicMWpAA', expires_in: 3600 };

// Return a Duplex stream that behaves like an HTTP stream, with the 'server'
// being provided by the handler function in this case (which is expected
// to return JSON).
type RequestData = { url: string, body: string };
function makeFakeHTTP(handler: (data: RequestData) => any): NodeJS.ReadableStream & NodeJS.WritableStream {
  const { socket1, socket2 } = new DuplexPair();
  const httpServer = http.createServer((req, res) => {
    let body = '';
    req.setEncoding('utf8').on('data', chunk => { body += chunk; });
    req.on('end', () => {
      res.writeHead(200, {
        'Content-Type': 'application/json'
      });
      res.end(JSON.stringify(handler({ url: req.url, body })));
    });
  });
  httpServer.emit('connection', socket2);
  return socket1;
}

export function fakeAWSKMS(): NodeJS.ReadableStream & NodeJS.WritableStream {
  return makeFakeHTTP(({ body }) => {
    const request = JSON.parse(body);
    let response;
    if (request.KeyId && request.Plaintext) {
      // Famously "unbreakable" base64 encryption ;) We use this to forward
      // both KeyId and Plaintext so that they are available for generating
      // the decryption response, which also provides the KeyId and Plaintext
      // based on the CiphertextBlob alone.
      const CiphertextBlob = Buffer.from(request.KeyId + '\0' + request.Plaintext).toString('base64')
      return {
        CiphertextBlob,
        EncryptionAlgorithm: 'SYMMETRIC_DEFAULT',
        KeyId: request.KeyId
      };
    } else {
      const [ KeyId, Plaintext ] = Buffer.from(request.CiphertextBlob, 'base64').toString().split('\0');
      return {
        Plaintext,
        EncryptionAlgorithm: 'SYMMETRIC_DEFAULT',
        KeyId
      };
    }
  });
}

export function fakeAzureKMS(): NodeJS.ReadableStream & NodeJS.WritableStream {
  return makeFakeHTTP(({ body, url }) => {
    if (url.endsWith('/token')) {
      return oauthToken;
    } else if (url.match(/\/(un)?wrapkey/)) {
      // Just act as if this was encrypted.
      return { value: JSON.parse(body).value };
    }
  });
}

export function fakeGCPKMS(): NodeJS.ReadableStream & NodeJS.WritableStream {
  return makeFakeHTTP(({ body, url }) => {
    if (url.endsWith('/token')) {
      return oauthToken;
    } else if (url.endsWith(':encrypt')) {
      // Here we also just perform noop encryption.
      return { ciphertext: JSON.parse(body).plaintext };
    } else if (url.endsWith(':decrypt')) {
      return { plaintext: JSON.parse(body).ciphertext };
    }
  });
}
