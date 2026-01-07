import { TestShell } from './test-shell';
import { ensureTestShellAfterHook, startTestShell } from './test-shell-context';

describe('TestShell context', function () {
  context('hooks and tests', function () {
    before(async function () {
      const shell = startTestShell(this, { args: ['--nodb'] });
      await shell.waitForPrompt();
    });

    beforeEach(async function () {
      const shell = startTestShell(this, { args: ['--nodb'] });
      await shell.waitForPrompt();
    });

    after(async function () {
      const shell = startTestShell(this, { args: ['--nodb'] });
      await shell.waitForPrompt();
    });

    afterEach(async function () {
      const shell = startTestShell(this, { args: ['--nodb'] });
      await shell.waitForPrompt();
    });

    it("doesn't explode", async function () {
      const shell = startTestShell(this, { args: ['--nodb'] });
      await shell.waitForPrompt();
    });
  });

  context('adding an after each running after cleanup', function () {
    beforeEach(async function () {
      const shell = startTestShell(this, { args: ['--nodb'] });
      await shell.waitForPrompt();
    });

    // Calling this before the "afterEach" below, ensures the cleanup hook gets added before it
    ensureTestShellAfterHook('afterEach', this);

    afterEach(function () {
      TestShell.assertNoOpenShells();
    });

    it('works', function () {
      /* */
    });
  });

  after(function () {
    TestShell.assertNoOpenShells();
  });
});
