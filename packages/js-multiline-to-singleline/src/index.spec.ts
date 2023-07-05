import { expect } from 'chai';
import { makeMultilineJSIntoSingleLine as toSingleLine } from './';

describe('makeMultilineJSIntoSingleLine', function () {
  it('handles simple input well', function () {
    expect(toSingleLine('1\n2\n3\n')).to.equal('1; 2; 3');
    expect(toSingleLine('1\n2\n3;')).to.equal('1; 2; 3;');
  });

  it('performs ASI as necessary', function () {
    // Note that without ASI the semantics here would change
    expect(toSingleLine('() => { return\n42\n }')).to.equal(
      '() => {return; 42; }'
    );
  });

  it('treats comments properly', function () {
    expect(toSingleLine('a // comment\n b')).to.equal('a; /* comment*/ b');
    expect(toSingleLine('a /* comment*/\n b')).to.equal('a; /* comment*/ b');
  });

  it('keeps invalid code as-is', function () {
    expect(toSingleLine('---\n---')).to.equal('--- ---');
  });

  it('treats multiline template strings properly', function () {
    for (const original of [
      '(`1\\t2`);',
      '(`1\\t\n2`);',
      '(`1\\t\r\n2`);',
      '(`1\\t\r2`);',
      '(`1\\t\\nn2`);',
      '(`1${\nnull\n}\n2`);',
      '(String.raw `1\\t2`);',
      '(String.raw `1\\t\n2`);',
      '(String.raw `1\\t\\n2`);',
      '(String.raw `1\\t\\r\\n2`);',
      '(String.raw `1\\t\\r2`);',
      '(String.raw `1${\nnull\n}\n2`);',
      '(String.raw `1${\nnull\n}\\n2`);',
    ]) {
      const singleLine = toSingleLine(original);
      expect(singleLine).to.not.match(/[\r\n]/); // singleline
      expect(eval(singleLine)).to.equal(eval(original)); // same behavior
    }
  });
});
