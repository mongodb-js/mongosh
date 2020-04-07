import { parse } from '@babel/parser';
import generate from '@babel/generator';

import {
  injectLastExpressionCallback
} from './inject-last-expression-callback';

import {
  wrapObjectLiteral
} from './wrap-object-literal';

import {
  wrapInAsyncFunctionCall
} from './wrap-in-async-function-call';

import {
  saveAndRestoreLexicalContext
} from './save-and-restore-lexical-context';

export class Preprocessor {
  private lexicalContext = {};
  private lastExpressionCallbackFunctionName: string;
  private lexicalContextStoreVariableName: string;

  constructor(options: {
    lastExpressionCallbackFunctionName: string;
    lexicalContextStoreVariableName: string;
  }) {
    this.lastExpressionCallbackFunctionName = options.lastExpressionCallbackFunctionName;
    this.lexicalContextStoreVariableName = options.lexicalContextStoreVariableName;
  }

  preprocess(code: string): string {
    let ast;
    code = wrapObjectLiteral(code);
    code = `;${code}`; // prevent literals from being parsed as directives

    ast = parse(code, { allowAwaitOutsideFunction: true });
    ast = injectLastExpressionCallback(this.lastExpressionCallbackFunctionName, ast);

    const {
      ast: newAst,
      lexicalContext: newLexicalContext
    } = saveAndRestoreLexicalContext(ast, {
      lexicalContext: this.lexicalContext,
      lexicalContextStoreVariableName: this.lexicalContextStoreVariableName
    });

    ast = newAst;
    ast = wrapInAsyncFunctionCall(ast);

    const newCode = generate(ast).code;
    this.lexicalContext = newLexicalContext;
    return newCode;
  }
}

