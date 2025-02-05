import { expect } from 'chai';
import { promises as fs } from 'fs';
import path from 'path';
import { startTestServer } from '../../../testing/integration-testing-hooks';
import {
  useTmpdir,
  setTemporaryHomeDirectory,
  readReplLogFile,
  getCertPath,
  connectionStringWithLocalhost,
} from './repl-helpers';

const CA_CERT = getCertPath('ca.crt');
const NON_CA_CERT = getCertPath('non-ca.crt');
const CLIENT_CERT = getCertPath('client.bundle.pem');
const CLIENT_CERT_PFX = getCertPath('client.bundle.pfx');
const CLIENT_CERT_ENCRYPTED = getCertPath('client.bundle.encrypted.pem');
const CLIENT_CERT_PASSWORD = 'p4ssw0rd';
const INVALID_CLIENT_CERT = getCertPath('invalid-client.bundle.pem');
const SERVER_KEY = getCertPath('server.bundle.pem');
const SERVER_INVALIDHOST_KEY = getCertPath('server-invalidhost.bundle.pem');
const CRL_INCLUDING_SERVER = getCertPath('ca-server.crl');
const PARTIAL_TRUST_CHAIN_CA = getCertPath('partial-trust-chain/ca.pem');
const PARTIAL_TRUST_CHAIN_KEY_AND_CERT = getCertPath(
  'partial-trust-chain/key-and-cert.pem'
);

/**
 * @securityTest TLS End-to-End Tests
 *
 * Our TLS tests verify that core security properties of TLS connections
 * are applied appropriately for mongosh, in particular certificate validation
 * and compliance with user-specified behavior that is specific to TLS connectivity.
 */
