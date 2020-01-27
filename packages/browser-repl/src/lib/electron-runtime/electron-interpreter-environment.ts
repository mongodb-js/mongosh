import vm, { Context } from 'vm';

import {
  ContextValue,
  InterpreterEnvironment
} from '../interpreter';

export class ElectronInterpreterEnvironment implements InterpreterEnvironment {
  private context: Context;

  constructor(context) {
    this.context = context;
    vm.createContext(context);
  }

  sloppyEval(code: string): ContextValue {
    return vm.runInContext(code, this.context);
  }

  setGlobal(name, val): ContextValue {
    this.context[name] = val;
  }

  getGlobal(name: string): void {
    return this.context[name];
  }
}
