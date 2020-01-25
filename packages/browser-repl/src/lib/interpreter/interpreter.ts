import { preprocess } from './preprocess';

const LAST_EXPRESSION_CALLBACK_FUNCTION_NAME = '___MONGOSH_LAST_EXPRESSION_CALLBACK';
const LEXICAL_CONTEXT_VARIABLE_NAME = '___MONGOSH_LEXCON';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ContextValue = any;

export type EvaluationResult = {
  value: ContextValue;
};

export interface InterpreterEnvironment {
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
      lastExpressionCallbackFunctionName: LAST_EXPRESSION_CALLBACK_FUNCTION_NAME,
      lexicalContextStoreVariableName: LEXICAL_CONTEXT_VARIABLE_NAME
    });

    this.lexicalContext = lexicalContext;
    return preprocessedCode;
  }
}

export class Interpreter {
  private environment: InterpreterEnvironment;
  private preprocessor: Preprocessor;

  constructor(environment: InterpreterEnvironment) {
    this.environment = environment;
    this.environment.setGlobal(LEXICAL_CONTEXT_VARIABLE_NAME, {});
    this.preprocessor = new Preprocessor();
  }

  async evaluate(code: string): Promise<EvaluationResult> {
    let result;
    this.environment.setGlobal(LAST_EXPRESSION_CALLBACK_FUNCTION_NAME, (val): void => {
      result = val;
    });

    const preprocessedCode = this.preprocessor.preprocess(code);
    await this.environment.sloppyEval(preprocessedCode);

    return { value: await result };
  }
}
