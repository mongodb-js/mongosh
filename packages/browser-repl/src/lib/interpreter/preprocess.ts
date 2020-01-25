import { parse } from '@babel/parser';
import generate from '@babel/generator';

import {
  injectLastExpressionCallback
} from './preprocessors/inject-last-expression-callback';

import {
  wrapObjectLiteral
} from './preprocessors/wrap-object-literal';

import {
  wrapInAsyncFunctionCall
} from './preprocessors/wrap-in-async-function-call';

import {
  saveAndRestoreLexicalContext,
  LexicalContext
} from './preprocessors/save-and-restore-lexical-context';

interface PreprocessOptions {
  lexicalContext: LexicalContext;
  lastExpressionCallbackFunctionName: string;
  lexicalContextStoreVariableName: string;
}

interface PreprocessRetval {
  code: string;
  lexicalContext: LexicalContext;
}

export function preprocess(code: string, options: PreprocessOptions): PreprocessRetval {
  const {
    lexicalContext = {},
    lastExpressionCallbackFunctionName,
    lexicalContextStoreVariableName,
  } = options;


  let ast;
  ast = parse(wrapObjectLiteral(code), {allowAwaitOutsideFunction: true});
  ast = injectLastExpressionCallback(lastExpressionCallbackFunctionName, ast);

  const {
    ast: newAst,
    lexicalContext: newLexicalContext
  } = saveAndRestoreLexicalContext(ast, {
    lexicalContext,
    lexicalContextStoreVariableName
  });

  ast = newAst;
  ast = wrapInAsyncFunctionCall(ast);

  const newCode = generate(ast).code;

  return {
    code: newCode,
    lexicalContext: newLexicalContext
  };
}
