import assert from 'assert';
import Mocha from 'mocha';
import { TestShell, type TestShellOptions } from './test-shell';

declare module 'mocha' {
  interface Context {
    /**
     * Starts a test shell and registers a hook to kill it after the test
     */
    startTestShell(options?: TestShellOptions): TestShell;
  }
}

const TEST_SHELLS_AFTER_ALL = Symbol('test-shells-after-all');
const TEST_SHELLS_AFTER_EACH = Symbol('test-shells-after-each');

type AfterAllInjectedSuite = {
  [TEST_SHELLS_AFTER_ALL]: Set<TestShell>;
};

type AfterEachInjectedSuite = {
  [TEST_SHELLS_AFTER_EACH]: Set<TestShell>;
};

/**
 * Registers an after (all or each) hook to kill test shells started during the hooks or tests.
 * You don't have to call this from tests, but you can if you want to register an after (each) hook
 * which runs after the shells have been killed.
 */
export function ensureTestShellAfterHook(
  hookName: 'afterEach',
  suite: Mocha.Suite
): asserts suite is AfterEachInjectedSuite & Mocha.Suite;
export function ensureTestShellAfterHook(
  hookName: 'afterAll',
  suite: Mocha.Suite
): asserts suite is AfterAllInjectedSuite & Mocha.Suite;
export function ensureTestShellAfterHook(
  hookName: 'afterEach' | 'afterAll',
  suite: Partial<AfterAllInjectedSuite & AfterEachInjectedSuite> & Mocha.Suite
): void {
  const symbol =
    hookName === 'afterAll' ? TEST_SHELLS_AFTER_ALL : TEST_SHELLS_AFTER_EACH;
  if (!suite[symbol]) {
    // Store the set of shells to kill afterwards
    const shells = new Set<TestShell>();
    suite[symbol] = shells;
    suite[hookName](async function () {
      const shellsToKill = [...shells];
      shells.clear();

      if (this.currentTest?.state === 'failed') {
        for (const shell of shellsToKill) {
          console.error(shell.debugInformation());
        }
      }

      await Promise.all(
        shellsToKill.map((shell) => {
          if (shell.process.exitCode === null) {
            shell.kill();
          }
          return shell.waitForAnyExit();
        })
      );
    });
  }
}

Mocha.Context.prototype.startTestShell = function (
  this: Mocha.Context,
  options: TestShellOptions
) {
  const { test: runnable } = this;
  assert(runnable, 'Expected a runnable / test');
  const { parent } = runnable;
  assert(parent, 'Expected runnable to have a parent');
  // Start the shell
  const shell = TestShell.start(options);
  // Register a hook to kill the shell
  if (runnable instanceof Mocha.Hook) {
    if (
      runnable.originalTitle === '"before each" hook' ||
      runnable.originalTitle === '"after each" hook'
    ) {
      ensureTestShellAfterHook('afterEach', parent);
      parent[TEST_SHELLS_AFTER_EACH].add(shell);
    } else if (
      runnable.originalTitle === '"before all" hook' ||
      runnable.originalTitle === '"after all" hook'
    ) {
      ensureTestShellAfterHook('afterAll', parent);
      parent[TEST_SHELLS_AFTER_ALL].add(shell);
    } else {
      throw new Error(`Unexpected ${runnable.originalTitle || runnable.title}`);
    }
  } else if (runnable instanceof Mocha.Test) {
    ensureTestShellAfterHook('afterEach', parent);
    parent[TEST_SHELLS_AFTER_EACH].add(shell);
  } else {
    throw new Error('Unexpected Runnable: Expected a Hook or a Test');
  }
  return shell;
};
