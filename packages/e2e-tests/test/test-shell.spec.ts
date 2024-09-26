import { TestShell } from './test-shell';

describe('TestShell', function () {
  context('sub-suite', function () {
    before(async function () {
      const shell = this.startTestShell({ args: ['--nodb'] });
      await shell.waitForPrompt();
    });

    beforeEach(async function () {
      const shell = this.startTestShell({ args: ['--nodb'] });
      await shell.waitForPrompt();
    });

    after(async function () {
      const shell = this.startTestShell({ args: ['--nodb'] });
      await shell.waitForPrompt();
    });

    afterEach(async function () {
      const shell = this.startTestShell({ args: ['--nodb'] });
      await shell.waitForPrompt();
    });

    it("doesn't explode", async function () {
      const shell = this.startTestShell({ args: ['--nodb'] });
      await shell.waitForPrompt();
    });
  });

  after(function () {
    TestShell.assertNoOpenShells();
  });
});
