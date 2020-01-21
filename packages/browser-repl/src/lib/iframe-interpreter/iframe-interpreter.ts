import { Interpreter, EvaluationResult, ContextValue } from '../../components/interpreter';
import { preprocess } from './preprocess';

const CAPTURE_RESULT_FUNCTION_NAME = '___MONGOSH_EVAL_CAPTURE_RESULT';
const LEXICAL_CONTEXT_VARIABLE_NAME = '___MONGOSH_LEXCON';

export class IframeInterpreter implements Interpreter {
  private iframe: HTMLIFrameElement;
  private container: HTMLDivElement;

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

    contentWindow[LEXICAL_CONTEXT_VARIABLE_NAME] = contentWindow[LEXICAL_CONTEXT_VARIABLE_NAME] || {};

    const {
      code: preprocessedCode,
      lexicalContext
    } = preprocess(code, {
      lexicalContext: this.lexicalContext,
      lastExpressionCallbackFunctionName: CAPTURE_RESULT_FUNCTION_NAME,
      lexicalContextStoreVariableName: LEXICAL_CONTEXT_VARIABLE_NAME
    });

    this.lexicalContext = lexicalContext;
    contentWindow.eval(preprocessedCode);

    return { value: result };
  }

  initialize(): Promise<void> {
    if (this.iframe) {
      return;
    }

    this.container = document.createElement('div');
    this.container.style.display = 'none';

    // NOTE: inserting the iframe directly as dom element does not work with sandboxing.
    this.container.insertAdjacentHTML('beforeend', '<iframe src="about:blank" style="display: none" sandbox="allow-same-origin" />');

    this.iframe = this.container.firstElementChild as HTMLIFrameElement;

    const ready: Promise<void> = new Promise((resolve) => {
      this.iframe.onload = (): void => resolve();
    });

    document.body.appendChild(this.container);

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
