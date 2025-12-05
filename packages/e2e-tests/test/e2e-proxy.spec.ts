import type {
  Server as HTTPServer,
  IncomingMessage,
  ServerResponse,
} from 'http';
import { createServer as createHTTPServer, request } from 'http';
import {
  getTestCertificatePath as getCertPath,
  MongoRunnerSetup,
  skipIfApiStrict,
  skipIfEnvServerVersion,
  startSharedTestServer,
  startTestServer,
} from '@mongosh/testing';
import type { Server as HTTPSServer } from 'https';
import { createServer as createHTTPSServer } from 'https';
import { connectionStringWithLocalhost, useTmpdir } from './repl-helpers';
import { once } from 'events';
import { connect } from 'net';
import type { AddressInfo, Socket } from 'net';
import { promises as fs } from 'fs';
import { expect } from 'chai';
import path from 'path';
import type { OIDCMockProviderConfig } from '@mongodb-js/oidc-mock-provider';
import { OIDCMockProvider } from '@mongodb-js/oidc-mock-provider';
import {
  baseOidcServerConfig,
  commonOidcServerArgs,
  skipOIDCTestsDueToPlatformOrServerVersion,
} from './oidc-helpers';

const CA_CERT = getCertPath('ca.crt');
const SERVER_BUNDLE = getCertPath('server.bundle.pem');

