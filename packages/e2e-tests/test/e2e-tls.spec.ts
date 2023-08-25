import { assert, expect } from 'chai';
import { promises as fs } from 'fs';
import path from 'path';
import {
  skipIfEnvServerVersion,
  startTestServer,
  MongodSetup,
} from '../../../testing/integration-testing-hooks';
import {
  useTmpdir,
  setTemporaryHomeDirectory,
  readReplLogfile,
} from './repl-helpers';
import { TestShell } from './test-shell';
import { promisify } from 'util';
import rimraf from 'rimraf';

// TLS requires matching hostnames, so here we need to explicitly
// specify `localhost` + IPv4 instead of `127.0.0.1`
async function connectionStringWithLocalhost(
  setup: MongodSetup,
  searchParams: Record<string, string> = {}
): Promise<string> {
  const cs = await setup.connectionStringUrl();
  cs.hosts = cs.hosts.map((host) =>
    host.replace(/^(127.0.0.1)(?=$|:)/, 'localhost')
  );
  cs.searchParams.set('family', '4');
  for (const [key, value] of Object.entries(searchParams))
    cs.searchParams.set(key, value);
  return cs.toString();
}

function getCertPath(filename: string): string {
  return path.join(
    __dirname,
    '..',
    '..',
    '..',
    'testing',
    'certificates',
    filename
  );
}
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