describe('e2e TLS', function () {
  let homedir: string;
  let env: Record<string, string>;
  let logBasePath: string;
  const tmpdir = useTmpdir();

  before(async function () {
    for (const file of [
      CA_CERT,
      NON_CA_CERT,
      CLIENT_CERT,
      CLIENT_CERT_PFX,
      INVALID_CLIENT_CERT,
      SERVER_KEY,
      CRL_INCLUDING_SERVER,
      PARTIAL_TRUST_CHAIN_CA,
      PARTIAL_TRUST_CHAIN_KEY_AND_CERT,
    ]) {
      expect((await fs.stat(file)).isFile()).to.be.true;
    }

    const homeInfo = setTemporaryHomeDirectory();
    homedir = homeInfo.homedir;
    env = homeInfo.env;

    if (process.platform === 'win32') {
      logBasePath = path.resolve(homedir, 'local', 'mongodb', 'mongosh');
    } else {
      logBasePath = path.resolve(homedir, '.mongodb', 'mongosh');
    }
  });

  after(async function () {
    try {
      await fs.rm(homedir, { recursive: true, force: true });
    } catch (err: any) {
      // On Windows in CI, this can fail with EPERM for some reason.
      // If it does, just log the error instead of failing all tests.
      console.error('Could not remove fake home directory:', err);
    }
  });

  context(
    'connecting without client cert to server with valid cert',
    function () {
      after(async function () {
        // mlaunch has some trouble interpreting all the server options correctly,
        // and subsequently can't connect to the server to find out if it's up,
        // then thinks it isn't and doesn't shut it down cleanly. We shut it down
        // here to work around that.
        const shell = this.startTestShell({
          args: [
            await connectionStringWithLocalhost(server),
            '--tls',
            '--tlsCAFile',
            CA_CERT,
          ],
        });
        await shell.waitForPrompt();
        await shell.executeLine('db.shutdownServer({ force: true })');
        shell.writeInputLine('exit');
        await shell.waitForAnyExit(); // closing the server may lead to an error being displayed
      });

      const server = startTestServer('e2e-tls-no-cli-valid-srv', {
        args: [
          '--tlsMode',
          'requireTLS',
          '--tlsCertificateKeyFile',
          SERVER_KEY,
          '--tlsAllowConnectionsWithoutCertificates',
          '--tlsCAFile',
          CA_CERT,
        ],
      });

      it('works with matching CA (args)', async function () {
        const shell = this.startTestShell({
          args: [
            await connectionStringWithLocalhost(server),
            '--tls',
            '--tlsCAFile',
            CA_CERT,
          ],
        });
        const result = await shell.waitForPromptOrExit();
        expect(result.state).to.equal('prompt');
      });

      it('works with matching CA (connection string)', async function () {
        const shell = this.startTestShell({
          args: [
            await connectionStringWithLocalhost(server, {
              tls: 'true',
              tlsCAFile: CA_CERT,
            }),
          ],
        });
        const result = await shell.waitForPromptOrExit();
        expect(result.state).to.equal('prompt');
      });

      it('fails when not using --tls (args)', async function () {
        const shell = this.startTestShell({
          args: [
            await connectionStringWithLocalhost(server, {
              serverSelectionTimeoutMS: '1500',
            }),
          ],
        });
        const result = await shell.waitForPromptOrExit();
        expect(result.state).to.equal('exit');
        shell.assertContainsOutput('MongoServerSelectionError');
      });

      it('fails when not using --tls (connection string)', async function () {
        const shell = this.startTestShell({
          args: [
            await connectionStringWithLocalhost(server, {
              serverSelectionTimeoutMS: '1500',
              tls: 'false',
            }),
          ],
        });
        const result = await shell.waitForPromptOrExit();
        expect(result.state).to.equal('exit');
        shell.assertContainsOutput('MongoServerSelectionError');
      });

      it('fails with invalid CA (args)', async function () {
        const shell = this.startTestShell({
          args: [
            await connectionStringWithLocalhost(server, {
              serverSelectionTimeoutMS: '1500',
            }),
            '--tls',
            '--tlsCAFile',
            NON_CA_CERT,
          ],
        });
        const result = await shell.waitForPromptOrExit();
        expect(result.state).to.equal('exit');
        shell.assertContainsOutput(
          /unable to verify the first certificate|self[- ]signed certificate in certificate chain|unable to get (local )?issuer certificate/
        );
      });

      it('fails with invalid CA (connection string)', async function () {
        const shell = this.startTestShell({
          args: [
            await connectionStringWithLocalhost(server, {
              serverSelectionTimeoutMS: '1500',
              tls: 'true',
              tlsCAFile: NON_CA_CERT,
            }),
          ],
        });
        const result = await shell.waitForPromptOrExit();
        expect(result.state).to.equal('exit');
        shell.assertContainsOutput(
          /unable to verify the first certificate|self[- ]signed certificate in certificate chain|unable to get (local )?issuer certificate/
        );
      });

      it('fails when providing a CRL including the servers cert', async function () {
        const shell = this.startTestShell({
          args: [
            await connectionStringWithLocalhost(server, {
              serverSelectionTimeoutMS: '1500',
            }),
            '--tls',
            '--tlsCAFile',
            CA_CERT,
            '--tlsCRLFile',
            CRL_INCLUDING_SERVER,
          ],
        });
        const result = await shell.waitForPromptOrExit();
        expect(result.state).to.equal('exit');
        shell.assertContainsOutput('certificate revoked');
      });

      it('works with system CA on Linux with SSL_CERT_DIR', async function () {
        if (process.platform !== 'linux') {
          return this.skip();
        }
        await fs.mkdir(path.join(tmpdir.path, 'certs'), { recursive: true });
        await fs.copyFile(
          CA_CERT,
          path.join(tmpdir.path, 'certs', 'somefilename.crt')
        );
        const shell = this.startTestShell({
          args: [
            await connectionStringWithLocalhost(server, {
              serverSelectionTimeoutMS: '1500',
            }),
            '--tls',
          ],
          env: {
            ...env,
            SSL_CERT_DIR:
              path.join(tmpdir.path, 'certs') + ':/nonexistent/other/path',
          },
        });

        const prompt = await shell.waitForPromptOrExit();
        expect(prompt.state).to.equal('prompt');

        const logPath = path.join(logBasePath, `${shell.logId}_log`);
        const logContents = await readReplLogFile(logPath);
        expect(
          logContents.find((line) => line.id.__value === 1_000_000_049)?.attr
            .asyncFallbackError
        ).to.equal(null); // Ensure that system CA loading happened asynchronously.
        expect(
          logContents.find((line) => line.id.__value === 1_000_000_049)?.attr
            .systemCertsError
        ).to.equal(null); // Ensure that system CA could be loaded successfully.
      });

      it('works with system CA on Linux with SSL_CERT_FILE', async function () {
        if (process.platform !== 'linux') {
          return this.skip();
        }
        await fs.mkdir(path.join(tmpdir.path, 'certs'), { recursive: true });
        await fs.copyFile(
          CA_CERT,
          path.join(tmpdir.path, 'certs', 'somefilename.crt')
        );
        const shell = this.startTestShell({
          args: [
            await connectionStringWithLocalhost(server, {
              serverSelectionTimeoutMS: '1500',
            }),
            '--tls',
          ],
          env: {
            ...env,
            SSL_CERT_FILE: path.join(tmpdir.path, 'certs', 'somefilename.crt'),
          },
        });

        const prompt = await shell.waitForPromptOrExit();
        expect(prompt.state).to.equal('prompt');

        const logPath = path.join(logBasePath, `${shell.logId}_log`);
        const logContents = await readReplLogFile(logPath);
        expect(
          logContents.find((line) => line.id.__value === 1_000_000_049)?.attr
            .asyncFallbackError
        ).to.equal(null); // Ensure that system CA loading happened asynchronously.
        expect(
          logContents.find((line) => line.id.__value === 1_000_000_049)?.attr
            .systemCertsError
        ).to.equal(null); // Ensure that system CA could be loaded successfully.
      });

      it('fails on macOS/Windows with system CA', async function () {
        // No good way to programmatically add certs to the system CA from our tests.
        if (process.platform !== 'darwin' && process.platform !== 'win32') {
          return this.skip();
        }
        const shell = this.startTestShell({
          args: [
            await connectionStringWithLocalhost(server, {
              serverSelectionTimeoutMS: '1500',
            }),
            '--tls',
          ],
          env,
        });

        const prompt = await shell.waitForPromptOrExit();
        expect(prompt.state).to.equal('exit');

        const logPath = path.join(logBasePath, `${shell.logId}_log`);
        const logContents = await readReplLogFile(logPath);
        expect(logContents.find((line) => line.id.__value === 1_000_000_049)).to
          .exist;
      });
    }
  );

  // Certificate fixtures and general concept mirrors
  // https://github.com/nodejs/node/blob/1b3420274ea8d8cca339a1f10301d2e80f577c4c/test/parallel/test-tls-client-allow-partial-trust-chain.js
  // This basically tests that we pass allowPartialTrustChain: true in the TLS options
  context(
    'connecting without client cert to server with only partial trust chain',
    function () {
      before(function () {
        // TODO(MONGOSH-1898): Drop Node.js 16 entirely
        if (process.version.startsWith('v16.')) return this.skip();
        // The Windows crypto libraries don't accept the particular certificate setup here
        // ('CertAddCertificateContextToStore Failed  The object or property already exists'),
        // so will not let us start a mongod server
        if (process.platform === 'win32') return this.skip();
      });

      const server = startTestServer('e2e-tls-partial-trust-chain', {
        args: [
          '--tlsMode',
          'requireTLS',
          '--tlsCertificateKeyFile',
          PARTIAL_TRUST_CHAIN_KEY_AND_CERT,
          '--tlsAllowConnectionsWithoutCertificates',
          '--tlsCAFile',
          PARTIAL_TRUST_CHAIN_CA,
        ],
      });

      it('works with matching CA (connection string)', async function () {
        const shell = this.startTestShell({
          args: [
            await connectionStringWithLocalhost(server, {
              tls: 'true',
              tlsCAFile: PARTIAL_TRUST_CHAIN_KEY_AND_CERT,
              tlsAllowInvalidHostnames: 'true',
            }),
          ],
        });
        const result = await shell.waitForPromptOrExit();
        expect(result.state).to.equal('prompt');
      });

      it('works with matching CA (system certs)', async function () {
        if (process.platform !== 'linux') {
          return this.skip();
        }
        await fs.mkdir(path.join(tmpdir.path, 'certs'), { recursive: true });
        await fs.copyFile(
          PARTIAL_TRUST_CHAIN_CA,
          path.join(tmpdir.path, 'certs', 'somefilename.crt')
        );

        const shell = this.startTestShell({
          args: [
            await connectionStringWithLocalhost(server, {
              serverSelectionTimeoutMS: '1500',
              tlsAllowInvalidHostnames: 'true',
            }),
            '--tls',
          ],
          env: {
            ...env,
            SSL_CERT_FILE: path.join(tmpdir.path, 'certs', 'somefilename.crt'),
          },
        });

        const prompt = await shell.waitForPromptOrExit();
        expect(prompt.state).to.equal('prompt');
      });
    }
  );

  context('connecting with client cert to server with valid cert', function () {
    after(async function () {
      const shell = this.startTestShell({
        args: [
          await connectionStringWithLocalhost(server),
          '--tls',
          '--tlsCAFile',
          CA_CERT,
          '--tlsCertificateKeyFile',
          CLIENT_CERT,
        ],
      });
      await shell.waitForPrompt();
      await shell.executeLine('db.shutdownServer({ force: true })');
      shell.writeInputLine('exit');
      await shell.waitForAnyExit(); // closing the server may lead to an error being displayed
    });

    const server = startTestServer('e2e-tls-valid-cli-valid-srv', {
      args: [
        '--tlsMode',
        'requireTLS',
        '--tlsCertificateKeyFile',
        SERVER_KEY,
        '--tlsCAFile',
        CA_CERT,
      ],
    });
    const certUser =
      'emailAddress=tester@example.com,CN=Wonderwoman,OU=DevTools Testers,O=MongoDB';

    before(async function () {
      if (process.env.MONGOSH_TEST_FORCE_API_STRICT) {
        return this.skip(); // createUser is unversioned
      }
      /* connect with cert to create user */
      const shell = this.startTestShell({
        args: [
          await connectionStringWithLocalhost(server, {
            serverSelectionTimeoutMS: '1500',
          }),
          '--tls',
          '--tlsCAFile',
          CA_CERT,
          '--tlsCertificateKeyFile',
          CLIENT_CERT,
        ],
      });
      const prompt = await shell.waitForPromptOrExit();
      expect(prompt.state).to.equal('prompt');
      await shell.executeLine(`db=db.getSiblingDB('$external');db.runCommand({
        createUser: '${certUser}',
        roles: [
          {role: 'userAdminAnyDatabase', db: 'admin'}
        ]
      })`);
      shell.assertContainsOutput('{ ok: 1 }');
    });

    it('works with valid cert (args)', async function () {
      const shell = this.startTestShell({
        args: [
          await connectionStringWithLocalhost(server, {
            serverSelectionTimeoutMS: '1500',
          }),
          '--authenticationMechanism',
          'MONGODB-X509',
          '--tls',
          '--tlsCAFile',
          CA_CERT,
          '--tlsCertificateKeyFile',
          CLIENT_CERT,
        ],
      });
      const prompt = await shell.waitForPromptOrExit();
      expect(prompt.state).to.equal('prompt');
      expect(
        await shell.executeLine('db.runCommand({ connectionStatus: 1 })')
      ).to.include(`user: '${certUser}'`);

      expect(
        await shell.executeLine(
          'db.getSiblingDB("$external").auth({mechanism: "MONGODB-X509"})'
        )
      ).to.include('ok: 1');
      expect(
        await shell.executeLine('db.runCommand({ connectionStatus: 1 })')
      ).to.include(`user: '${certUser}'`);
    });

    it('works with valid cert (args, encrypted)', async function () {
      const shell = this.startTestShell({
        args: [
          await connectionStringWithLocalhost(server, {
            serverSelectionTimeoutMS: '1500',
          }),
          '--authenticationMechanism',
          'MONGODB-X509',
          '--tls',
          '--tlsCAFile',
          CA_CERT,
          '--tlsCertificateKeyFile',
          CLIENT_CERT_ENCRYPTED,
          '--tlsCertificateKeyFilePassword',
          CLIENT_CERT_PASSWORD,
        ],
        env,
      });
      const prompt = await shell.waitForPromptOrExit();
      expect(prompt.state).to.equal('prompt');
      expect(
        await shell.executeLine('db.runCommand({ connectionStatus: 1 })')
      ).to.include(`user: '${certUser}'`);

      expect(
        await shell.executeLine(
          'db.getSiblingDB("$external").auth({mechanism: "MONGODB-X509"})'
        )
      ).to.include('ok: 1');
      expect(
        await shell.executeLine('db.runCommand({ connectionStatus: 1 })')
      ).to.include(`user: '${certUser}'`);

      const logPath = path.join(logBasePath, `${shell.logId}_log`);
      const logFileContents = await fs.readFile(logPath, 'utf8');
      expect(logFileContents).not.to.include(CLIENT_CERT_PASSWORD);
    });

    it('works with valid cert (connection string)', async function () {
      const shell = this.startTestShell({
        args: [
          await connectionStringWithLocalhost(server, {
            serverSelectionTimeoutMS: '1500',
            authMechanism: 'MONGODB-X509',
            tls: 'true',
            tlsCAFile: CA_CERT,
            tlsCertificateKeyFile: CLIENT_CERT,
          }),
        ],
      });
      const prompt = await shell.waitForPromptOrExit();
      expect(prompt.state).to.equal('prompt');
      expect(
        await shell.executeLine('db.runCommand({ connectionStatus: 1 })')
      ).to.include(`user: '${certUser}'`);

      expect(
        await shell.executeLine(
          'db.getSiblingDB("$external").auth({mechanism: "MONGODB-X509"})'
        )
      ).to.include('ok: 1');
      expect(
        await shell.executeLine('db.runCommand({ connectionStatus: 1 })')
      ).to.include(`user: '${certUser}'`);
    });

    it('works with valid cert (connection string, encrypted)', async function () {
      const shell = this.startTestShell({
        args: [
          await connectionStringWithLocalhost(server, {
            serverSelectionTimeoutMS: '1500',
            authMechanism: 'MONGODB-X509',
            tls: 'true',
            tlsCAFile: CA_CERT,
            tlsCertificateKeyFile: CLIENT_CERT_ENCRYPTED,
            tlsCertificateKeyFilePassword: CLIENT_CERT_PASSWORD,
          }),
        ],
        env,
      });
      const prompt = await shell.waitForPromptOrExit();
      expect(prompt.state).to.equal('prompt');
      expect(
        await shell.executeLine('db.runCommand({ connectionStatus: 1 })')
      ).to.include(`user: '${certUser}'`);

      expect(
        await shell.executeLine(
          'db.getSiblingDB("$external").auth({mechanism: "MONGODB-X509"})'
        )
      ).to.include('ok: 1');
      expect(
        await shell.executeLine('db.runCommand({ connectionStatus: 1 })')
      ).to.include(`user: '${certUser}'`);

      const logPath = path.join(logBasePath, `${shell.logId}_log`);
      const logFileContents = await fs.readFile(logPath, 'utf8');
      expect(logFileContents).not.to.include(CLIENT_CERT_PASSWORD);
    });

    it('asks for tlsCertificateKeyFilePassword when it is needed (connection string, encrypted)', async function () {
      const shell = this.startTestShell({
        args: [
          await connectionStringWithLocalhost(server, {
            serverSelectionTimeoutMS: '1500',
            authMechanism: 'MONGODB-X509',
            tls: 'true',
            tlsCAFile: CA_CERT,
            tlsCertificateKeyFile: CLIENT_CERT_ENCRYPTED,
          }),
        ],
        env,
      });

      await shell.waitForLine(/Enter TLS key file password:/);
      await shell.executeLine(CLIENT_CERT_PASSWORD);

      expect(
        await shell.executeLine('db.runCommand({ connectionStatus: 1 })')
      ).to.include(`user: '${certUser}'`);

      expect(
        await shell.executeLine(
          'db.getSiblingDB("$external").auth({mechanism: "MONGODB-X509"})'
        )
      ).to.include('ok: 1');
      expect(
        await shell.executeLine('db.runCommand({ connectionStatus: 1 })')
      ).to.include(`user: '${certUser}'`);

      const logPath = path.join(logBasePath, `${shell.logId}_log`);
      const logFileContents = await fs.readFile(logPath, 'utf8');
      expect(logFileContents).not.to.include(CLIENT_CERT_PASSWORD);
    });

    it('fails with invalid cert (args)', async function () {
      const shell = this.startTestShell({
        args: [
          await connectionStringWithLocalhost(server, {
            serverSelectionTimeoutMS: '1500',
          }),
          '--authenticationMechanism',
          'MONGODB-X509',
          '--tls',
          '--tlsCAFile',
          CA_CERT,
          '--tlsCertificateKeyFile',
          INVALID_CLIENT_CERT,
        ],
      });
      const exit = await shell.waitForPromptOrExit();
      expect(exit.state).to.equal('exit');
      shell.assertContainsOutput('MongoServerSelectionError');
    });

    it('fails with invalid cert (connection string)', async function () {
      const shell = this.startTestShell({
        args: [
          await connectionStringWithLocalhost(server, {
            serverSelectionTimeoutMS: '1500',
            authMechanism: 'MONGODB-X509',
            tls: 'true',
            tlsCAFile: CA_CERT,
            tlsCertificateKeyFile: INVALID_CLIENT_CERT,
          }),
        ],
      });
      const exit = await shell.waitForPromptOrExit();
      expect(exit.state).to.equal('exit');
      shell.assertContainsOutput('MongoServerSelectionError');
    });

    it('works with valid cert (with tlsCertificateSelector)', async function () {
      if (process.env.MONGOSH_TEST_E2E_FORCE_FIPS) {
        return this.skip(); // No tlsCertificateSelector support in FIPS mode
      }
      const fakeOsCaModule = path.resolve(tmpdir.path, 'fake-ca.js');
      await fs.writeFile(
        fakeOsCaModule,
        `
      const fs = require('fs');
      module.exports = () => ({
        passphrase: 'passw0rd',
        pfx: fs.readFileSync(${JSON.stringify(CLIENT_CERT_PFX)})
      });
      `
      );
      const shell = this.startTestShell({
        args: [
          await connectionStringWithLocalhost(server, {
            serverSelectionTimeoutMS: '1500',
          }),
          '--authenticationMechanism',
          'MONGODB-X509',
          '--tls',
          '--tlsCAFile',
          CA_CERT,
          '--tlsCertificateSelector',
          'subject=tester@example.com',
        ],
        env: {
          ...process.env,
          TEST_OS_EXPORT_CERTIFICATE_AND_KEY_PATH: fakeOsCaModule,
        },
      });
      const prompt = await shell.waitForPromptOrExit();
      expect(prompt.state).to.equal('prompt');
      await shell.executeLine('db.runCommand({ connectionStatus: 1 })');
      shell.assertContainsOutput(`user: '${certUser}'`);
    });

    it('fails with an invalid tlsCertificateSelector', async function () {
      const shell = this.startTestShell({
        args: [
          await connectionStringWithLocalhost(server, {
            serverSelectionTimeoutMS: '1500',
          }),
          '--authenticationMechanism',
          'MONGODB-X509',
          '--tls',
          '--tlsCAFile',
          CA_CERT,
          '--tlsCertificateSelector',
          'subject=tester@example.com',
        ],
      });
      const prompt = await shell.waitForPromptOrExit();
      expect(prompt.state).to.equal('exit');
      if (process.platform === 'win32') {
        shell.assertContainsOutput(
          'Could not resolve certificate specification'
        );
      } else if (process.platform === 'darwin') {
        shell.assertContainsOutput(
          /Could not find a matching certificate|The specified item could not be found in the keychain/
        );
      } else {
        shell.assertContainsOutput(
          'tlsCertificateSelector is not supported on this platform'
        );
      }
    });
  });

  context('connecting to server with invalid cert', function () {
    after(async function () {
      // mlaunch has some trouble interpreting all the server options correctly,
      // and subsequently can't connect to the server to find out if it's up,
      // then thinks it isn't and doesn't shut it down cleanly. We shut it down
      // here to work around that.
      const shell = this.startTestShell({
        args: [
          await connectionStringWithLocalhost(server),
          '--tls',
          '--tlsCAFile',
          CA_CERT,
          '--tlsAllowInvalidCertificates',
        ],
      });
      await shell.waitForPrompt();
      await shell.executeLine('db.shutdownServer({ force: true })');
    });

    const server = startTestServer('e2e-tls-invalid-srv', {
      args: [
        '--tlsMode',
        'requireTLS',
        '--tlsCertificateKeyFile',
        SERVER_INVALIDHOST_KEY,
        '--tlsCAFile',
        CA_CERT,
        '--tlsAllowConnectionsWithoutCertificates',
      ],
    });

    it('works with allowInvalidCertificates', async function () {
      const shell = this.startTestShell({
        args: [
          await connectionStringWithLocalhost(server),
          '--tls',
          '--tlsCAFile',
          CA_CERT,
          '--tlsAllowInvalidCertificates',
        ],
      });
      const result = await shell.waitForPromptOrExit();
      expect(result.state).to.equal('prompt');
    });

    it('works with allowInvalidHostnames', async function () {
      const shell = this.startTestShell({
        args: [
          await connectionStringWithLocalhost(server),
          '--tls',
          '--tlsCAFile',
          CA_CERT,
          '--tlsAllowInvalidHostnames',
        ],
      });
      const result = await shell.waitForPromptOrExit();
      expect(result.state).to.equal('prompt');
    });

    it('fails when no additional args are provided', async function () {
      const shell = this.startTestShell({
        args: [
          await connectionStringWithLocalhost(server),
          '--tls',
          '--tlsCAFile',
          CA_CERT,
        ],
      });
      const result = await shell.waitForPromptOrExit();
      expect(result.state).to.equal('exit');
    });
  });
});
