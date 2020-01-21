import { expect } from '../../../testing/chai';

import { parse } from '@babel/parser';
import generate from '@babel/generator';

import { injectLastExpressionCallback } from './inject-last-expression-callback';

describe('injectLastExpressionCallback', () => {
  const testInjectLastExpressionCallback = (code): string => {
    const ast = injectLastExpressionCallback('mongodbEvalCapture', parse(code));
    return generate(ast).code;
  };

  it('captures literals', () => {
    expect(testInjectLastExpressionCallback('5'))
      .to.equal('mongodbEvalCapture(5);');
  });

  it('captures functions', () => {
    expect(testInjectLastExpressionCallback('f()'))
      .to.equal('mongodbEvalCapture(f());');
  });

  it('captures global assignments', () => {
    expect(testInjectLastExpressionCallback('x = 5'))
      .to.equal('mongodbEvalCapture(x = 5);');
  });

  it('captures undefined if the last statement is not an expression', () => {
    expect(testInjectLastExpressionCallback('let x = 5'))
      .to.equal('let x = 5;\nmongodbEvalCapture();');
  });

  it('captures undefined the program is empty', () => {
    expect(testInjectLastExpressionCallback(''))
      .to.equal('mongodbEvalCapture();');
  });
});
