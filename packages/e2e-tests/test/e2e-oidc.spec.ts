import {
  MongoRunnerSetup,
  skipIfApiStrict,
  skipIfEnvServerVersion,
} from '../../../testing/integration-testing-hooks';
import { promises as fs } from 'fs';
import type { OIDCMockProviderConfig } from '@mongodb-js/oidc-mock-provider';
import { OIDCMockProvider } from '@mongodb-js/oidc-mock-provider';
import { TestShell } from './test-shell';
import path from 'path';
import { expect } from 'chai';
import { createServer as createHTTPSServer } from 'https';
import { getCertPath, useTmpdir } from './repl-helpers';

describe('OIDC auth e2e', function () {
  skipIfApiStrict(); // connectionStatus is unversioned.

  let getTokenPayload: typeof oidcMockProviderConfig.getTokenPayload;
  let tokenFetches: number;
  let testServer: MongoRunnerSetup;
  let testServer2: MongoRunnerSetup;
  let oidcMockProviderConfig: OIDCMockProviderConfig;
  let oidcMockProvider: OIDCMockProvider;
  let oidcMockProviderHttps: OIDCMockProvider;
  let shell: TestShell;
  const tmpdir = useTmpdir();

  const fetchBrowserFixture = `"${path.resolve(
    __dirname,
    'fixtures',
    'curl.mjs'
  )}"`;

  skipIfEnvServerVersion('< 7.0');

  before(async function () {
    if (
      process.platform !== 'linux' ||
      !process.env.MONGOSH_SERVER_TEST_VERSION ||
      !process.env.MONGOSH_SERVER_TEST_VERSION.includes('-enterprise') ||
      +process.version.slice(1).split('.')[0] < 16
    ) {
      // OIDC is only supported on Linux in the 7.0+ enterprise server,
      // and we can't skip based on the dynamically detected server version because
      // the OIDC config is something that needs to be available at server startup time.
      // Our mock OIDC provider does not work with Node.js 14, so we also need to skip
      // tests there.
      return this.skip();
    }

    this.timeout(120_000);
    oidcMockProviderConfig = {
      getTokenPayload(metadata) {
        return getTokenPayload(metadata);
      },
    };
    const httpsServerKeyCertBundle = await fs.readFile(
      getCertPath('server.bundle.pem')
    );
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
    const serverOidcConfig = {
      issuer: oidcMockProvider.issuer,
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
    testServer = new MongoRunnerSetup('e2e-oidc-test1', {
      args: [
        '--setParameter',
        `oidcIdentityProviders=${JSON.stringify([serverOidcConfig])}`,
        ...commonOidcServerArgs,
      ],
    });
    testServer2 = new MongoRunnerSetup('e2e-oidc-test2', {
      args: [
        '--setParameter',
        `oidcIdentityProviders=${JSON.stringify([
          {
            ...serverOidcConfig,
            clientId: 'testServer2',
            matchPattern: '^testuser$',
            authNamePrefix: 'dev',
          },
          {
            ...serverOidcConfig,
            clientId: 'testServer2',
            matchPattern: '^httpsIdPtestuser$',
            authNamePrefix: 'https',
            issuer: oidcMockProviderHttps.issuer,
          },
        ])}`,
        ...commonOidcServerArgs,
      ],
    });
    await Promise.all([testServer.start(), testServer2.start()]);
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

  after(async function () {
    this.timeout(120_000);
    await Promise.all([
      testServer?.stop(),
      testServer2?.stop(),
      oidcMockProvider?.close(),
      oidcMockProviderHttps?.close(),
    ]);
  });

  afterEach(TestShell.cleanup);

  async function verifyUser(
    shell: TestShell,
    username: string,
    group: string
  ): Promise<void> {
    const status = await shell.executeLine(
      'db.runCommand({connectionStatus: 1})'
    );
    expect(status).to.include(
      `authenticatedUsers: [ { user: 'dev/${username}', db: '$external' } ]`
    );
    expect(status).to.include(
      `authenticatedUserRoles: [ { role: 'dev/${group}', db: 'admin' } ]`
    );
  }

  it('can successfully authenticate using OIDC Auth Code Flow', async function () {
    shell = TestShell.start({
      args: [
        await testServer.connectionString(),
        '--authenticationMechanism=MONGODB-OIDC',
        '--oidcRedirectUri=http://localhost:0/',
        `--browser=${fetchBrowserFixture}`,
      ],
    });
    await shell.waitForPrompt();

    await verifyUser(shell, 'testuser', 'testServer-group');
    shell.assertNoErrors();
  });

  it('can successfully authenticate using OIDC Auth Code Flow when a username is specified', async function () {
    shell = TestShell.start({
      args: [
        await testServer.connectionString(),
        '--username=testuser',
        '--authenticationMechanism=MONGODB-OIDC',
        '--oidcRedirectUri=http://localhost:0/',
        `--browser=${fetchBrowserFixture}`,
      ],
    });
    await shell.waitForPrompt();

    await verifyUser(shell, 'testuser', 'testServer-group');
    shell.assertNoErrors();
  });

  it('can successfully authenticate using OIDC Device Auth Flow', async function () {
    shell = TestShell.start({
      args: [
        await testServer.connectionString(),
        '--authenticationMechanism=MONGODB-OIDC',
        '--oidcFlows=device-auth',
      ],
    });
    await shell.waitForPrompt();
    shell.assertContainsOutput(
      'Visit the following URL to complete authentication'
    );
    shell.assertContainsOutput('Enter the following code on that page');

    await verifyUser(shell, 'testuser', 'testServer-group');
    shell.assertNoErrors();
  });

  it('hints the user to use Device Auth Flow if starting a browser fails', async function () {
    shell = TestShell.start({
      args: [
        await testServer.connectionString(),
        '--authenticationMechanism=MONGODB-OIDC',
        '--oidcRedirectUri=http://localhost:0/',
        '--browser=false',
      ],
    });
    await shell.waitForExit();
    shell.assertContainsOutput(
      'Consider specifying --oidcFlows=auth-code,device-auth if you are running mongosh in an environment without browser access'
    );
  });

  it('can successfully re-authenticate when tokens expire', async function () {
    const originalGetPayload = getTokenPayload;
    getTokenPayload = async (metadata) => {
      return {
        expires_in: 10,
        payload: (await originalGetPayload(metadata)).payload,
      };
    };
    shell = TestShell.start({
      args: [
        await testServer.connectionString(),
        '--authenticationMechanism=MONGODB-OIDC',
        '--oidcRedirectUri=http://localhost:0/',
        `--browser=${fetchBrowserFixture}`,
      ],
    });
    await shell.waitForPrompt();

    await shell.executeLine('db.adminCommand({ping: 1})');
    await shell.executeLine('sleep(1000)');
    await shell.executeLine('db.adminCommand({ping: 1})');
    shell.assertNoErrors();
    expect(tokenFetches).to.be.greaterThan(1);
  });

  it('keeps authentication state when resetting connection options', async function () {
    const cs = await testServer.connectionString();
    shell = TestShell.start({
      args: [
        cs,
        '--authenticationMechanism=MONGODB-OIDC',
        '--oidcRedirectUri=http://localhost:0/',
        `--browser=${fetchBrowserFixture}`,
      ],
    });
    await shell.waitForPrompt();

    await verifyUser(shell, 'testuser', 'testServer-group');
    await shell.executeLine('db.getMongo().setReadPref("primaryPreferred");');
    await verifyUser(shell, 'testuser', 'testServer-group');
    const cs2 = await testServer.connectionString({
      authMechanism: 'MONGODB-OIDC',
    });
    await shell.executeLine(`db = connect(${JSON.stringify(cs2)})`);
    await verifyUser(shell, 'testuser', 'testServer-group');
    shell.assertNoErrors();
    expect(tokenFetches).to.equal(1);
  });

  it('re-authenticates when connecting to a different endpoint from the same shell', async function () {
    const urlOptions = { username: 'testuser' }; // Make sure these match between the two connections
    shell = TestShell.start({
      args: [
        await testServer.connectionString({}, urlOptions),
        '--authenticationMechanism=MONGODB-OIDC',
        '--oidcRedirectUri=http://localhost:0/',
        `--browser=${fetchBrowserFixture}`,
      ],
    });
    await shell.waitForPrompt();

    await verifyUser(shell, 'testuser', 'testServer-group');
    const cs2 = await testServer2.connectionString(
      {
        authMechanism: 'MONGODB-OIDC',
      },
      urlOptions
    );
    await shell.executeLine(`db = connect(${JSON.stringify(cs2)})`);
    await verifyUser(shell, 'testuser', 'testServer2-group');
    shell.assertNoErrors();
    expect(tokenFetches).to.equal(2);
  });

  it('can share state with another shell', async function () {
    shell = TestShell.start({
      args: [
        await testServer.connectionString(),
        '--authenticationMechanism=MONGODB-OIDC',
        '--oidcRedirectUri=http://localhost:0/',
        `--browser=${fetchBrowserFixture}`,
      ],
    });

    await shell.waitForPrompt();
    await verifyUser(shell, 'testuser', 'testServer-group');

    // Internal hack to get a state-share server as e.g. Compass or the VSCode extension would
    let handle = await shell.executeLine(
      'db.getMongo()._serviceProvider.currentClientOptions.parentState.getStateShareServer()'
    );
    // `handle` can include the next prompt when returned by `shell.executeLine()`,
    // so look for the longest prefix of it that is valid JSON.
    while (handle) {
      try {
        JSON.parse(handle);
        break;
      } catch {
        /* next */
      }
      handle = handle.slice(0, -1);
    }

    const shell2 = TestShell.start({
      args: [
        await testServer.connectionString(),
        '--authenticationMechanism=MONGODB-OIDC',
        '--oidcRedirectUri=http://localhost:0/',
        `--browser=${fetchBrowserFixture}`,
      ],
      env: {
        ...process.env,
        MONGOSH_OIDC_PARENT_HANDLE: handle,
      },
    });

    await shell2.waitForPrompt();
    await verifyUser(shell2, 'testuser', 'testServer-group');
    expect(tokenFetches).to.equal(1);
    shell.assertNoErrors();
    shell2.assertNoErrors();
  });

  it('can apply --useSystemCA to the IdP https endpoint', async function () {
    await fs.mkdir(path.join(tmpdir.path, 'certs'), { recursive: true });
    await fs.copyFile(
      getCertPath('ca.crt'),
      path.join(tmpdir.path, 'certs', 'somefilename.crt')
    );

    shell = TestShell.start({
      args: [
        await testServer2.connectionString(
          {},
          { username: 'httpsIdPtestuser' }
        ),
        '--authenticationMechanism=MONGODB-OIDC',
        '--oidcRedirectUri=http://localhost:0/',
        `--browser=${fetchBrowserFixture}`,
        '--tlsUseSystemCA',
      ],
      env: {
        ...process.env,
        SSL_CERT_DIR: path.join(tmpdir.path, 'certs') + '',
        MONGOSH_E2E_TEST_CURL_ALLOW_INVALID_TLS: '1',
      },
    });
    await shell.waitForExit();
    // We cannot make the mongod server accept the mock IdP's certificate,
    // so the best we can verify here is that auth failed *on the server*
    shell.assertContainsOutput(/MongoServerError: Authentication failed/);

    // Negative test: Without --tlsUseSystemCA, mongosh fails earlier:
    shell = TestShell.start({
      args: [
        await testServer2.connectionString(
          {},
          { username: 'httpsIdPtestuser' }
        ),
        '--authenticationMechanism=MONGODB-OIDC',
        '--oidcRedirectUri=http://localhost:0/',
        `--browser=${fetchBrowserFixture}`,
      ],
    });
    await shell.waitForExit();
    shell.assertContainsOutput(
      /Unable to fetch issuer metadata for "https:\/\/localhost:\d+"/
    );
  });
});
