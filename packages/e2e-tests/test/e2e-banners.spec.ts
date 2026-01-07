import { skipIfApiStrict, startSharedTestServer } from '@mongosh/testing';
import type { TestShell } from './test-shell';
import { startTestShell } from './test-shell-context';

describe('e2e startup banners', function () {
  skipIfApiStrict();

  const testServer = startSharedTestServer();

  context('without special configuration', function () {
    it('shows startup warnings', async function () {
      const shell = startTestShell(this, {
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
      helperShell = startTestShell(this, {
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
      const shell = startTestShell(this, {
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
