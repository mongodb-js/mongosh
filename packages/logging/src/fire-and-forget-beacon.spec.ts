import { expect } from 'chai';
import http from 'http';
import { once } from 'events';
import { spawn } from 'child_process';
import path from 'path';
import type { AddressInfo } from 'net';
import { FireAndForgetBeacon } from './fire-and-forget-beacon';

describe('FireAndForgetBeacon', function () {
  let beacon: FireAndForgetBeacon;

  afterEach(function () {
    beacon?.close();
  });

  context('against a responding server', function () {
    let srv: http.Server;
    let baseUrl: string;
    let requests: http.IncomingMessage[];
    let connections: number;

    beforeEach(async function () {
      requests = [];
      connections = 0;
      srv = http
        .createServer((req, res) => {
          requests.push(req);
          // Content-Length must be explicit: Node's client-side HTTP parser
          // decides keep-alive eligibility from response framing headers
          // before it learns (from the request method) that a HEAD response
          // has no body, so a HEAD response with neither Content-Length nor
          // Transfer-Encoding is always treated as non-keep-alive and the
          // socket is destroyed instead of pooled.
          res.writeHead(200, { 'Content-Length': '0' });
          res.end();
        })
        .on('connection', () => {
          connections++;
        })
        .listen(0);
      await once(srv, 'listening');
      baseUrl = `http://localhost:${(srv.address() as AddressInfo).port}`;
    });

    afterEach(async function () {
      srv.close();
      await once(srv, 'close');
    });

    it('send a HEAD request with the provided headers', async function () {
      beacon = new FireAndForgetBeacon();
      // Subscribe before sending: `dispatched` may resolve before or after
      // the server has parsed the request, so a post-send once() could hang.
      const requestReceived = once(srv, 'request');
      const outcome = await beacon.send(`${baseUrl}/v1/test`, {
        Cookie: 'mge=abc',
      });
      expect(outcome.kind).to.equal('dispatched');
      expect(outcome)
        .to.have.property('durationMs')
        .that.is.a('number')
        .and.is.at.least(0);
      await requestReceived;
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].method).to.equal('HEAD');
      expect(requests[0].url).to.equal('/v1/test');
      expect(requests[0].headers.cookie).to.equal('mge=abc');
    });

    it('merge default headers into every request', async function () {
      beacon = new FireAndForgetBeacon({
        defaultHeaders: { 'User-Agent': 'mongosh/9.9.9' },
      });
      const requestReceived = once(srv, 'request');
      await beacon.send(`${baseUrl}/v1/test`, { Cookie: 'mge=abc' });
      await requestReceived;
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].headers['user-agent']).to.equal('mongosh/9.9.9');
      expect(requests[0].headers.cookie).to.equal('mge=abc');
    });

    it('reuse the keep-alive connection across sequential sends', async function () {
      beacon = new FireAndForgetBeacon();
      await beacon.send(`${baseUrl}/v1/one`, {});
      // Wait for the first response to complete so the socket returns to the pool.
      await new Promise((resolve) => setTimeout(resolve, 100));
      await beacon.send(`${baseUrl}/v1/two`, {});
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(requests).to.have.lengthOf(2);
      expect(connections).to.equal(1);
    });
  });

  context('against a server that never responds', function () {
    let srv: http.Server;
    let baseUrl: string;
    let seenRequests: number;

    beforeEach(async function () {
      seenRequests = 0;
      // Accepts connections and requests but never sends a response.
      srv = http
        .createServer(() => {
          seenRequests++;
        })
        .listen(0);
      await once(srv, 'listening');
      baseUrl = `http://localhost:${(srv.address() as AddressInfo).port}`;
    });

    afterEach(async function () {
      srv.closeAllConnections();
      srv.close();
      await once(srv, 'close');
    });

    it('resolve as dispatched without waiting for the server to respond', async function () {
      beacon = new FireAndForgetBeacon();
      const start = Date.now();
      const outcome = await beacon.send(`${baseUrl}/v1/test`, {
        Cookie: 'mge=abc',
      });
      expect(outcome.kind).to.equal('dispatched');
      expect(Date.now() - start).to.be.lessThan(1_000);
    });

    it('open parallel connections for concurrent sends instead of queueing behind a stalled response', async function () {
      beacon = new FireAndForgetBeacon();
      const start = Date.now();
      // Subscribe before sending: `dispatched` resolves from the client-side
      // 'finish'/'connect' events, whose microtask continuations run before
      // the event loop gets to the server's own (separate) socket callbacks,
      // so asserting on `seenRequests` immediately after would be racy.
      let received = 0;
      const bothRequestsReceived = new Promise<void>((resolve) => {
        srv.on('request', () => {
          received++;
          if (received === 2) resolve();
        });
      });
      const outcomes = await Promise.all([
        beacon.send(`${baseUrl}/v1/one`, {}),
        beacon.send(`${baseUrl}/v1/two`, {}),
      ]);
      expect(outcomes.map(({ kind }) => kind)).to.deep.equal([
        'dispatched',
        'dispatched',
      ]);
      expect(Date.now() - start).to.be.lessThan(1_000);
      await bothRequestsReceived;
      expect(seenRequests).to.equal(2);
    });

    it('let the process exit while the server is still holding the request open', async function () {
      // Spawns a child that sends a beacon to this blackhole server and then
      // reaches the end of its script. Because sockets are unref'd, the child
      // must exit on its own; a ref'd socket would hang it until the timeout.
      const fixture = path.resolve(
        __dirname,
        '..',
        'test',
        'fixtures',
        'beacon-exit-fixture.ts'
      );
      const child = spawn(
        process.execPath,
        [
          '--require',
          'ts-node/register/transpile-only',
          fixture,
          String((srv.address() as AddressInfo).port),
        ],
        {
          cwd: path.resolve(__dirname, '..'),
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      );
      let stdout = '';
      let stderr = '';
      child.stdout.setEncoding('utf8').on('data', (chunk) => {
        stdout += chunk;
      });
      child.stderr.setEncoding('utf8').on('data', (chunk) => {
        stderr += chunk;
      });
      const [code] = await once(child, 'exit');
      expect(stderr).to.equal('');
      expect(stdout).to.include('"kind":"dispatched"');
      expect(code).to.equal(0);
    });
  });

  context('against an unreachable endpoint', function () {
    it('resolve with an error outcome when the connection is refused', async function () {
      // Grab a port that is momentarily free, then close the server so
      // nothing is listening on it.
      const srv = http.createServer().listen(0);
      await once(srv, 'listening');
      const port = (srv.address() as AddressInfo).port;
      srv.close();
      await once(srv, 'close');

      beacon = new FireAndForgetBeacon();
      const outcome = await beacon.send(`http://localhost:${port}/v1/test`, {});
      expect(outcome.kind).to.equal('error');
      expect(outcome).to.have.nested.property('error.code', 'ECONNREFUSED');
    });

    it('resolve with an error outcome for an unparsable URL', async function () {
      beacon = new FireAndForgetBeacon();
      const outcome = await beacon.send('not a url', {});
      expect(outcome.kind).to.equal('error');
      expect(outcome).to.have.nested.property('error.name', 'TypeError');
    });
  });
});
