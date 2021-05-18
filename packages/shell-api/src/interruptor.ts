import { MongoshBaseError, MongoshInternalError } from '@mongosh/errors';
import { ShellApiClass } from './decorators';
import { shellApiType } from './enums';

const kUncatchable = Symbol.for('@@mongosh.uncatchable');

export class MongoshInterruptedError extends MongoshBaseError {
  [kUncatchable] = true;

  constructor() {
    super('MongoshInterruptedError', 'execution was interrupted');
  }
}

export class InterruptFlag {
  private interrupted = false;
  private deferred: {
    reject: (e: MongoshInterruptedError) => void;
    promise: Promise<never>;
  };

  constructor() {
    this.deferred = this.defer();
  }

  public isSet(): boolean {
    return this.interrupted;
  }

  /**
   * The returned promise will never be resolved but is rejected
   * when the interrupt is set. The rejection happens with an
   * instance of `MongoshInterruptedError`.
   * @returns Promise that is rejected when the interrupt is set
   */
  public asPromise(): Promise<never> {
    return this.deferred.promise;
  }

  public set(): void {
    this.interrupted = true;
    this.deferred.reject(new MongoshInterruptedError());
  }

  public reset(): void {
    this.interrupted = false;
    this.deferred = this.defer();
  }

  private defer(): { reject: (e: MongoshInterruptedError) => void; promise: Promise<never>; } {
    const result: any = {};
    result.promise = new Promise<never>((_, reject) => {
      result.reject = reject;
    });
    result.promise.catch(() => {
      // we ignore the error here - all others should be notified
      // we just have to ensure there's at least one handler for it
      // to prevent an UnhandledPromiseRejection
    });
    return result;
  }
}

export function checkInterrupted(apiClass: any): InterruptFlag | undefined {
  if (!apiClass[shellApiType]) {
    throw new MongoshInternalError('checkInterrupted can only be called for functions from shell API classes');
  }
  // internalState can be undefined in tests
  const internalState = (apiClass as ShellApiClass)._internalState;
  if (internalState?.interrupted?.isSet()) {
    throw new MongoshInterruptedError();
  }
  return internalState?.interrupted;
}
