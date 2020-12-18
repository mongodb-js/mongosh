import { assert, expect } from 'chai';
import { promises as fs } from 'fs';
import path from 'path';
import { skipIfEnvServerVersion, startTestServer } from '../../../testing/integration-testing-hooks';
import { TestShell } from './test-shell';

function getCertPath(filename: string): string {
  return path.join(__dirname, 'fixtures', 'certificates', filename);
}
const CA_CERT = getCertPath('ca.crt');
const NON_CA_CERT = getCertPath('non-ca.crt');
const CLIENT_CERT = getCertPath('client.bundle.pem');
const INVALID_CLIENT_CERT = getCertPath('invalid-client.bundle.pem');
const SERVER_KEY = getCertPath('server.bundle.pem');
const CRL_INCLUDING_SERVER = getCertPath('ca-server.crl');

type ShellResultState = 'prompt' | 'exit';
type ShellResult = { state: ShellResultState; exitCode?: number | undefined };
async function waitForPromptOrExit(shell: TestShell): Promise<ShellResult> {
  return Promise.race([
    shell.waitForPrompt().then(() => ({ state: 'prompt' } as ShellResult)),
    shell.waitForExit().then(c => ({ state: 'exit', exitCode: c }) as ShellResult),
  ]);
}

describe('e2e TLS', () => {
  before(async() => {
    assert((await fs.stat(CA_CERT)).isFile());
    assert((await fs.stat(NON_CA_CERT)).isFile());
    assert((await fs.stat(SERVER_KEY)).isFile());
    assert((await fs.stat(CRL_INCLUDING_SERVER)).isFile());
  });

  afterEach(async() => {
    await TestShell.killall();
  });

  context('for server < 4.2', () => {
    skipIfEnvServerVersion('>= 4.2');
    registerTlsTests({
      tlsMode: '--sslMode',
      tlsModeValue: 'requireSSL',
      tlsCertificateFile: '--sslPEMKeyFile',
      tlsCaFile: '--sslCAFile'
    });
  });
  context('for server >= 4.2', () => {
    skipIfEnvServerVersion('< 4.2');
    registerTlsTests({
      tlsMode: '--tlsMode',
      tlsModeValue: 'requireTLS',
      tlsCertificateFile: '--tlsCertificateKeyFile',
      tlsCaFile: '--tlsCAFile'
    });
  });

  function registerTlsTests({ tlsMode: serverTlsModeOption, tlsModeValue: serverTlsModeValue, tlsCertificateFile: serverTlsCertificateKeyFileOption, tlsCaFile: serverTlsCAFileOption }) {
    context('connecting without client cert', () => {
      const server = startTestServer(
        'not-shared',
        serverTlsModeOption, serverTlsModeValue,
        serverTlsCertificateKeyFileOption, SERVER_KEY
      );

      it('works with matching CA (args)', async() => {
        const shell = TestShell.start({
          args: [
            await server.connectionString(),
            '--tls', '--tlsCAFile', CA_CERT
          ]
        });
        const result = await waitForPromptOrExit(shell);
        expect(result.state).to.equal('prompt');
      });

      // TODO: investigate why it does not work in connection string
      // eslint-disable-next-line mocha/no-skipped-tests
      it.skip('works with matching CA (connection string)', async() => {
        const shell = TestShell.start({
          args: [
            `${await server.connectionString()}?tls=true&tlsCAFile=${encodeURIComponent(CA_CERT)}`
          ]
        });
        const result = await waitForPromptOrExit(shell);
        expect(result.state).to.equal('prompt');
      });

      it('fails when not using --tls (args)', async() => {
        const shell = TestShell.start({
          args: [
            `${await server.connectionString()}?serverSelectionTimeoutMS=1500`
          ]
        });
        const result = await waitForPromptOrExit(shell);
        expect(result.state).to.equal('exit');
        shell.assertContainsOutput('MongoServerSelectionError');
      });

      it('fails when not using --tls (connection string)', async() => {
        const shell = TestShell.start({
          args: [
            `${await server.connectionString()}?serverSelectionTimeoutMS=1500&tls=false`
          ]
        });
        const result = await waitForPromptOrExit(shell);
        expect(result.state).to.equal('exit');
        shell.assertContainsOutput('MongoServerSelectionError');
      });

      it('fails with invalid CA (args)', async() => {
        const shell = TestShell.start({
          args: [
            `${await server.connectionString()}?serverSelectionTimeoutMS=1500`,
            '--tls', '--tlsCAFile', NON_CA_CERT
          ]
        });
        const result = await waitForPromptOrExit(shell);
        expect(result.state).to.equal('exit');
        shell.assertContainsOutput('unable to verify the first certificate');
      });

      it('fails with invalid CA (connection string)', async() => {
        const shell = TestShell.start({
          args: [
            `${await server.connectionString()}?serverSelectionTimeoutMS=1500&tls=true&tlsCAFile=${encodeURIComponent(NON_CA_CERT)}`
          ]
        });
        const result = await waitForPromptOrExit(shell);
        expect(result.state).to.equal('exit');
        shell.assertContainsOutput('unable to verify the first certificate');
      });

      it('fails when providing a CRL including the servers cert', async() => {
        const shell = TestShell.start({
          args: [
            `${await server.connectionString()}?serverSelectionTimeoutMS=1500`,
            '--tls', '--tlsCAFile', CA_CERT, '--tlsCRLFile', CRL_INCLUDING_SERVER
          ]
        });
        const result = await waitForPromptOrExit(shell);
        expect(result.state).to.equal('exit');
        shell.assertContainsOutput('certificate revoked');
      });
    });

    context('connecting with client cert', () => {
      const server = startTestServer(
        'not-shared',
        serverTlsModeOption, serverTlsModeValue,
        serverTlsCertificateKeyFileOption, SERVER_KEY,
        serverTlsCAFileOption, CA_CERT
      );
      const certUser = 'emailAddress=tester@example.com,CN=Wonderwoman,OU=DevTools Testers,O=MongoDB';

      it('can connect with cert to create user', async() => {
        const shell = TestShell.start({
          args: [
            `${await server.connectionString()}?serverSelectionTimeoutMS=1500`,
            '--tls', '--tlsCAFile', CA_CERT,
            '--tlsCertificateKeyFile', CLIENT_CERT
          ]
        });
        const prompt = await waitForPromptOrExit(shell);
        expect(prompt.state).to.equal('prompt');
        await shell.executeLine(`db=db.getSiblingDB('$external');db.runCommand({
        createUser: '${certUser}',
        roles: [
          {role: 'userAdminAnyDatabase', db: 'admin'}
        ]
      })`);
        shell.assertContainsOutput('{ ok: 1 }');
      });

      it('works with valid cert (args)', async() => {
        const shell = TestShell.start({
          args: [
            `${await server.connectionString()}?serverSelectionTimeoutMS=1500`,
            '--authenticationMechanism', 'MONGODB-X509',
            '--tls', '--tlsCAFile', CA_CERT,
            '--tlsCertificateKeyFile', CLIENT_CERT
          ]
        });
        const prompt = await waitForPromptOrExit(shell);
        expect(prompt.state).to.equal('prompt');
        await shell.executeLine('db.runCommand({ connectionStatus: 1 })');
        shell.assertContainsOutput(`user: '${certUser}'`);
      });

      // TODO: investigate why it does not work in connection string
      // eslint-disable-next-line mocha/no-skipped-tests
      it.skip('works with valid cert (connection string)', async() => {
        const shell = TestShell.start({
          args: [
            `${await server.connectionString()}?serverSelectionTimeoutMS=1500`
            + '&authenticationMechanism=MONGODB-X509'
            + `&tls=true&tlsCAFile=${encodeURIComponent(CA_CERT)}&tlsCertificateKeyFile=${encodeURIComponent(CLIENT_CERT)}`
          ]
        });
        const prompt = await waitForPromptOrExit(shell);
        expect(prompt.state).to.equal('prompt');
        await shell.executeLine('db.runCommand({ connectionStatus: 1 })');
        shell.assertContainsOutput(`user: '${certUser}'`);
      });

      it('fails with invalid cert (args)', async() => {
        const shell = TestShell.start({
          args: [
            `${await server.connectionString()}?serverSelectionTimeoutMS=1500`,
            '--authenticationMechanism', 'MONGODB-X509',
            '--tls', '--tlsCAFile', CA_CERT,
            '--tlsCertificateKeyFile', INVALID_CLIENT_CERT
          ]
        });
        const exit = await waitForPromptOrExit(shell);
        expect(exit.state).to.equal('exit');
        shell.assertContainsOutput('MongoServerSelectionError');
      });

      // TODO: investigate why it does not work in connection string
      // eslint-disable-next-line mocha/no-skipped-tests
      it.skip('fails with invalid cert (connection string)', async() => {
        const shell = TestShell.start({
          args: [
            `${await server.connectionString()}?serverSelectionTimeoutMS=1500`
            + '&authenticationMechanism=MONGODB-X509'
            + `&tls=true&tlsCAFile=${encodeURIComponent(CA_CERT)}&tlsCertificateKeyFile=${encodeURIComponent(INVALID_CLIENT_CERT)}`
          ]
        });
        const exit = await waitForPromptOrExit(shell);
        expect(exit.state).to.equal('exit');
        shell.assertContainsOutput('MongoServerSelectionError');
      });
    });
  }
});
