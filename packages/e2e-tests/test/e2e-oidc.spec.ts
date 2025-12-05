import {
  getTestCertificatePath as getCertPath,
  MongoRunnerSetup,
  skipIfApiStrict,
  skipIfEnvServerVersion,
} from '@mongosh/testing';
import { promises as fs } from 'fs';
import type { OIDCMockProviderConfig } from '@mongodb-js/oidc-mock-provider';
import { OIDCMockProvider } from '@mongodb-js/oidc-mock-provider';
import type { TestShell } from './test-shell';
import path from 'path';
import { expect } from 'chai';
import { createServer as createHTTPSServer } from 'https';
import { readReplLogFile, useTmpdir } from './repl-helpers';
import {
  baseOidcServerConfig,
  commonOidcServerArgs,
  skipOIDCTestsDueToPlatformOrServerVersion,
} from './oidc-helpers';
import { createMongoDBOIDCPlugin } from '@mongodb-js/oidc-plugin';
import { startTestShell } from './test-shell-context';

/**
 * @securityTest OIDC Authentication End-to-End Tests
 *
 * In addition to our regular tests for the different authentication mechanisms supported
 * by MongoDB, we give special consideration to our OpenID Connect database authentication
 * feature, as it involves client applications performing actions based on directions
 * received from the database server.
 *
 * Additionally, since the shell supports connections to multiple different endpoints in the
 * same application, these tests ensure that OIDC authentication for distinct endpoints
 * happens in isolation.
 */
