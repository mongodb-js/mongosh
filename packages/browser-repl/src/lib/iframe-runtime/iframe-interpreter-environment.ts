import {
  ContextValue,
  InterpreterEnvironment
} from '../interpreter';

export class IframeInterpreterEnvironment implements InterpreterEnvironment {
  private window: Window;

  constructor(window: Window) {
    this.window = window;
  }

  sloppyEval(code: string): ContextValue {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.window as any).eval(code);
  }

  setGlobal(name, val): ContextValue {
    this.window[name] = val;
  }

  getGlobal(name: string): void {
    return this.window[name];
  }
}
