import { parse } from '@babel/parser';
import generate from '@babel/generator';
import AsyncWriter from '@mongosh/async-rewriter';
import { types } from '@mongosh/shell-api';

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

import {
  transformCommandInvocation
} from './transform-command-invocation';

const SUPPORTED_COMMANDS = [
  'help', 'use', 'it', 'show'
];

export type PreprocessOptions = {
  /**
   * Enables the rewriting of input prefixing all the calls to shell api
   * methdos that are meant to return a promise with the `async` keyword.
   *
   * Allows for expressions like `db.coll1.stats().size` to work as if the method
   * call would have been synchronous.
   */
  rewriteAsync?: boolean;
};

export class Preprocessor {
  private lexicalContext = {};
  private lastExpressionCallbackFunctionName: string;
  private lexicalContextStoreVariableName: string;
  private asyncWriter: AsyncWriter;

  constructor(options: {
    lastExpressionCallbackFunctionName: string;
    lexicalContextStoreVariableName: string;
  }) {
    this.lastExpressionCallbackFunctionName = options.lastExpressionCallbackFunctionName;
    this.lexicalContextStoreVariableName = options.lexicalContextStoreVariableName;
    this.asyncWriter = new AsyncWriter({ db: types.Database }, types);
  }

  preprocess(code: string, options: PreprocessOptions = {}): string {
    let ast;
    code = wrapObjectLiteral(code);
    code = transformCommandInvocation(code, SUPPORTED_COMMANDS);
    code = `;${code}`; // prevent literals from being parsed as directives

    if (options.rewriteAsync) {
      code = this.asyncWriter.compile(code);
    }

    ast = parse(code, { allowAwaitOutsideFunction: true });
    ast = injectLastExpressionCallback(
      this.lastExpressionCallbackFunctionName, ast);

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
