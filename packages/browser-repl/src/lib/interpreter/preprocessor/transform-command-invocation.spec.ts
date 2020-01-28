import { expect } from '../../../../testing/chai';
import { transformCommandInvocation } from './transform-command-invocation';

describe('transformCommandInvocation', () => {
  it('transforms a command from code if is the first token', () => {
    expect(transformCommandInvocation('help', ['help'])).to.equal('help()');
    expect(transformCommandInvocation('  help', ['help'])).to.equal('help()');
  });

  it('does not transform command from code if not first token', () => {
    expect(transformCommandInvocation('; help', ['help'])).to.equal('; help');
  });

  it('does not transform command from code if command is not available', () => {
    expect(transformCommandInvocation('help', [])).to.equal('help');
  });

  it('transforms arguments', () => {
    expect(transformCommandInvocation('show collections', ['show']))
      .to.equal('show("collections")');
  });
});
