import type { Server as HTTPServer, IncomingMessage } from 'http';
import { createServer as createHTTPServer } from 'http';
import {
  MongoRunnerSetup,
  skipIfApiStrict,
  startSharedTestServer,
  startTestServer,
} from '../../../testing/integration-testing-hooks';
import { TestShell } from './test-shell';
import type { Server as HTTPSServer } from 'https';
import { createServer as createHTTPSServer } from 'https';
import {
  connectionStringWithLocalhost,
  getCertPath,
  useTmpdir,
} from './repl-helpers';
import { once } from 'events';
import { connect } from 'net';
import type { AddressInfo, Socket } from 'net';
import { promises as fs } from 'fs';
import { expect } from 'chai';
import path from 'path';
import { eventually } from '../../../testing/eventually';
import type { OIDCMockProviderConfig } from '@mongodb-js/oidc-mock-provider';
import { OIDCMockProvider } from '@mongodb-js/oidc-mock-provider';

const CA_CERT = getCertPath('ca.crt');
const SERVER_BUNDLE = getCertPath('server.bundle.pem');

describe.only('e2e proxy support', function () {
  skipIfApiStrict();
  afterEach(TestShell.cleanup);

  const tmpdir = useTmpdir();
  const testServer = startSharedTestServer();

  let httpServer: HTTPServer;
  let httpsServer: HTTPSServer;
  let connectRequests: IncomingMessage[];
  let connections: Socket[];
  let allConnectionIds: () => string[];

  beforeEach(async function () {
    connectRequests = [];
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
    httpsServer.on('connect', onconnect);
    function onconnect(
      this: HTTPServer,
      req: IncomingMessage,
      socket: Socket,
      head: Buffer
    ) {
      (req as any).server = this;
      connectRequests.push(req);
      socket.unshift(head);
      socket.write('HTTP/1.0 200 OK\r\n\r\n');
      let host: string;
      let port: string;
      if (req.url?.includes(']:')) {
        [host, port] = req.url.slice(1).split(']:');
      } else {
        [host, port] = (req.url ?? '').split(':');
      }
      const outbound = connect(+port, host);
      socket.pipe(outbound).pipe(socket);
      const cleanup = () => {
        outbound.destroy();
        socket.destroy();
      };
      outbound.on('error', cleanup);
      socket.on('error', cleanup);
      connections.push(socket, outbound);
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
    const shell = TestShell.start({
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
    const shell = TestShell.start({
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
    const shell = TestShell.start({
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
    const shell = TestShell.start({
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
    const shell = TestShell.start({
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

    const shell = TestShell.start({
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
    const shell = TestShell.start({
      args: [await testServer.connectionString()],
      env: {
        ...process.env,
        MONGODB_PROXY: `https://localhost:${
          (httpsServer.address() as AddressInfo).port
        }/`,
      },
    });

    await eventually(() =>
      shell.assertContainsOutput('unable to verify the first certificate')
    );
    shell.kill();
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
      const shell = TestShell.start({
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
      const shell = TestShell.start({
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
    const shell = TestShell.start({
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

  context.only('with OIDC', function () {
    let getTokenPayload: typeof oidcMockProviderConfig.getTokenPayload;
    let oidcMockProviderConfig: OIDCMockProviderConfig;
    let oidcMockProviderHttps: OIDCMockProvider;
    let oidcTestServer: MongoRunnerSetup;

    before(async function () {
      if (
        process.platform !== 'linux' ||
        !process.env.MONGOSH_SERVER_TEST_VERSION ||
        !process.env.MONGOSH_SERVER_TEST_VERSION.includes('-enterprise')
      ) {
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
      oidcMockProviderHttps = await OIDCMockProvider.create({
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
      });
      const serverOidcConfig = {
        issuer: oidcMockProviderHttps.issuer,
        clientId: 'testServer',
        requestScopes: ['mongodbGroups'],
        authorizationClaim: 'groups',
        audience: 'resource-server-audience-value',
        authNamePrefix: 'dev',
      };
      const commonOidcServerArgs = [
        '--setParameter',
        'authenticationMechanisms=SCRAM-SHA-256,MONGODB-OIDC',
        // enableTestCommands allows using http:// issuers such as http://localhost
        '--setParameter',
        'enableTestCommands=true',
      ];
      oidcTestServer = new MongoRunnerSetup('e2e-proxy-oidc', {
        args: [
          '--setParameter',
          `oidcIdentityProviders=${JSON.stringify([serverOidcConfig])}`,
          ...commonOidcServerArgs,
        ],
      });
    });
    after(async function () {
      this.timeout(120_000);
      await Promise.all([
        oidcTestServer?.stop(),
        oidcMockProviderHttps?.close(),
      ]);
    });

    it('can route all traffic through the proxy', async function () {
      const shell = TestShell.start({
        args: [await oidcTestServer.connectionString()],
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
      expect(auth.authenticatedUsers).to.deep.include([
        { user: 'dev/testuser', db: '$external' },
      ]);

      expect(
        [...new Set(connectRequests.map((req) => req.url))].sort()
      ).to.deep.equal([]);
    });

    it('can route only http traffic through the proxy', async function () {
      const shell = TestShell.start({
        args: [await oidcTestServer.connectionString()],
        env: {
          ...process.env,
          HTTP_PROXY: `http://localhost:${
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
      expect(auth.authenticatedUsers).to.deep.include([
        { user: 'dev/testuser', db: '$external' },
      ]);

      expect(
        [...new Set(connectRequests.map((req) => req.url))].sort()
      ).to.deep.equal([]);
    });

    it('can use a pac script to selectively route traffic', async function () {
      httpServer.on('request', (req, res) => {
        (async () => {
          if (req.url === '/pac')
            res.end(`function FindProxyForURL(url, host) {
        if (url.includes(':${await oidcTestServer.port()}'))
          return 'HTTP 127.0.0.1:${(httpServer.address() as AddressInfo).port}';
        return 'HTTPS 127.0.0.1:${(httpsServer.address() as AddressInfo).port}';
      }`);
        })().catch(console.error);
      });
      const shell = TestShell.start({
        args: [await testServer.connectionString()],
        env: {
          ...process.env,
          ALL_PROXY: `pac+http://localhost:${
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
      expect(auth.authenticatedUsers).to.deep.include([
        { user: 'dev/testuser', db: '$external' },
      ]);

      expect(
        [
          ...new Set(
            connectRequests.map((req) => [req.url, (req as any).server])
          ),
        ].sort()
      ).to.deep.equal([]);
    });
  });
});
