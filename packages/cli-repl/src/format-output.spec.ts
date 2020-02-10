import format from './format-output';
import { expect } from 'chai';

function stripAnsiColors(str) {
  return str.replace(/\x1B[[(?);]{0,2}(;?\d)*./g, '');
};

describe('formatOutput', () => {
  context('when the result is a string', () => {
    it('returns the output', () => {
      expect(format({value: 'test'})).to.equal('test');
    });
  });

  context('when the result is an object', () => {
    it('returns the inspection', () => {
      expect(format({value: 2})).to.include('2');
    });
  });

  context('when the result is a Cursor', () => {
    context('when the Cursor is not empty', () => {
      it('returns the inspection', () => {
        const output = stripAnsiColors(format({
          value: [{doc: 1}, {doc: 2}],
          type: 'Cursor'
        }));

        expect(output).to.include('doc: 1');
        expect(output).to.include('doc: 2');
      });
    });

    context('when the Cursor is empty', () => {
      it('returns an empty string', () => {
        const output = stripAnsiColors(format({
          value: [],
          type: 'Cursor'
        }));

        expect(output).to.equal('');
      });
    });
  });

  context('when the result is a CursorIterationResult', () => {
    context('when the CursorIterationResult is not empty', () => {
      it('returns the inspection', () => {
        const output = stripAnsiColors(format({
          value: [{doc: 1}, {doc: 2}],
          type: 'CursorIterationResult'
        }));

        expect(output).to.include('doc: 1');
        expect(output).to.include('doc: 2');
      });
    });

    context('when the CursorIterationResult is empty', () => {
      it('returns "no cursor"', () => {
        const output = stripAnsiColors(format({
          value: [],
          type: 'CursorIterationResult'
        }));

        expect(output).to.equal('no cursor');
      });
    });
  });

  context('when the result is an Help', () => {
    it('returns the help text', () => {
      const output = stripAnsiColors(format({
        value: {
          help: 'Some help text'
        },
        type: 'Help'
      }));

      expect(output).to.contain('Some help text');
    });
  });
});

