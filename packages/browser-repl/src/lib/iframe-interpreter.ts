import { Interpreter, EvaluationResult, ContextValue } from './interpreter';
import { preprocess } from './preprocess';

const CAPTURE_RESULT_FUNCTION_NAME = '___MONGOSH_EVAL_CAPTURE_RESULT';

export class IframeInterpreter implements Interpreter {
  private iframe: HTMLIFrameElement;
  private lexicalContext = {};

  async evaluate(code: string): Promise<EvaluationResult> {
    if (!this.iframe) {
      await this.initialize();
    }

    // NOTE: `eval` does not seem to be part of the Window interface.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contentWindow = this.iframe.contentWindow as any;

    let result;

    contentWindow[CAPTURE_RESULT_FUNCTION_NAME] = (lastExpressionValue): void => {
      result = lastExpressionValue;
    };

    const {
      code: preprocessedCode,
      lexicalContext
    } = preprocess(code, {
      lexicalContext: this.lexicalContext,
      lastExpressionCallbackFunctionName: CAPTURE_RESULT_FUNCTION_NAME
    });

    this.lexicalContext = lexicalContext;
    contentWindow.eval(preprocessedCode);

    return { value: result };
  }

  initialize(): Promise<void> {
    if (this.iframe) {
      return;
    }

    const iframe = document.createElement('iframe');
    this.iframe = document.body.appendChild(iframe);

    const ready: Promise<void> = new Promise((resolve) => {
      this.iframe.onload = (): void => resolve();
    });

    this.iframe.style.display = 'none';
    this.iframe.src = 'about:blank';

    return ready;
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

  async setContextVariable(name: string, value: ContextValue): Promise<void> {
    if (!this.iframe) {
      await this.initialize();
    }

    this.iframe.contentWindow[name] = value;
  }
}
