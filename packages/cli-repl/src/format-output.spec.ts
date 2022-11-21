/* eslint no-control-regex: 0 */
import formatRaw from './format-output';
import { expect } from 'chai';

for (const colors of [ false, true ]) {
  describe(`formatOutput with 'colors' set to ${colors}`, () => {
    const format = (value: any): string => formatRaw(value, { colors });
    const stripAnsiColors = colors ?
      (str: string): string => str.replace(/\x1B[[(?);]{0,2}(;?\d)*./g, '') :
      (str: string): string => str;

    context('when the result is a string', () => {
      it('returns the output', () => {
        expect(format({ value: 'test' })).to.equal('test');
      });
    });

    context('when the result is undefined', () => {
      it('returns the output', () => {
        expect(format({ value: undefined })).to.equal('');
      });
    });

    context('when the result is an object', () => {
      it('returns the inspection', () => {
        expect(format({ value: 2 })).to.include('2');
      });
    });

    context('when the result is a date', () => {
      it('returns the inspection', () => {
        expect(format({ value: new Date(1234567890000) })).to.include('ISODate("2009-02-13T23:31:30.000Z")');
        expect(format({ value: new Date(NaN) })).to.include('Invalid Date');
      });
    });

    context('when the result is a Cursor', () => {
      context('when the Cursor is not empty', () => {
        it('returns the inspection', () => {
          const output = stripAnsiColors(
            format({
              value: { documents: [{ doc: 1 }, { doc: 2 }], cursorHasMore: true },
              type: 'Cursor'
            })
          );

          expect(output).to.include('doc: 1');
          expect(output).to.include('doc: 2');
        });
      });

      context('when the Cursor is empty', () => {
        it('returns an empty string', () => {
          const output = stripAnsiColors(
            format({
              value: { documents: [], cursorHasMore: false },
              type: 'Cursor'
            })
          );

          expect(output).to.equal('');
        });
      });
    });

    context('when the result is a CursorIterationResult', () => {
      context('when the CursorIterationResult is not empty', () => {
        it('returns the inspection', () => {
          const output = stripAnsiColors(
            format({
              value: { documents: [{ doc: 1 }, { doc: 2 }], cursorHasMore: true },
              type: 'CursorIterationResult'
            })
          );

          expect(output).to.include('doc: 1');
          expect(output).to.include('doc: 2');
          expect(output).to.include('Type "it" for more');
        });
      });

      context('when the CursorIterationResult is not empty but exhausted', () => {
        it('returns the inspection', () => {
          const output = stripAnsiColors(
            format({
              value: { documents: [{ doc: 1 }, { doc: 2 }], cursorHasMore: false },
              type: 'CursorIterationResult'
            })
          );

          expect(output).to.include('doc: 1');
          expect(output).to.include('doc: 2');
          expect(output).not.to.include('Type "it" for more');
        });
      });

      context('when the CursorIterationResult is empty', () => {
        it('returns "no cursor"', () => {
          const output = stripAnsiColors(format({
            value: { documents: [], cursorHasMore: false },
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

      it('provides errInfo information if present', () => {
        const err = Object.assign(new Error('Something went wrong.'), {
          errInfo: { commandThatFailed: 'doSomething' }
        });
        const output = stripAnsiColors(format({
          value: err,
          type: 'Error'
        }));

        expect(output).to.equal(
          "\rError: Something went wrong.\nAdditional information: { commandThatFailed: 'doSomething' }");
      });

      it('provides result information if present', () => {
        const err = Object.assign(new Error('Something went wrong.'), {
          result: { nInserted: 0 }
        });
        const output = stripAnsiColors(format({
          value: err,
          type: 'Error'
        }));

        expect(output).to.equal(
          '\rError: Something went wrong.\nResult: { nInserted: 0 }');
      });

      it('provides violation info if present', () => {
        const err = Object.assign(new Error('Something went wrong.'), {
          violations: [{ ids: [1] }]
        });
        const output = stripAnsiColors(format({
          value: err,
          type: 'Error'
        }));

        expect(output).to.equal(
          '\rError: Something went wrong.\nViolations: [ { ids: [ 1 ] } ]');
      });
    });

    context('when the result is ShowDatabasesResult', () => {
      it('returns the help text', () => {
        const output = stripAnsiColors(format({
          value: [
            { name: 'admin', sizeOnDisk: 45056, empty: false },
            { name: 'dxl', sizeOnDisk: 8192, empty: false },
            { name: 'supplies', sizeOnDisk: 2236416, empty: false },
            { name: 'test', sizeOnDisk: 5664768, empty: false },
            { name: 'test', sizeOnDisk: 599999768000, empty: false }
          ],
          type: 'ShowDatabasesResult'
        }));

        expect(output).to.equal(`
admin      44.00 KiB
dxl         8.00 KiB
supplies    2.13 MiB
test        5.40 MiB
test      558.79 GiB
`.trim());
      });
    });

    context('when the result is ShowCollectionsResult', () => {
      it('returns the help text', () => {
        const output = stripAnsiColors(format({
          value: [
            { name: 'nested_documents', badge: '' },
            { name: 'decimal128', badge: '' },
            { name: 'coll', badge: '' },
            { name: 'people_imported', badge: '[view]' },
            { name: 'cats', badge: '[time-series]' }
          ],
          type: 'ShowCollectionsResult'
        }));

        expect(output).to.equal('nested_documents\ndecimal128\ncoll\npeople_imported   [view]\ncats              [time-series]');
      });
    });

    context('when the result is StatsResult', () => {
      it('returns the --- separated list', () => {
        const output = stripAnsiColors(format({
          value: {
            c1: { metadata: 1 },
            c2: { metadata: 2 }
          },
          type: 'StatsResult'
        }));

        expect(output).to.contain('c1\n{ metadata: 1 }\n---\nc2\n{ metadata: 2 }');
      });
    });

    context('when the result is ListCommandsResult', () => {
      it('returns the formatted list', () => {
        const output = stripAnsiColors(format({
          value: {
            c1: { metadata1: 1, help: 'help1' },
            c2: { metadata2: 2, help: 'help2' }
          },
          type: 'ListCommandsResult'
        }));

        expect(output).to.contain('c1:  metadata1\nhelp1\n\nc2:  metadata2\nhelp2');
      });
    });

    context('when the result is a ShowProfileResult', () => {
      it('returns the warning if empty', () => {
        const output = stripAnsiColors(format({
          value: {
            count: 0
          },
          type: 'ShowProfileResult'
        }));

        expect(output).to.contain('db.system.profile is empty');
      });
      it('returns the formatted list if not empty', () => {
        const output = stripAnsiColors(format({
          value: {
            count: 2,
            result: [
              {
                op: 'command',
                ns: 'test.system.profile',
                command: {
                  aggregate: 'system.profile',
                  pipeline: [
                    { '$match': {} },
                    { '$group': { _id: 1, n: { '$sum': 1 } } }
                  ],
                  cursor: {},
                  lsid: { id: 'bin' },
                  '$db': 'test'
                },
                keysExamined: 0,
                docsExamined: 6,
                cursorExhausted: true,
                numYield: 0,
                nreturned: 1,
                locks: {
                  ReplicationStateTransition: { acquireCount: { w: 2 } },
                  Global: { acquireCount: { r: 2 } },
                  Database: { acquireCount: { r: 2 } },
                  Collection: { acquireCount: { r: 2 } },
                  Mutex: { acquireCount: { r: 2 } }
                },
                flowControl: {},
                responseLength: 132,
                protocol: 'op_msg',
                millis: 1,
                planSummary: 'COLLSCAN',
                ts: 'ts',
                client: '127.0.0.1',
                appName: 'mongosh 0.2.2',
                allUsers: [],
                user: ''
              }
            ]
          },
          type: 'ShowProfileResult'
        }));
        expect(output).to.contain('command\ttest.system.profile 1ms ts');
        expect(output).to.contain('aggregate: \'system.profile\',');
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
              name: 'show dbs',
              description: 'list available databases'
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
              description: 'list available databases'
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
              name: 'show dbs',
              description: 'list available databases'
            }]
          },
          type: 'Help'
        }));

        expect(output).to.not.contain('https://docs.mongodb.com');
        expect(output).to.contain('list available databases');
      });

      it('handles multi-line descriptions', () => {
        const output = stripAnsiColors(format({
          value: {
            help: 'Shell API',
            attr: [{
              name: 'show dbs',
              description: 'list available\ndatabases\n\nwith line breaks'
            }]
          },
          type: 'Help'
        }));

        expect(output).to.equal(`
  Shell API:

    show dbs                                   list available
                                               databases

                                               with line breaks
`);
      });
    });

    context('when the result is ExplainOutput or ExplainableCursor', () => {
      for (const type of ['ExplainOutput', 'ExplainableCursor']) {
        it(`returns output with large depth (${type})`, () => {
          const value = {};
          let it = value;
          for (let i = 0; i <= 20; i++) {
            it = it[`level${i}`] = {};
          }
          const output = stripAnsiColors(format({
            value,
            type
          }));

          expect(output).to.contain('level20');
        });
      }
    });

    context('when the result is ShowBannerResult', () => {
      it('returns a formatted banner', () => {
        const output = stripAnsiColors(format({
          value: {
            header: 'Header',
            content: 'foo\nbar\n'
          },
          type: 'ShowBannerResult'
        }));

        expect(output).to.equal('------\n   Header\n   foo\n   bar\n------\n');
      });
    });
  });
}
