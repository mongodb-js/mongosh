import { MongoshBaseError } from '@mongosh/errors';

const kUncatchable = Symbol.for('@@mongosh.uncatchable');

/**
 * Class for interruption errors. This is specially marked so
 * that the async rewriter removes the ability to catch it from
 * user code.
 */
export class MongoshInterruptedError extends MongoshBaseError {
  [kUncatchable] = true;

  constructor() {
    super('MongoshInterruptedError', 'execution was interrupted');
  }
}

interface InterruptWatcher {
  destroy: () => void;
  promise: Promise<never>;
}

/**
 * Contains the interruption state for a given shell instance and
 * exposes ways to listen to changes of that state.
 */
export class InterruptFlag {
  private interrupted = false;
  private onInterruptListeners = new Set<
    (err: Error) => void | Promise<void>
  >();

  /**
   * Returns whether an interrupt is currently in progress, i.e.
   * whether operations should currently abort or not.
   */
  public isSet(): boolean {
    return this.interrupted;
  }

  /**
   * Perform a checkpoint; throw immediately if an interruption has already
   * occurred, and do nothing otherwise. This is useful to insert
   * in operations consisting of multiple asynchronous steps.
   */
  public checkpoint(): void {
    if (this.interrupted) {
      throw new MongoshInterruptedError();
    }
  }

  /**
   * The returned promise will never be resolved but is rejected
   * when the interrupt is set. The rejection happens with an
   * instance of `MongoshInterruptedError`.
   * @returns Promise that is rejected when the interrupt is set
   */
  public asPromise(): InterruptWatcher {
    if (this.interrupted) {
      const promise = Promise.reject(new MongoshInterruptedError());
      promise.catch(() => {
        /* suppress potential unhandled rejection */
      });
      return {
        destroy: () => {},
        promise,
      };
    }

    let destroy: (() => void) | undefined;
    const promise = new Promise<never>((_, reject) => {
      destroy = () => {
        this.onInterruptListeners.delete(reject);
        reject(null);
      };
      this.onInterruptListeners.add(reject);
    });
    promise.catch(() => {
      /* suppress potential unhandled rejection */
    });
    return {
      destroy: destroy as unknown as () => void,
      promise,
    };
  }

  /**
   * Mark an interrupt as having occurred.
   *
   * This should almost always be instantenous, although an additional listener
   * installed through withOverrideInterruptBehavior() may perform additional
   * cleanup work before the current connection is ready to be severed.
   */
  public async set(): Promise<void> {
    this.interrupted = true;
    const err = new MongoshInterruptedError();
    for (const listener of [...this.onInterruptListeners]) {
      try {
        await listener(err);
      } catch {
        // Not a lot we can do about an error in an interrupt listener.
        // If the listener was added via `withOverrideInterruptBehavior()`,
        // then that function also propagates the error back to the caller.
      }
    }
  }

  /**
   * Clear the current interrupt state.
   */
  public reset(): void {
    this.interrupted = false;
  }

  /**
   * Run a function while providing a way to run specific cleanup code
   * before an interrupt inside it fires. This is different from a
   * try/finally in that a finally block may not run before mongosh's own
   * interruption handling code, including closing MongoClients to abort
   * connections.
   */
  public async withOverrideInterruptBehavior<
    Action extends (watcher: InterruptWatcher) => any,
    OnInterrupt extends () => Promise<void> | void
  >(fn: Action, onInterrupt: OnInterrupt): Promise<ReturnType<Action>> {
    const watcher = this.asPromise();
    let listener!: () => Promise<void>;
    const onInterruptFinishPromise = new Promise<void>((resolve) => {
      listener = async () => {
        const interruptHandlerResult = onInterrupt();
        resolve(interruptHandlerResult);
        return interruptHandlerResult;
      };
    });
    this.onInterruptListeners.add(listener);
    try {
      this.checkpoint();
      const resultPromise = fn(watcher);
      resultPromise.catch(() => {
        /* suppress potential unhandled rejection */
      });
      return await Promise.race([resultPromise, watcher.promise]);
    } catch (err) {
      if (this.interrupted) {
        await onInterruptFinishPromise;
      }
      throw err;
    } finally {
      watcher.destroy();
      this.onInterruptListeners.delete(listener);
    }
  }
}
