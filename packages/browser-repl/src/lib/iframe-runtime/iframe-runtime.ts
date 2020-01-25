import { Interpreter } from '../interpreter';

type EvaluationResult = any;

interface InterpreterEnvironment {
  sloppyEval(code: string): EvaluationResult;
  setGlobal(name, val): EvaluationResult;
  getGlobal(name: string): EvaluationResult;
}



class IframeInterpreterEnvironment {
  private iframe: HTMLIFrameElement;

  constructor(iframe: HTMLIFrameElement) {
    this.iframe = iframe;
  }

  sloppyEval(code: string): EvaluationResult {
    return (this.iframe.contentWindow as EvaluationResult).eval(code);
  }

  setGlobal(name, val): EvaluationResult {
    this.iframe.contentWindow[name] = val;
  }

  getGlobal(name: string): EvaluationResult {
    return this.iframe.contentWindow[name];
  }
}

export class IframeRuntime {
  private iframe: HTMLIFrameElement;
  private container: HTMLDivElement;
  private interpreter: Interpreter;

  async evaluate(code: string): Promise<EvaluationResult> {
    if (!this.iframe) {
      await this.initialize();
    }

    return await this.interpreter.evaluate(code);
  }

  async initialize(): Promise<void> {
    if (this.iframe) {
      return;
    }

    this.container = document.createElement('div');
    this.container.style.display = 'none';

    // NOTE: inserting the iframe directly as dom element does not work with sandboxing.
    this.container.insertAdjacentHTML(
      'beforeend',
      '<iframe src="about:blank" style="display: none" sandbox="allow-same-origin" />');

    this.iframe = this.container.firstElementChild as HTMLIFrameElement;

    const ready: Promise<void> = new Promise((resolve) => {
      this.iframe.onload = (): void => resolve();
    });

    document.body.appendChild(this.container);

    this.interpreter = new Interpreter(new IframeInterpreterEnvironment(this.iframe));

    return await ready;
  }

  destroy(): Promise<void> {
    if (!this.iframe) {
      return;
    }

    const parent = this.iframe.parentNode;

    if (!parent) {
      return;
    }

    parent.removeChild(this.iframe);
    return Promise.resolve();
  }
}
