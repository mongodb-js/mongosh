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

  context('when the result is undefined', () => {
    it('returns the output', () => {
      expect(format({value: undefined})).to.equal('');
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
  context('when the result is an Error', () => {
    it('returns only name and message', () => {
      const output = stripAnsiColors(format({
        value: new Error('Something went wrong.'),
        type: 'Error'
      }));

      expect(output).to.equal('\rError: Something went wrong.');
    });
  });

  context('when the result is ShowDatabasesResult', () => {
    it('returns the help text', () => {
      const output = stripAnsiColors(format({
        value: [
          { name: 'admin', sizeOnDisk: 45056, empty: false  },
          { name: 'dxl', sizeOnDisk: 8192, empty: false  },
          { name: 'supplies', sizeOnDisk: 2236416, empty: false  },
          { name: 'test', sizeOnDisk: 5664768, empty: false  },
          { name: 'test', sizeOnDisk: 599999768000, empty: false  }
        ],
        type: 'ShowDatabasesResult'
      }));

      expect(output).to.contain('admin     45.1 kB\ndxl       8.19 kB\nsupplies  2.24 MB\ntest      5.66 MB\ntest       600 GB');
    });
  });
  context('when the result is Help', () => {
    it('returns help text', () => {
      const output = stripAnsiColors(format({
        value: {
          help: 'Shell API'
        },
        type: 'Help'
      }));

      expect(output).to.contain('Shell API');
    });

    it('returns help text, docs, name and description', () => {
      const output = stripAnsiColors(format({
        value: {
          help: 'Shell API',
          docs: 'https://docs.mongodb.com',
          attr: [{
            name: "show dbs",
            description: "list available databases"
          }]
        },
        type: 'Help'
      }));

      expect(output).to.contain('list available databases');
    });

    it('does not show name, if none is defined', () => {
      const output = stripAnsiColors(format({
        value: {
          help: 'Shell API',
          docs: 'https://docs.mongodb.com',
          attr: [{
            description: "list available databases"
          }]
        },
        type: 'Help'
      }));

      expect(output).to.not.contain('show dbs');
      expect(output).to.contain('list available databases');
    });

    it('does not show docs, if none are defined', () => {
      const output = stripAnsiColors(format({
        value: {
          help: 'Shell API',
          attr: [{
            name: "show dbs",
            description: "list available databases"
          }]
        },
        type: 'Help'
      }));

      expect(output).to.not.contain('https://docs.mongodb.com');
      expect(output).to.contain('list available databases');
    });
  });
});

