import { expect } from '../../../testing/chai';
import { wrapObjectLiteral } from './wrap-object-literal';

describe('wrapObjectLiteral', () => {
  it('wraps an object literal so it wont be evaluated as block', () => {
    expect(wrapObjectLiteral('{x: 2}')).to.equal('({x: 2})');
  });

  it('does not wrap other code', () => {
    expect(wrapObjectLiteral('f()')).to.equal('f()');
  });

  it('wraps multiline', () => {
    expect(wrapObjectLiteral('{x:\n2}')).to.equal('({x:\n2})');
  });

  it('ignores surrounding whitespaces', () => {
    expect(wrapObjectLiteral('\n    {x: 2}  \n ')).to.equal('(\n    {x: 2}  \n )');
  });
});

