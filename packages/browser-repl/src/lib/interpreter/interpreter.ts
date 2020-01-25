import { preprocess } from './preprocess';

const RESULT_VARIABLE_NAME = '___MONGOSH_RESULT';
const LEXICAL_CONTEXT_VARIABLE_NAME = '___MONGOSH_LEXCON';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ContextValue = any;

export type EvaluationResult = {
  value: ContextValue;
};

interface InterpreterEnvironment {
  sloppyEval(code: string): EvaluationResult;
  setGlobal(name, val: ContextValue): void;
  getGlobal(name: string): ContextValue;
}

class Preprocessor {
  private lexicalContext = {};

  preprocess(code: string): string {
    const {
      code: preprocessedCode,
      lexicalContext
    } = preprocess(code, {
      lexicalContext: this.lexicalContext,
      lastExpressionCallbackFunctionName: RESULT_VARIABLE_NAME,
      lexicalContextStoreVariableName: LEXICAL_CONTEXT_VARIABLE_NAME
    });

}

export class Interpreter {
  private environment: InterpreterEnvironment;
  private lexicalContext = {};

  constructor(environment: InterpreterEnvironment) {
    this.environment = environment;
    this.environment.setGlobal(LEXICAL_CONTEXT_VARIABLE_NAME, {});
  }

  async evaluate(code: string): Promise<EvaluationResult> {
    this.environment.setGlobal(RESULT_VARIABLE_NAME, undefined);



    this.lexicalContext = lexicalContext;
    await contentWindow.eval(preprocessedCode);

    return { value: await result };
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
