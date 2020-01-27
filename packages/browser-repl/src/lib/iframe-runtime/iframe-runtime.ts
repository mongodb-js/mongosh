import {
  setupEvaluationContext
} from '../runtime-helpers/setup-evaluation-context';

import {
  Interpreter,
  EvaluationResult,
} from '../interpreter';

import {
  IframeInterpreterEnvironment
} from './iframe-interpreter-environment';

export class IframeRuntime {
  private iframe: HTMLIFrameElement;
  private container: HTMLDivElement;
  private interpreter: Interpreter;
  private serviceProvider: object;

  constructor(serviceProvider: object) {
    this.serviceProvider = serviceProvider;
  }

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

    setupEvaluationContext(
      this.iframe.contentWindow,
      this.serviceProvider
    );

    const environment = new IframeInterpreterEnvironment(this.iframe.contentWindow);
    this.interpreter = new Interpreter(environment);

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