describe('e2e proxy support', function () {
  skipIfApiStrict();
  skipIfEnvServerVersion('< 7.0');

  const tmpdir = useTmpdir();
  const testServer = startSharedTestServer();

  let httpServer: HTTPServer;
  let httpsServer: HTTPSServer;
  let connectRequests: IncomingMessage[];
  let httpForwardRequests: IncomingMessage[];
  let connections: Socket[];
  let allConnectionIds: () => string[];

  beforeEach(async function () {
    connectRequests = [];
    httpForwardRequests = [];
    connections = [];
    allConnectionIds = () =>
      connections.flatMap((sock) => {
        const { port } = sock.address() as AddressInfo;
        return [`127.0.0.1:${port}`, `[::1]:${port}`, `localhost:${port}`];
      });

    httpServer = createHTTPServer().listen(0);
    await once(httpServer, 'listening');
    httpsServer = createHTTPSServer({
      key: await fs.readFile(SERVER_BUNDLE),
      cert: await fs.readFile(SERVER_BUNDLE),
    }).listen(0);
    await once(httpsServer, 'listening');

    httpServer.on('connect', onconnect);
    httpServer.on('request', onrequest);
    httpsServer.on('connect', onconnect);
    httpsServer.on('request', onrequest);
    function onconnect(
      this: HTTPServer,
      req: IncomingMessage,
      socket: Socket,
      head: Buffer
    ): void {
      (req as any).server = this;
      let host: string;
      let port: string;
      if (req.url?.includes(']:')) {
        [host, port] = req.url.slice(1).split(']:');
      } else {
        [host, port] = (req.url ?? '').split(':');
      }
      if (host === 'compass.mongodb.com' || host === 'downloads.mongodb.com') {
        // The snippet loader and update notifier can reach out to thes endpoints,
        // but we usually do not actually wait for this to happen or not in CI,
        // so we're just ignoring these requests here to avoid flaky behavior.
        socket.end();
        return;
      }
      connectRequests.push(req);
      socket.unshift(head);
      socket.write('HTTP/1.0 200 OK\r\n\r\n');
      const outbound = connect(+port, host);
      socket.pipe(outbound).pipe(socket);
      // socket.on('data', chk => console.log('[from client] ' + chk.toString()));
      // outbound.on('data', chk => console.log('[from server] ' + chk.toString()));
      const cleanup = () => {
        outbound.destroy();
        socket.destroy();
      };
      outbound.on('error', cleanup);
      socket.on('error', cleanup);
      connections.push(socket, outbound);
    }
    function onrequest(req: IncomingMessage, res: ServerResponse) {
      httpForwardRequests.push(req);
      const proxyReq = request(
        req.url!,
        { method: req.method, headers: req.headers },
        (proxyRes) => proxyRes.pipe(res)
      );
      if (req.method === 'GET') proxyReq.end();
      else req.pipe(proxyReq);
    }
  });

  afterEach(async function () {
    for (const conn of connections) {
      if (!conn.destroyed) conn.destroy();
    }
    httpServer.close();
    httpsServer.close();
    await Promise.all([once(httpServer, 'close'), once(httpsServer, 'close')]);
  });

  it('can connect using an HTTP proxy', async function () {
    const shell = this.startTestShell({
      args: [await testServer.connectionString()],
      env: {
        ...process.env,
        MONGODB_PROXY: `http://localhost:${
          (httpServer.address() as AddressInfo).port
        }/`,
      },
    });

    await shell.waitForPrompt();
    expect(connections).to.have.lengthOf.greaterThan(1);
    const myself = await shell.executeLineWithJSONResult(
      'db.adminCommand({ whatsmyuri: 1 })'
    );
    expect(myself.ok).to.equal(1);
    expect(myself.you).to.be.oneOf(allConnectionIds());
  });

  it('can connect using an HTTP proxy with auth', async function () {
    const shell = this.startTestShell({
      args: [await testServer.connectionString()],
      env: {
        ...process.env,
        MONGODB_PROXY: `http://foo:bar@localhost:${
          (httpServer.address() as AddressInfo).port
        }/`,
      },
    });

    await shell.waitForPrompt();
    expect(connections).to.have.lengthOf.greaterThan(1);
    const myself = await shell.executeLineWithJSONResult(
      'db.adminCommand({ whatsmyuri: 1 })'
    );
    expect(myself.ok).to.equal(1);
    expect(myself.you).to.be.oneOf(allConnectionIds());
    for (const req of connectRequests)
      expect(req.headers['proxy-authorization']).to.equal('Basic Zm9vOmJhcg==');
  });

  it('can connect using an HTTP proxy specified via ALL_PROXY', async function () {
    const shell = this.startTestShell({
      args: [await testServer.connectionString()],
      env: {
        ...process.env,
        ALL_PROXY: `http://foo:bar@localhost:${
          (httpServer.address() as AddressInfo).port
        }/`,
      },
    });

    await shell.waitForPrompt();
    expect(connections).to.have.lengthOf.greaterThan(1);
    const myself = await shell.executeLineWithJSONResult(
      'db.adminCommand({ whatsmyuri: 1 })'
    );
    expect(myself.ok).to.equal(1);
    expect(myself.you).to.be.oneOf(allConnectionIds());
    for (const req of connectRequests)
      expect(req.headers['proxy-authorization']).to.equal('Basic Zm9vOmJhcg==');
  });

  it('can connect using an HTTPS proxy (explicit CA on command line)', async function () {
    const shell = this.startTestShell({
      args: [await testServer.connectionString(), '--tlsCAFile', CA_CERT],
      env: {
        ...process.env,
        MONGODB_PROXY: `https://localhost:${
          (httpsServer.address() as AddressInfo).port
        }/`,
      },
    });

    await shell.waitForPrompt();
    expect(connections).to.have.lengthOf.greaterThan(1);
    const myself = await shell.executeLineWithJSONResult(
      'db.adminCommand({ whatsmyuri: 1 })'
    );
    expect(myself.ok).to.equal(1);
    expect(myself.you).to.be.oneOf(allConnectionIds());
  });

  it('can connect using an HTTPS proxy (CA in connection string)', async function () {
    const shell = this.startTestShell({
      args: [await testServer.connectionString({ tlsCAFile: CA_CERT })],
      env: {
        ...process.env,
        MONGODB_PROXY: `https://localhost:${
          (httpsServer.address() as AddressInfo).port
        }/`,
      },
    });

    await shell.waitForPrompt();
    expect(connections).to.have.lengthOf.greaterThan(1);
    const myself = await shell.executeLineWithJSONResult(
      'db.adminCommand({ whatsmyuri: 1 })'
    );
    expect(myself.ok).to.equal(1);
    expect(myself.you).to.be.oneOf(allConnectionIds());
  });

  it('can connect using an HTTPS proxy (CA in system list)', async function () {
    if (process.platform !== 'linux') return this.skip();
    await fs.mkdir(path.join(tmpdir.path, 'certs'), { recursive: true });
    await fs.copyFile(
      CA_CERT,
      path.join(tmpdir.path, 'certs', 'somefilename.crt')
    );

    const shell = this.startTestShell({
      args: [await testServer.connectionString()],
      env: {
        ...process.env,
        MONGODB_PROXY: `https://localhost:${
          (httpsServer.address() as AddressInfo).port
        }/`,
        SSL_CERT_DIR: path.join(tmpdir.path, 'certs'),
      },
    });

    await shell.waitForPrompt();
    expect(connections).to.have.lengthOf.greaterThan(1);
    const myself = await shell.executeLineWithJSONResult(
      'db.adminCommand({ whatsmyuri: 1 })'
    );
    expect(myself.ok).to.equal(1);
    expect(myself.you).to.be.oneOf(allConnectionIds());
  });

  it('fails to connect using HTTPS proxy (no CA)', async function () {
    const shell = this.startTestShell({
      args: [await testServer.connectionString({ connectTimeoutMS: '2000' })],
      env: {
        ...process.env,
        MONGODB_PROXY: `https://localhost:${
          (httpsServer.address() as AddressInfo).port
        }/`,
      },
    });

    const code = await shell.waitForAnyExit();
    expect(code).to.equal(1);
  });

  context('to a TLS server', function () {
    const tlsServer = startTestServer('e2e-proxy-tls', {
      args: [
        '--tlsMode',
        'requireTLS',
        '--tlsCertificateKeyFile',
        SERVER_BUNDLE,
        '--tlsAllowConnectionsWithoutCertificates',
        '--tlsCAFile',
        CA_CERT,
      ],
    });

    it('can connect using an HTTP proxy', async function () {
      const shell = this.startTestShell({
        args: [
          await connectionStringWithLocalhost(tlsServer, {
            tlsCAFile: CA_CERT,
            tls: 'true',
          }),
        ],
        env: {
          ...process.env,
          MONGODB_PROXY: `http://localhost:${
            (httpServer.address() as AddressInfo).port
          }/`,
        },
      });

      await shell.waitForPrompt();
      expect(connections).to.have.lengthOf.greaterThan(1);
      const myself = await shell.executeLineWithJSONResult(
        'db.adminCommand({ whatsmyuri: 1 })'
      );
      expect(myself.ok).to.equal(1);
      expect(myself.you).to.be.oneOf(allConnectionIds());
    });

    it('can connect using an HTTPS proxy', async function () {
      const shell = this.startTestShell({
        args: [
          await connectionStringWithLocalhost(tlsServer, {
            tlsCAFile: CA_CERT,
            tls: 'true',
          }),
        ],
        env: {
          ...process.env,
          MONGODB_PROXY: `https://localhost:${
            (httpsServer.address() as AddressInfo).port
          }/`,
        },
      });

      await shell.waitForPrompt();
      expect(connections).to.have.lengthOf.greaterThan(1);
      const myself = await shell.executeLineWithJSONResult(
        'db.adminCommand({ whatsmyuri: 1 })'
      );
      expect(myself.ok).to.equal(1);
      expect(myself.you).to.be.oneOf(allConnectionIds());
    });
  });

  it('will exclude a proxy host specified in NO_PROXY', async function () {
    const shell = this.startTestShell({
      args: [await testServer.connectionString()],
      env: {
        ...process.env,
        MONGODB_PROXY: `http://localhost:${
          (httpServer.address() as AddressInfo).port
        }/`,
        NO_PROXY: 'localhost,127.0.0.1,::1',
      },
    });

    await shell.waitForPrompt();
    expect(connections).to.have.lengthOf(0);
    const myself = await shell.executeLineWithJSONResult(
      'db.adminCommand({ whatsmyuri: 1 })'
    );
    expect(myself.ok).to.equal(1);
    expect(myself.you).not.to.be.oneOf(allConnectionIds());
  });

  context('with OIDC', function () {
    let getTokenPayload: typeof oidcMockProviderConfig.getTokenPayload;
    let oidcMockProviderConfig: OIDCMockProviderConfig;
    let oidcMockProvider: OIDCMockProvider;
    let oidcMockProviderHttps: OIDCMockProvider;
    let oidcTestServer: MongoRunnerSetup;
    let tokenFetches: number;

    const fetchBrowserFixture = `"${path.resolve(
      __dirname,
      'fixtures',
      'curl.mjs'
    )}"`;

    before(async function () {
      if (skipOIDCTestsDueToPlatformOrServerVersion()) {
        // OIDC is only supported on Linux in the 7.0+ enterprise server,
        // and we can't skip based on the dynamically detected server version because
        // the OIDC config is something that needs to be available at server startup time.
        return this.skip();
      }

      this.timeout(120_000);
      oidcMockProviderConfig = {
        getTokenPayload(metadata) {
          return getTokenPayload(metadata);
        },
      };
      const httpsServerKeyCertBundle = await fs.readFile(SERVER_BUNDLE);
      [oidcMockProvider, oidcMockProviderHttps] = await Promise.all([
        OIDCMockProvider.create(oidcMockProviderConfig),
        OIDCMockProvider.create({
          ...oidcMockProviderConfig,
          createHTTPServer(requestListener) {
            return createHTTPSServer(
              {
                key: httpsServerKeyCertBundle,
                cert: httpsServerKeyCertBundle,
              },
              requestListener
            );
          },
        }),
      ]);
      oidcTestServer = new MongoRunnerSetup('e2e-proxy-oidc', {
        args: [
          '--setParameter',
          `oidcIdentityProviders=${JSON.stringify([
            {
              ...baseOidcServerConfig,
              clientId: 'testServer2',
              matchPattern: '^testuser$',
              authNamePrefix: 'dev',
              issuer: oidcMockProvider.issuer,
            },
            {
              ...baseOidcServerConfig,
              clientId: 'testServer2',
              matchPattern: '^httpsIdPtestuser$',
              authNamePrefix: 'https',
              issuer: oidcMockProviderHttps.issuer,
            },
          ])}`,
          ...commonOidcServerArgs,
        ],
      });
      await oidcTestServer.start();
    });
    after(async function () {
      this.timeout(120_000);
      await Promise.all([
        oidcTestServer?.stop(),
        oidcMockProvider?.close(),
        oidcMockProviderHttps?.close(),
      ]);
    });

    beforeEach(function () {
      tokenFetches = 0;
      getTokenPayload = (metadata) => {
        tokenFetches++;
        return {
          expires_in: 3600,
          payload: {
            // Define the user information stored inside the access tokens
            groups: [`${metadata.client_id}-group`],
            sub: 'testuser',
            aud: 'resource-server-audience-value',
          },
        };
      };
    });

    it('can route all traffic through the proxy', async function () {
      const shell = this.startTestShell({
        args: [
          await oidcTestServer.connectionString({}, { username: 'testuser' }),
          '--authenticationMechanism=MONGODB-OIDC',
          '--oidcRedirectUri=http://localhost:0/',
          `--browser=${fetchBrowserFixture}`,
        ],
        env: {
          ...process.env,
          ALL_PROXY: `http://localhost:${
            (httpServer.address() as AddressInfo).port
          }/`,
        },
      });

      await shell.waitForPrompt();
      expect(connections).to.have.lengthOf.greaterThan(1);
      const myself = await shell.executeLineWithJSONResult(
        'db.adminCommand({ whatsmyuri: 1 })'
      );
      expect(myself.ok).to.equal(1);
      expect(myself.you).to.be.oneOf(allConnectionIds());
      const auth = await shell.executeLineWithJSONResult(
        'db.adminCommand({connectionStatus: 1})'
      );
      expect(auth.authInfo.authenticatedUsers).to.deep.include({
        user: 'dev/testuser',
        db: '$external',
      });

      expect([...new Set(connectRequests.map((req) => req.url))]).to.deep.equal(
        [`127.0.0.1:${await oidcTestServer.port()}`]
      );
      expect([
        ...new Set(httpForwardRequests.map((req) => new URL(req.url!).host)),
      ]).to.deep.equal([
        `localhost:${
          (oidcMockProvider.httpServer.address() as AddressInfo).port
        }`,
      ]);
      expect(tokenFetches).to.be.greaterThanOrEqual(1);
    });

    it('can route only http traffic through the proxy', async function () {
      const shell = this.startTestShell({
        args: [
          await oidcTestServer.connectionString({}, { username: 'testuser' }),
          '--authenticationMechanism=MONGODB-OIDC',
          '--oidcRedirectUri=http://localhost:0/',
          `--browser=${fetchBrowserFixture}`,
        ],
        env: {
          ...process.env,
          HTTP_PROXY: `http://localhost:${
            (httpServer.address() as AddressInfo).port
          }/`,
        },
      });

      await shell.waitForPrompt();
      const auth = await shell.executeLineWithJSONResult(
        'db.adminCommand({connectionStatus: 1})'
      );
      expect(auth.authInfo.authenticatedUsers).to.deep.include({
        user: 'dev/testuser',
        db: '$external',
      });

      expect(connectRequests).to.have.lengthOf(0);
      expect([
        ...new Set(httpForwardRequests.map((req) => new URL(req.url!).host)),
      ]).to.deep.equal([
        `localhost:${
          (oidcMockProvider.httpServer.address() as AddressInfo).port
        }`,
      ]);
      expect(tokenFetches).to.be.greaterThanOrEqual(1);
    });

    it('can use a pac script to selectively route traffic', async function () {
      const otherListeners = httpServer.listeners('request');
      httpServer.removeAllListeners('request');
      httpServer.on(
        'request',
        function (this: HTTPServer, req: IncomingMessage, res: ServerResponse) {
          (async () => {
            if (req.url === '/pac') {
              res.end(`function FindProxyForURL(url, host) {
                if (url.includes(':${await oidcTestServer.port()}'))
                  return 'HTTP localhost:${
                    (httpServer.address() as AddressInfo).port
                  }';
                return 'HTTPS localhost:${
                  (httpsServer.address() as AddressInfo).port
                }';
              }`);
            } else {
              for (const listener of otherListeners)
                listener.call(this, req, res);
            }
          })().catch(console.error);
        }
      );
      const shell = this.startTestShell({
        args: [
          await oidcTestServer.connectionString({}, { username: 'testuser' }),
          '--authenticationMechanism=MONGODB-OIDC',
          '--oidcRedirectUri=http://localhost:0/',
          `--browser=${fetchBrowserFixture}`,
          `--tlsCAFile=${CA_CERT}`,
        ],
        env: {
          ...process.env,
          ALL_PROXY: `pac+http://localhost:${
            (httpServer.address() as AddressInfo).port
          }/pac`,
        },
      });

      await shell.waitForPrompt();
      expect(connections).to.have.lengthOf.greaterThan(1);
      const myself = await shell.executeLineWithJSONResult(
        'db.adminCommand({ whatsmyuri: 1 })'
      );
      expect(myself.ok).to.equal(1);
      expect(myself.you).to.be.oneOf(allConnectionIds());
      const auth = await shell.executeLineWithJSONResult(
        'db.adminCommand({connectionStatus: 1})'
      );
      expect(auth.authInfo.authenticatedUsers).to.deep.include({
        user: 'dev/testuser',
        db: '$external',
      });

      expect([...new Set(connectRequests.map((req) => req.url))]).to.deep.equal(
        [`127.0.0.1:${await oidcTestServer.port()}`]
      );
      expect([
        ...new Set(httpForwardRequests.map((req) => new URL(req.url!).host)),
      ]).to.deep.equal([
        `localhost:${
          (oidcMockProvider.httpServer.address() as AddressInfo).port
        }`,
      ]);
      expect(tokenFetches).to.be.greaterThanOrEqual(1);
    });

    it('can route all traffic through the proxy (https, incomplete without CA)', async function () {
      const shell = this.startTestShell({
        args: [
          await oidcTestServer.connectionString(
            {},
            { username: 'httpsIdPtestuser' }
          ),
          '--authenticationMechanism=MONGODB-OIDC',
          '--oidcRedirectUri=http://localhost:0/',
          `--browser=${fetchBrowserFixture}`,
          `--tlsCAFile=${CA_CERT}`,
        ],
        env: {
          ...process.env,
          ALL_PROXY: `http://localhost:${
            (httpServer.address() as AddressInfo).port
          }/`,
          MONGOSH_E2E_TEST_CURL_ALLOW_INVALID_TLS: '1',
        },
      });

      await shell.waitForAnyExit();
      // We cannot make the mongod server accept the mock IdP's certificate,
      // so the best we can verify here is that auth failed *on the server*
      shell.assertContainsOutput(/MongoServerError: Authentication failed/);

      expect(
        [...new Set(connectRequests.map((req) => req.url))].sort()
      ).to.deep.equal([
        `127.0.0.1:${await oidcTestServer.port()}`,
        `localhost:${
          (oidcMockProviderHttps.httpServer.address() as AddressInfo).port
        }`,
      ]);
      expect(tokenFetches).to.be.greaterThanOrEqual(1);
    });
  });
});
