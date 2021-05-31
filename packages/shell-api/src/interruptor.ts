import { MongoshBaseError } from '@mongosh/errors';
import { EventEmitter } from 'events';
import ShellInternalState from './shell-internal-state';

const interruptEvent = 'interrupted';
const kUncatchable = Symbol.for('@@mongosh.uncatchable');

export class MongoshInterruptedError extends MongoshBaseError {
  [kUncatchable] = true;

  constructor() {
    super('MongoshInterruptedError', 'execution was interrupted');
  }
}

export class InterruptFlag {
  private interrupted = false;
  private onInterrupt = new EventEmitter();

  public isSet(): boolean {
    return this.interrupted;
  }

  /**
   * Perform a checkpoint; reject immediately if an interruption has already
   * occurred, and resolve immediately otherwise. This is useful to insert
   * in operations consisting of multiple asynchronous steps.
   */
  public async checkpoint(): Promise<void> {
    if (this.interrupted) {
      await this.asPromise().promise;
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
        promise: Promise.reject(new MongoshInterruptedError())
      };
    }

    let destroy: (() => void) | undefined;
    const promise = new Promise<never>((_, reject) => {
      destroy = () => {
        this.onInterrupt.removeListener(interruptEvent, reject);
        reject(null);
      };
      this.onInterrupt.once(interruptEvent, reject);
    });
    return {
      destroy: destroy as unknown as () => void,
      promise
    };
  }

  public set(): void {
    this.interrupted = true;
    this.onInterrupt.emit(interruptEvent, new MongoshInterruptedError());
  }

  public reset(): void {
    this.interrupted = false;
  }
}

export function checkInterrupted(internalState: ShellInternalState | undefined): InterruptFlag | undefined {
  if (internalState?.interrupted?.isSet()) {
    throw new MongoshInterruptedError();
  }
  return internalState?.interrupted;
}
