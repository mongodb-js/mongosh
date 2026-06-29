import type { Context } from 'vm';
import vm from 'vm';
import { inspect } from 'util';

import type {
  ContextValue,
  InterpreterEnvironment,
} from '@mongosh/browser-runtime-core';

export class ElectronInterpreterEnvironment implements InterpreterEnvironment {
  private context: Context;

  constructor(context: Context) {
    this.context = context;
    vm.createContext(context);
    // Dates created inside the VM context have a different Date.prototype than
    // the module scope, so we must patch the context's own Date.prototype.
    const vmDate = vm.runInContext('Date', context) as typeof Date;
    (vmDate.prototype as any)[inspect.custom] = function (this: Date): string {
      return isNaN(this.valueOf())
        ? 'Invalid Date'
        : `ISODate('${this.toISOString()}')`;
    };
  }

  sloppyEval(code: string): ContextValue {
    return vm.runInContext(code, this.context, { breakOnSigint: true });
  }

  getContextObject(): ContextValue {
    return this.context;
  }
}
