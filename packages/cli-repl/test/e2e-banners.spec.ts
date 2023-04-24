import { serialize, Long } from 'bson';
import { once } from 'events';
import { createServer } from 'http';
import { startTestServer, skipIfApiStrict } from '../../../testing/integration-testing-hooks';
import { TestShell } from './test-shell';

describe('e2e startup banners', () => {
  skipIfApiStrict();
  afterEach(TestShell.cleanup);

  const testServer = startTestServer('shared');

  let freeMonitoringHttpServer;
  before(async() => {
    freeMonitoringHttpServer = createServer((req, res) => {
      req.resume().on('end', () => {
        res.end(serialize({
          version: new Long(1),
          haltMetricsUploading: false,
          id: 'mock123',
          informationalURL: 'http://www.example.com',
          message: 'Welcome to the Mock Free Monitoring Endpoint',
          reportingInterval: new Long(1),
          userReminder: 'Some user reminder about free monitoring'
        }));
      });
    });
    freeMonitoringHttpServer.listen(42123);
    await once(freeMonitoringHttpServer, 'listening');
  });

  after(() => {
    // eslint-disable-next-line chai-friendly/no-unused-expressions
    freeMonitoringHttpServer?.close?.();
  });

  context('without special configuration', () => {
    it('shows startup warnings', async() => {
      const shell = TestShell.start({ args: [await testServer.connectionString()] });
      await shell.waitForPrompt();
      shell.assertContainsOutput('The server generated these startup warnings when booting');
      shell.assertContainsOutput('Access control is not enabled for the database.');
      shell.assertNoErrors();
    });
  });

  context('with automation notices enabled', () => {
    let helperShell: TestShell;

    beforeEach(async() => {
      helperShell = TestShell.start({ args: [await testServer.connectionString()] });
      await helperShell.waitForPrompt();
      await helperShell.executeLine('db.adminCommand({setParameter: 1, automationServiceDescriptor: "automation service"})');
    });

    afterEach(async() => {
      await helperShell.executeLine('db.adminCommand({setParameter: 1, automationServiceDescriptor: ""})');
      helperShell.assertNoErrors();
    });

    it('shows automation notices', async() => {
      const shell = TestShell.start({ args: [await testServer.connectionString()] });
      await shell.waitForPrompt();
      shell.assertContainsOutput("This server is managed by automation service 'automation service'.");
      shell.assertNoErrors();
    });
  });

  context('with free monitoring', () => {
    if (
      !process.env.MONGOSH_SERVER_TEST_VERSION?.includes('community') ||
      process.env.MONGOSH_SERVER_TEST_VERSION.match(/^4\.[0-3]/) ||
      process.platform === 'win32'
    ) {
      // Enterprise and 4.2/4.0 community servers do not know about the setParameter flags below.
      // On Windows in CI, this fails as well (for unknown reasons).
      before(function() { this.skip(); });
    }

    // Using a non-shared server so we can change the server configuration
    // in isolation here.
    const testServer = startTestServer(
      'not-shared',
      '--setParameter', 'cloudFreeMonitoringEndpointURL=http://127.0.0.1:42123/',
      '--setParameter', 'testingDiagnosticsEnabled=true');

    it('shows free monitoring notice by default', async() => {
      const shell = TestShell.start({ args: [await testServer.connectionString()] });
      await shell.waitForPrompt();
      shell.assertContainsOutput('To enable free monitoring, run the following command: db.enableFreeMonitoring()');
      shell.assertNoErrors();
    });

    context('with free monitoring explicitly disabled', () => {
      beforeEach(async() => {
        const helperShell = TestShell.start({ args: [await testServer.connectionString()] });
        await helperShell.waitForPrompt();
        await helperShell.executeLine('db.disableFreeMonitoring()');
        helperShell.assertNoErrors();
      });

      it('does not show a free monitoring notice', async() => {
        const shell = TestShell.start({ args: [await testServer.connectionString()] });
        await shell.waitForPrompt();
        shell.assertNotContainsOutput('free monitoring');
        shell.assertNoErrors();
      });
    });

    context('with free monitoring explicitly enabled', () => {
      beforeEach(async() => {
        const helperShell = TestShell.start({ args: [await testServer.connectionString()] });
        await helperShell.waitForPrompt();
        await helperShell.executeLine('db.enableFreeMonitoring()');
        helperShell.assertNoErrors();
      });

      it('does not show a free monitoring notice', async() => {
        const shell = TestShell.start({ args: [await testServer.connectionString()] });
        await shell.waitForPrompt();
        shell.assertContainsOutput('Some user reminder about free monitoring');
        shell.assertNoErrors();
      });
    });
  });
});
