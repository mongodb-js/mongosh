import { expect } from '../../../testing/chai';

import {
  preprocess
} from './preprocess';

describe('preprocess', () => {
  it('prepends previously declared variables', () => {
    expect(preprocess('code()', {
      lexicalContext: {a: 'let'},
      lastExpressionCallbackFunctionName: 'capture',
      lexicalContextStoreVariableName: 'lexcon'
    }).code).to.contain('let a = lexcon[\'a\'];');
  });

  it('prepends previously declared classes as constants', () => {
    expect(preprocess('code()', {
      lexicalContext: {a: 'class'},
      lastExpressionCallbackFunctionName: 'capture',
      lexicalContextStoreVariableName: 'lexcon'
    }).code).to.contain('const a = lexcon[\'a\'];');
  });

  it('appends new lexical context', () => {
    expect(preprocess('let b = 5', {
      lexicalContext: {a: 'let'},
      lastExpressionCallbackFunctionName: 'capture',
      lexicalContextStoreVariableName: 'lexcon'
    }).code).to.contain('lexcon[\'b\'] = b;');
  });
});
