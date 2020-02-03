import { Preprocessor } from './preprocessor';

const LAST_EXPRESSION_CALLBACK_FUNCTION_NAME = '___MONGOSH_LAST_EXPRESSION_CALLBACK';
const LEXICAL_CONTEXT_VARIABLE_NAME = '___MONGOSH_LEXCON';

export type ContextValue = any;

export type EvaluationResult = {
  value: ContextValue;
};

export interface InterpreterEnvironment {
  sloppyEval(code: string): EvaluationResult;
  setGlobal(name, val: ContextValue): void;
  getGlobal(name: string): ContextValue;
}

export class Interpreter {
  private environment: InterpreterEnvironment;
  private preprocessor: Preprocessor;

  constructor(environment: InterpreterEnvironment) {
    this.environment = environment;
    this.environment.setGlobal(LEXICAL_CONTEXT_VARIABLE_NAME, {});
    this.preprocessor = new Preprocessor({
      lastExpressionCallbackFunctionName: LAST_EXPRESSION_CALLBACK_FUNCTION_NAME,
      lexicalContextStoreVariableName: LEXICAL_CONTEXT_VARIABLE_NAME
    });
  }

  async evaluate(code: string): Promise<EvaluationResult> {
    let result;
    this.environment.setGlobal(LAST_EXPRESSION_CALLBACK_FUNCTION_NAME, (val): void => {
      result = val;
    });

    const preprocessedCode = this.preprocessor.preprocess(code);
    await this.environment.sloppyEval(preprocessedCode);

    return {
      value: await result
    };
  }
}