describe('OIDC auth e2e', function () {
  skipIfApiStrict(); // connectionStatus is unversioned.

  let getTokenPayload: typeof oidcMockProviderConfig.getTokenPayload;
  let tokenFetches: number;
  let testServer: MongoRunnerSetup;
  let testServer2: MongoRunnerSetup;
  let testServer3: MongoRunnerSetup;
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
      ...baseOidcServerConfig,
    };
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
    testServer3 = new MongoRunnerSetup('e2e-oidc-test-idtoken', {
      args: [
        '--setParameter',
        `oidcIdentityProviders=${JSON.stringify([
          {
            ...serverOidcConfig,
            // When using ID tokens as access tokens, clientId and audience need to match
            // (otherwise they usually should not)
            clientId: 'testServer3',
            audience: 'testServer3',
          },
        ])}`,
        ...commonOidcServerArgs,
      ],
    });
    await Promise.all([
      testServer.start(),
      testServer2.start(),
      testServer3.start(),
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

  after(async function () {
    this.timeout(120_000);
    await Promise.all([
      testServer?.stop(),
      testServer2?.stop(),
      testServer3?.stop(),
      oidcMockProvider?.close(),
      oidcMockProviderHttps?.close(),
    ]);
  });

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

  function* nonceTestParameters(): Generator<{
    expectNonce: boolean;
    provideNonce: boolean;
  }> {
    for (const expectNonce of [false, true]) {
      for (const provideNonce of [false, true]) {
        yield { expectNonce, provideNonce };
      }
    }
  }

  for (const { expectNonce, provideNonce } of nonceTestParameters()) {
    describe(`with expectNonce=${expectNonce} provideNonce=${provideNonce}`, function () {
      it('can successfully authenticate using OIDC Auth Code Flow', async function () {
        const originalGetPayload = getTokenPayload;
        getTokenPayload = async (metadata) => {
          const result = await originalGetPayload(metadata);
          if (provideNonce === false) {
            result.payload.nonce = undefined;
          }
          return result;
        };

        const args = [
          await testServer.connectionString(),
          '--authenticationMechanism=MONGODB-OIDC',
          '--oidcRedirectUri=http://localhost:0/',
          `--browser=${fetchBrowserFixture}`,
        ];

        if (!expectNonce) {
          args.push('--oidcNoNonce');
        }

        shell = startTestShell(this, {
          args,
        });
        if (!expectNonce || provideNonce) {
          await shell.waitForPrompt();

          await verifyUser(shell, 'testuser', 'testServer-group');
          shell.assertNoErrors();
        } else {
          expect(await shell.waitForAnyExit()).to.equal(1);
          shell.assertContainsOutput(
            'Error: invalid response encountered (caused by: JWT "nonce" (nonce) claim missing)'
          );
        }
      });
    });
  }

  it('can successfully authenticate using OIDC Auth Code Flow when a username is specified', async function () {
    shell = startTestShell(this, {
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
    shell = startTestShell(this, {
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
    shell = startTestShell(this, {
      args: [
        await testServer.connectionString(),
        '--authenticationMechanism=MONGODB-OIDC',
        '--oidcRedirectUri=http://localhost:0/',
        '--browser=false',
      ],
    });
    await shell.waitForAnyExit();
    shell.assertContainsOutput(
      'Consider specifying --oidcFlows=auth-code,device-auth if you are running mongosh in an environment without browser access'
    );
  });

  it('can successfully re-authenticate when tokens expire', async function () {
    const originalGetPayload = getTokenPayload;
    getTokenPayload = async (metadata) => {
      return {
        expires_in: 2, // seconds
        payload: (await originalGetPayload(metadata)).payload,
      };
    };
    shell = startTestShell(this, {
      args: [
        await testServer.connectionString({
          maxIdleTimeMS: '1',
          minPoolSize: '0',
        }),
        '--authenticationMechanism=MONGODB-OIDC',
        '--oidcRedirectUri=http://localhost:0/',
        `--browser=${fetchBrowserFixture}`,
      ],
    });
    await shell.waitForPrompt();

    await shell.executeLine('db.adminCommand({ping: 1})');
    await shell.executeLine('sleep(4000)');
    await shell.executeLine('db.adminCommand({ping: 1})');
    shell.assertNoErrors();
    expect(tokenFetches).to.be.greaterThan(1);
  });

  it('keeps authentication state when resetting connection options', async function () {
    const cs = await testServer.connectionString();
    shell = startTestShell(this, {
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
    shell = startTestShell(this, {
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
    shell = startTestShell(this, {
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
      'db.getMongo()._serviceProvider[Symbol.for("@@mongosh.originalServiceProvider")].currentClientOptions.parentState.getStateShareServer()'
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

    const shell2 = startTestShell(this, {
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

  it('can specify --tlsUseSystemCA as a no-op', async function () {
    await fs.mkdir(path.join(tmpdir.path, 'certs'), { recursive: true });
    await fs.copyFile(
      getCertPath('ca.crt'),
      path.join(tmpdir.path, 'certs', 'somefilename.crt')
    );

    shell = startTestShell(this, {
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
    await shell.waitForAnyExit();
    // We cannot make the mongod server accept the mock IdP's certificate,
    // so the best we can verify here is that auth failed *on the server*
    shell.assertContainsOutput(/MongoServerError: Authentication failed/);
  });

  it('uses system ca by default when calling the IdP https endpoint', async function () {
    await fs.mkdir(path.join(tmpdir.path, 'certs'), { recursive: true });
    await fs.copyFile(
      getCertPath('ca.crt'),
      path.join(tmpdir.path, 'certs', 'somefilename.crt')
    );

    shell = startTestShell(this, {
      args: [
        await testServer2.connectionString(
          {},
          { username: 'httpsIdPtestuser' }
        ),
        '--authenticationMechanism=MONGODB-OIDC',
        '--oidcRedirectUri=http://localhost:0/',
        `--browser=${fetchBrowserFixture}`,
      ],
      env: {
        ...process.env,
        SSL_CERT_DIR: path.join(tmpdir.path, 'certs') + '',
        MONGOSH_E2E_TEST_CURL_ALLOW_INVALID_TLS: '1',
      },
    });

    await shell.waitForAnyExit();
    // We cannot make the mongod server accept the mock IdP's certificate,
    // so the best we can verify here is that auth failed *on the server*
    shell.assertContainsOutput(/MongoServerError: Authentication failed/);
  });

  it('can successfully authenticate using the ID token rather than access token if requested', async function () {
    const originalGetTokenPayload = getTokenPayload;
    getTokenPayload = (metadata) => {
      return {
        ...originalGetTokenPayload(metadata),
        payload: {
          sub: 'testuser-at',
          groups: ['testuser-at-group'],
          aud: 'testServer3',
        },
        customIdTokenPayload: {
          sub: 'testuser-id',
          groups: ['testuser-id-group'],
          aud: 'testServer3',
        },
      };
    };

    // Consistency check: ID token is *not* used by default
    shell = startTestShell(this, {
      args: [
        await testServer3.connectionString(),
        '--authenticationMechanism=MONGODB-OIDC',
        '--oidcRedirectUri=http://localhost:0/',
        `--browser=${fetchBrowserFixture}`,
      ],
    });
    await shell.waitForPrompt();

    await verifyUser(shell, 'testuser-at', 'testuser-at-group');

    // Actual test: ID token data is used when --oidcIdTokenAsAccessToken is set
    shell = startTestShell(this, {
      args: [
        await testServer3.connectionString(),
        '--authenticationMechanism=MONGODB-OIDC',
        '--oidcIdTokenAsAccessToken',
        '--oidcRedirectUri=http://localhost:0/',
        `--browser=${fetchBrowserFixture}`,
      ],
    });
    await shell.waitForPrompt();

    await verifyUser(shell, 'testuser-id', 'testuser-id-group');
    shell.assertNoErrors();
  });

  it('can print tokens as debug information if requested', async function () {
    shell = startTestShell(this, {
      args: [
        await testServer.connectionString(),
        '--authenticationMechanism=MONGODB-OIDC',
        '--oidcRedirectUri=http://localhost:0/',
        '--oidcDumpTokens',
        `--browser=${fetchBrowserFixture}`,
        '--eval=42',
      ],
    });
    await shell.waitForSuccessfulExit();

    shell.assertContainsOutput('BEGIN OIDC TOKEN DUMP');
    shell.assertContainsOutput('"tokenType": "bearer"');
    shell.assertContainsOutput('"alg": "RS256"');
    shell.assertContainsOutput('"sub": "testuser"');
    shell.assertNotContainsOutput('"signature":');
    shell.assertContainsOutput('"lastServerIdPInfo":');
    shell.assertNotContainsOutput(/"refreshToken": "(?!debugid:)/);

    shell = startTestShell(this, {
      args: [
        await testServer.connectionString(),
        '--authenticationMechanism=MONGODB-OIDC',
        '--oidcRedirectUri=http://localhost:0/',
        '--oidcDumpTokens=include-secrets',
        `--browser=${fetchBrowserFixture}`,
        '--eval=42',
      ],
    });
    await shell.waitForSuccessfulExit();

    shell.assertContainsOutput('BEGIN OIDC TOKEN DUMP');
    shell.assertContainsOutput('"tokenType": "bearer"');
    shell.assertContainsOutput('"alg": "RS256"');
    shell.assertContainsOutput('"sub": "testuser"');
    shell.assertContainsOutput('"signature":');
    shell.assertContainsOutput('"lastServerIdPInfo":');
    shell.assertContainsOutput(/"refreshToken": "(?!debugid:)/);
  });

  it('logs OIDC HTTP calls', async function () {
    shell = startTestShell(this, {
      args: [
        await testServer.connectionString(),
        '--authenticationMechanism=MONGODB-OIDC',
        '--oidcRedirectUri=http://localhost:0/',
        `--browser=${fetchBrowserFixture}`,
        '--eval=log.getPath()',
        '--quiet',
        '--json',
      ],
      env: {
        ...process.env,
        HOME: tmpdir.path,
        LOCALAPPDATA: tmpdir.path,
        APPDATA: tmpdir.path,
      },
    });
    await shell.waitForSuccessfulExit();
    const logs = await readReplLogFile(JSON.parse(shell.output));
    const inbound = logs.find((e) => e.id === 1_002_000_024);
    const outbound = logs.find((e) => e.id === 1_002_000_023);
    expect(inbound?.attr.url).to.be.a('string');
    expect(inbound?.s).to.equal('D1');
    expect(outbound?.attr.url).to.be.a('string');
    expect(outbound?.s).to.equal('D1');
  });

  it('can successfully authenticate using workload OIDC', async function () {
    // Get a token from the OIDC server, store it to disk, then pass that to mongosh
    const tokenFile = path.join(tmpdir.path, 'token');
    let accessToken!: string;
    const plugin = createMongoDBOIDCPlugin({
      notifyDeviceFlow: () => {},
      allowedFlows: ['device-auth'],
    });
    try {
      ({ accessToken } =
        await plugin.mongoClientOptions.authMechanismProperties.OIDC_HUMAN_CALLBACK(
          {
            version: 1,
            idpInfo: { issuer: oidcMockProvider.issuer, clientId: 'workload' },
          }
        ));
    } finally {
      await plugin.destroy();
    }
    await fs.writeFile(tokenFile, accessToken);

    shell = startTestShell(this, {
      args: [
        await testServer.connectionString({
          authMechanism: 'MONGODB-OIDC',
          authMechanismProperties: 'ENVIRONMENT:k8s',
        }),
      ],
      env: {
        ...process.env,
        AWS_WEB_IDENTITY_TOKEN_FILE: tokenFile,
      },
    });
    await shell.waitForPrompt();

    await verifyUser(shell, 'testuser', 'workload-group');
    shell.assertNoErrors();
  });
});
