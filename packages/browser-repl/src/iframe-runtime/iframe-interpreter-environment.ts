import type {
  ContextValue,
  InterpreterEnvironment,
} from '@mongosh/browser-runtime-core';

export class IframeInterpreterEnvironment implements InterpreterEnvironment {
  private window: Window;

  constructor(window: Window) {
    this.window = window;
    // we don't want window.prompt to confuse the shell into thinking a custom
    // prompt was set
    this.sloppyEval('delete window.prompt');
  }

  sloppyEval(code: string): ContextValue {
    return (this.window as any).eval(code);
  }

  getContextObject(): ContextValue {
    return this.window;
  }
}
