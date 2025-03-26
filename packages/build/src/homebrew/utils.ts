import crypto from 'crypto';
import https from 'https';

export async function npmPackageSha256(
  packageUrl: string,
  httpGetFn: typeof httpGet = httpGet
): Promise<string> {
  const json = await httpGetFn<{
  dist: {
	tarball: string;
	shasum: string;
	}
  }>(packageUrl, 'json');
  const tarballUrl = json.dist.tarball;
  const shasum = json.dist.shasum;

  const tarball = await getTarballWithRetries(tarballUrl, shasum, httpGetFn);
  const hash = crypto.createHash('sha256');
  hash.update(tarball);
  return hash.digest('hex');
}

async function getTarballWithRetries(
  url: string,
  shasum: string,
  httpGetFn: typeof httpGet,
  attempts = 3
): Promise<Buffer> {
  try {
    const tarball = await httpGetFn(url, 'binary');
    const hash = crypto.createHash('sha1').update(tarball).digest('hex');
    if (hash !== shasum) {
      throw new Error(`shasum mismatch: expected '${shasum}', got '${hash}'`);
    }

    return tarball;
  } catch (err) {
    if (attempts === 0) {
      throw err;
    }

    return getTarballWithRetries(url, shasum, httpGetFn, attempts - 1);
  }
}

export function httpGet<T>(url: string, response: 'json'): Promise<T>;
export function httpGet(url: string, response: 'binary'): Promise<Buffer>;
export async function httpGet<T>(
  url: string,
  responseType: 'json' | 'binary'
): Promise<T | Buffer> {
  const response = await new Promise<string | Buffer[]>((resolve, reject) => {
    https.get(url, (stream) => {
      if (responseType === 'json') {
        stream.setEncoding('utf8');
      }

      let data: string | Buffer[] = responseType === 'json' ? '' : [];
      stream.on('error', (err) => reject(err));
      stream.on('data', (chunk) => {
        if (typeof data === 'string') {
          data += chunk;
        } else {
          data.push(chunk);
        }
      });
      stream.on('end', () => resolve(data));
    });
  });

  if (typeof response === 'string') {
    return JSON.parse(response);
  }

  return Buffer.concat(response);
}
