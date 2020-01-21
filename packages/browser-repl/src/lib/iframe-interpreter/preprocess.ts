/* eslint-disable @typescript-eslint/no-use-before-define */
import { parse } from '@babel/parser';
import generate from '@babel/generator';
import {
  collectTopLevelLexicalContext,
  LexicalContext
} from './preprocessors/collect-top-level-lexical-context';

import {
  injectLastExpressionCallback
} from './preprocessors/inject-last-expression-callback';
import {
  wrapObjectLiteral
} from './preprocessors/wrap-object-literal';

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

  let preamble = '';

  for (const [name, kind] of Object.entries(lexicalContext)) {
    preamble += `${kind === 'class' ? 'const' : kind} ${name} = ` +
      `${lexicalContextStoreVariableName}['${name}'];`;
  }

  const ast = parse(wrapObjectLiteral(code));
  const newLexicalContext = collectTopLevelLexicalContext(ast);
  const {code: newCode} = generate(
    injectLastExpressionCallback(lastExpressionCallbackFunctionName, ast)
  );
  let postamble = '';

  for (const [name] of Object.entries(newLexicalContext)) {
    postamble += `${lexicalContextStoreVariableName}['${name}'] = ${name};`;
  }

  return {
    code: preamble + newCode + ';' + postamble,
    lexicalContext: {...lexicalContext, ...newLexicalContext}
  };
}