describe('e2e TLS', function () {
  before(async function () {
    assert((await fs.stat(CA_CERT)).isFile());
    assert((await fs.stat(NON_CA_CERT)).isFile());
    assert((await fs.stat(CLIENT_CERT)).isFile());
    assert((await fs.stat(CLIENT_CERT_PFX)).isFile());
    assert((await fs.stat(INVALID_CLIENT_CERT)).isFile());
    assert((await fs.stat(SERVER_KEY)).isFile());
    assert((await fs.stat(CRL_INCLUDING_SERVER)).isFile());
  });

  afterEach(TestShell.cleanup);

  context('for server < 4.2', function () {
    skipIfEnvServerVersion('>= 4.2');
    registerTlsTests({
      tlsMode: '--sslMode',
      tlsModeValue: 'requireSSL',
      tlsCertificateFile: '--sslPEMKeyFile',
      tlsCaFile: '--sslCAFile',
    });
  });
  context('for server >= 4.2', function () {
    skipIfEnvServerVersion('< 4.2');
    registerTlsTests({
      tlsMode: '--tlsMode',
      tlsModeValue: 'requireTLS',
      tlsCertificateFile: '--tlsCertificateKeyFile',
      tlsCaFile: '--tlsCAFile',
    });
  });

  function registerTlsTests({
    tlsMode: serverTlsModeOption,
    tlsModeValue: serverTlsModeValue,
    tlsCertificateFile: serverTlsCertificateKeyFileOption,
    tlsCaFile: serverTlsCAFileOption,
  }) {
    let homedir: string;
    let env: Record<string, string>;
    let logBasePath: string;
    const tmpdir = useTmpdir();

    before(function () {
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
        await promisify(rimraf)(homedir);
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
          const shell = TestShell.start({
            args: [
              await connectionStringWithLocalhost(server),
              '--tls',
              '--tlsCAFile',
              CA_CERT,
            ],
          });
          await shell.waitForPrompt();
          await shell.executeLine('db.shutdownServer({ force: true })');
          shell.kill();
          await shell.waitForExit();
        });
        afterEach(TestShell.cleanup);

        const server = startTestServer('not-shared', {
          args: [
            serverTlsModeOption,
            serverTlsModeValue,
            serverTlsCertificateKeyFileOption,
            SERVER_KEY,
          ],
        });

        it('works with matching CA (args)', async function () {
          const shell = TestShell.start({
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
          const shell = TestShell.start({
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
          const shell = TestShell.start({
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
          const shell = TestShell.start({
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
          const shell = TestShell.start({
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
          shell.assertContainsOutput('unable to verify the first certificate');
        });

        it('fails with invalid CA (connection string)', async function () {
          const shell = TestShell.start({
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
          shell.assertContainsOutput('unable to verify the first certificate');
        });

        it('fails when providing a CRL including the servers cert', async function () {
          const shell = TestShell.start({
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
          const shell = TestShell.start({
            args: [
              await connectionStringWithLocalhost(server, {
                serverSelectionTimeoutMS: '1500',
              }),
              '--tls',
              '--tlsUseSystemCA',
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
          const logContents = await readReplLogfile(logPath);
          expect(
            logContents.find((line) => line.id === 1_000_000_049).attr
              .asyncFallbackError
          ).to.equal(null); // Ensure that system CA loading happened asynchronously.
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
          const shell = TestShell.start({
            args: [
              await connectionStringWithLocalhost(server, {
                serverSelectionTimeoutMS: '1500',
              }),
              '--tls',
              '--tlsUseSystemCA',
            ],
            env: {
              ...env,
              SSL_CERT_FILE: path.join(
                tmpdir.path,
                'certs',
                'somefilename.crt'
              ),
            },
          });

          const prompt = await shell.waitForPromptOrExit();
          expect(prompt.state).to.equal('prompt');

          const logPath = path.join(logBasePath, `${shell.logId}_log`);
          const logContents = await readReplLogfile(logPath);
          expect(
            logContents.find((line) => line.id === 1_000_000_049).attr
              .asyncFallbackError
          ).to.equal(null); // Ensure that system CA loading happened asynchronously.
        });

        it('fails on macOS/Windows with system CA', async function () {
          // No good way to programmatically add certs to the system CA from our tests.
          if (process.platform !== 'darwin' && process.platform !== 'win32') {
            return this.skip();
          }
          const shell = TestShell.start({
            args: [
              await connectionStringWithLocalhost(server, {
                serverSelectionTimeoutMS: '1500',
              }),
              '--tls',
              '--tlsUseSystemCA',
            ],
            env,
          });

          const prompt = await shell.waitForPromptOrExit();
          expect(prompt.state).to.equal('exit');

          const logPath = path.join(logBasePath, `${shell.logId}_log`);
          const logContents = await readReplLogfile(logPath);
          expect(logContents.find((line) => line.id === 1_000_000_049)).to
            .exist;
        });
      }
    );

    context(
      'connecting with client cert to server with valid cert',
      function () {
        after(async function () {
          const shell = TestShell.start({
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
          shell.kill();
          await shell.waitForExit();

          await TestShell.cleanup.call(this);
        });

        const server = startTestServer('not-shared', {
          args: [
            serverTlsModeOption,
            serverTlsModeValue,
            serverTlsCertificateKeyFileOption,
            SERVER_KEY,
            serverTlsCAFileOption,
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
          const shell = TestShell.start({
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
          const shell = TestShell.start({
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
          const shell = TestShell.start({
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
          const shell = TestShell.start({
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
          const shell = TestShell.start({
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

        it('fails with invalid cert (args)', async function () {
          const shell = TestShell.start({
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
          const shell = TestShell.start({
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
          const shell = TestShell.start({
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
          const shell = TestShell.start({
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
            shell.assertContainsOutput('Could not find a matching certificate');
          } else {
            shell.assertContainsOutput(
              'tlsCertificateSelector is not supported on this platform'
            );
          }
        });
      }
    );

    context('connecting to server with invalid cert', function () {
      after(async function () {
        // mlaunch has some trouble interpreting all the server options correctly,
        // and subsequently can't connect to the server to find out if it's up,
        // then thinks it isn't and doesn't shut it down cleanly. We shut it down
        // here to work around that.
        const shell = TestShell.start({
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
        await TestShell.killall();
      });

      const server = startTestServer('not-shared', {
        args: [
          serverTlsModeOption,
          serverTlsModeValue,
          serverTlsCertificateKeyFileOption,
          SERVER_INVALIDHOST_KEY,
        ],
      });

      it('works with allowInvalidCertificates', async function () {
        const shell = TestShell.start({
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
        const shell = TestShell.start({
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
        const shell = TestShell.start({
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
  }
});
