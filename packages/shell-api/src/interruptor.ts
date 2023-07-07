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

/**
 * Contains the interruption state for a given shell instance and
 * exposes ways to listen to changes of that state.
 */
export class InterruptFlag {
  private interrupted = false;
  private onInterruptListeners: ((err: Error) => void)[] = [];

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
  public asPromise(): { destroy: () => void; promise: Promise<never> } {
    if (this.interrupted) {
      return {
        destroy: () => {},
        promise: Promise.reject(new MongoshInterruptedError()),
      };
    }

    let destroy: (() => void) | undefined;
    const promise = new Promise<never>((_, reject) => {
      destroy = () => {
        const index = this.onInterruptListeners.indexOf(reject);
        if (index !== -1) {
          this.onInterruptListeners.splice(index, 1);
        }
        reject(null);
      };
      this.onInterruptListeners.push(reject);
    });
    return {
      destroy: destroy as unknown as () => void,
      promise,
    };
  }

  /**
   * Mark an interrupt as having occurred.
   */
  public set(): void {
    this.interrupted = true;
    const err = new MongoshInterruptedError();
    for (const listener of [...this.onInterruptListeners]) {
      listener(err);
    }
  }

  /**
   * Clear the current interrupt state.
   */
  public reset(): void {
    this.interrupted = false;
  }
}
