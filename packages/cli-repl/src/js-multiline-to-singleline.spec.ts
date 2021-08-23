import { expect } from 'chai';
import { makeMultilineJSIntoSingleLine as toSingleLine } from './js-multiline-to-singleline';

describe('makeMultilineJSIntoSingleLine', () => {
  it('handles simple input well', () => {
    expect(toSingleLine('1\n2\n3\n')).to.equal('1; 2; 3');
    expect(toSingleLine('1\n2\n3;')).to.equal('1; 2; 3;');
  });

  it('performs ASI as necessary', () => {
    // Note that without ASI the semantics here would change
    expect(toSingleLine('() => { return\n42\n }')).to.equal('() => {return; 42; }');
  });

  it('treats comments propertly', () => {
    expect(toSingleLine('a // comment\n b')).to.equal('a; /* comment*/ b');
    expect(toSingleLine('a /* comment*/\n b')).to.equal('a; /* comment*/ b');
  });
});
