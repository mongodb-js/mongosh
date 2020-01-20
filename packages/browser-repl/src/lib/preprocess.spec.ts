import { expect } from '../../testing/chai';

import {
  preprocess
} from './preprocess';

describe('preprocess', () => {
  it('prepends previously declared variables', () => {
    expect(preprocess('code()', {
      lexicalContext: {a: 'let'},
      lastExpressionCallbackFunctionName: 'capture'
    }).code).to.contain('let a = window[\'a\'];');
  });

  it('appends new lexical context', () => {
    expect(preprocess('let b = 5', {
      lexicalContext: {a: 'let'},
      lastExpressionCallbackFunctionName: 'capture'
    }).code).to.contain('window[\'b\'] = b;');
  });
});
