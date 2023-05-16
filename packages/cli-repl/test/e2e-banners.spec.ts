import { startTestServer, skipIfApiStrict } from '../../../testing/integration-testing-hooks';
import { TestShell } from './test-shell';

describe('e2e startup banners', () => {
  skipIfApiStrict();
  afterEach(TestShell.cleanup);

  const testServer = startTestServer('shared');

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
});
