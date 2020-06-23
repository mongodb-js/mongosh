import { Preprocessor } from './preprocessor';
import { ShellResult } from '@mongosh/shell-api';

const LAST_EXPRESSION_CALLBACK_FUNCTION_NAME = '___MONGOSH_LAST_EXPRESSION_CALLBACK';
const LEXICAL_CONTEXT_VARIABLE_NAME = '___MONGOSH_LEXCON';

export type ContextValue = any;

export interface InterpreterEnvironment {
  sloppyEval(code: string): ShellResult;
  getContextObject(): ContextValue;
}

export class Interpreter {
  private environment: InterpreterEnvironment;
  private preprocessor: Preprocessor;

  constructor(environment: InterpreterEnvironment) {
    this.environment = environment;
    const contextObjext = this.environment.getContextObject();
    contextObjext[LEXICAL_CONTEXT_VARIABLE_NAME] = {};
    this.preprocessor = new Preprocessor({
      lastExpressionCallbackFunctionName: LAST_EXPRESSION_CALLBACK_FUNCTION_NAME,
      lexicalContextStoreVariableName: LEXICAL_CONTEXT_VARIABLE_NAME
    });
  }

  async evaluate(code: string): Promise<ShellResult> {
    let result;
    const contextObjext = this.environment.getContextObject();

    contextObjext[LAST_EXPRESSION_CALLBACK_FUNCTION_NAME] = (val): void => {
      result = val;
    };

    const preprocessedCode = this.preprocessor.preprocess(code);
    await this.environment.sloppyEval(preprocessedCode);

    return await result;
  }
}
