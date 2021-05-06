import { MongoshBaseError, MongoshInternalError } from '@mongosh/errors';
import { ShellApiClass } from './decorators';
import { shellApiType } from './enums';

export class MongoshInterruptedError extends MongoshBaseError {
  constructor() {
    super('MongoshInterruptedError', 'execution was interrupted');
  }
}

export function checkInterrupted(apiClass: any): void {
  if (!apiClass[shellApiType]) {
    throw new MongoshInternalError('checkInterrupted can only be called for functions from shell API classes');
  }
  // internalState can be undefined in tests
  if ((apiClass as ShellApiClass)._internalState?.interrupted) {
    throw new MongoshInterruptedError();
  }
}
