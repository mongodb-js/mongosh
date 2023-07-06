import {
  startTestServer,
  skipIfApiStrict,
} from '../../../testing/integration-testing-hooks';
import { TestShell } from './test-shell';

describe('e2e startup banners', function () {
  skipIfApiStrict();
  afterEach(TestShell.cleanup);

  const testServer = startTestServer('shared');

  context('without special configuration', function () {
    it('shows startup warnings', async function () {
      const shell = TestShell.start({
        args: [await testServer.connectionString()],
      });
      await shell.waitForPrompt();
      shell.assertContainsOutput(
        'The server generated these startup warnings when booting'
      );
      shell.assertContainsOutput(
        'Access control is not enabled for the database.'
      );
      shell.assertNoErrors();
    });
  });

  context('with automation notices enabled', function () {
    let helperShell: TestShell;

    beforeEach(async function () {
      helperShell = TestShell.start({
        args: [await testServer.connectionString()],
      });
      await helperShell.waitForPrompt();
      await helperShell.executeLine(
        'db.adminCommand({setParameter: 1, automationServiceDescriptor: "automation service"})'
      );
    });

    afterEach(async function () {
      await helperShell.executeLine(
        'db.adminCommand({setParameter: 1, automationServiceDescriptor: ""})'
      );
      helperShell.assertNoErrors();
    });

    it('shows automation notices', async function () {
      const shell = TestShell.start({
        args: [await testServer.connectionString()],
      });
      await shell.waitForPrompt();
      shell.assertContainsOutput(
        "This server is managed by automation service 'automation service'."
      );
      shell.assertNoErrors();
    });
  });
});
