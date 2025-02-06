/* eslint no-control-regex: 0 */
import type { FormatOptions } from './format-output';
import { formatOutput } from './format-output';
import { expect } from 'chai';

for (const colors of [false, true]) {
  describe(`formatOutput with 'colors' set to ${colors}`, function () {
    const format = (
      value: { value: unknown; type?: string | null },
      opts: Partial<FormatOptions> = {}
    ): string => formatOutput(value, { colors, ...opts });
    const stripAnsiColors = colors
      ? (str: string): string => str.replace(/\x1B[[(?);]{0,2}(;?\d)*./g, '')
      : (str: string): string => str;

    context('when the result is a string', function () {
      it('returns the output', function () {
        expect(format({ value: 'test' })).to.equal('test');
      });
    });

    context(
      'when the result is a string that only contains simple special characters',
      function () {
        it('returns the output', function () {
          expect(format({ value: 'test\n\ttest' })).to.equal('test\n\ttest');
        });
      }
    );

    context(
      'when the result is a string that contains special characters',
      function () {
        it('returns the output', function () {
          expect(stripAnsiColors(format({ value: 'test\bfooo' }))).to.equal(
            "'test\\bfooo'"
          );
        });
        it('returns the raw value if control characters are allowed', function () {
          expect(
            format({ value: 'test\bfooo' }, { allowControlCharacters: true })
          ).to.equal('test\bfooo');
        });
      }
    );

    context('when the result is undefined', function () {
      it('returns the output', function () {
        expect(format({ value: undefined })).to.equal('');
      });
    });

    context('when the result is an object', function () {
      it('returns the inspection', function () {
        expect(format({ value: 2 })).to.include('2');
      });
    });

    context('when the result is a date', function () {
      it('returns the inspection', function () {
        expect(format({ value: new Date(1234567890000) })).to.include(
          "ISODate('2009-02-13T23:31:30.000Z')"
        );
        expect(format({ value: new Date(NaN) })).to.include('Invalid Date');
      });
    });

    context('when the result is a Cursor', function () {
      context('when the Cursor is not empty', function () {
        it('returns the inspection', function () {
          const output = stripAnsiColors(
            format({
              value: {
                documents: [{ doc: 1 }, { doc: 2 }],
                cursorHasMore: true,
              },
              type: 'Cursor',
            })
          );

          expect(output).to.include('doc: 1');
          expect(output).to.include('doc: 2');
        });
      });

      context('when the Cursor is empty', function () {
        it('returns an empty string', function () {
          const output = stripAnsiColors(
            format({
              value: { documents: [], cursorHasMore: false },
              type: 'Cursor',
            })
          );

          expect(output).to.equal('');
        });
      });
    });

    context('when the result is a CursorIterationResult', function () {
      context('when the CursorIterationResult is not empty', function () {
        it('returns the inspection', function () {
          const output = stripAnsiColors(
            format({
              value: {
                documents: [{ doc: 1 }, { doc: 2 }],
                cursorHasMore: true,
              },
              type: 'CursorIterationResult',
            })
          );

          expect(output).to.include('doc: 1');
          expect(output).to.include('doc: 2');
          expect(output).to.include('Type "it" for more');
        });
      });

      context(
        'when the CursorIterationResult is not empty but exhausted',
        function () {
          it('returns the inspection', function () {
            const output = stripAnsiColors(
              format({
                value: {
                  documents: [{ doc: 1 }, { doc: 2 }],
                  cursorHasMore: false,
                },
                type: 'CursorIterationResult',
              })
            );

            expect(output).to.include('doc: 1');
            expect(output).to.include('doc: 2');
            expect(output).not.to.include('Type "it" for more');
          });
        }
      );

      context('when the CursorIterationResult is empty', function () {
        it('returns "no cursor"', function () {
          const output = stripAnsiColors(
            format({
              value: { documents: [], cursorHasMore: false },
              type: 'CursorIterationResult',
            })
          );

          expect(output).to.equal('no cursor');
        });
      });

      context(
        'when the CursorIterationResult contains deeply nested values',
        function () {
          it('returns the deeply nested values', function () {
            const output = stripAnsiColors(
              format({
                value: {
                  documents: [{ nested: [[[[[1]]]]] }],
                  cursorHasMore: false,
                },
                type: 'CursorIterationResult',
              })
            );

            expect(output.replace(/\s/g, '')).to.equal(
              '[{nested:[[[[[1]]]]]}]'
            );
          });
        }
      );
    });

    context('when the result is an Error', function () {
      it('returns only name and message - generic Error', function () {
        const output = stripAnsiColors(
          format({
            value: new Error('Something went wrong.'),
            type: 'Error',
          })
        );

        expect(output).to.equal('\rError: Something went wrong.');
      });

      it('returns name, codeName and message - MongoError', function () {
        class MongoError extends Error {
          code: number;
          codeName: string;
          constructor(
            message: string,
            code: number,
            codeName: string,
            name: string
          ) {
            super(message);
            this.code = code;
            this.codeName = codeName;
            this.name = name;
          }
        }

        const output = stripAnsiColors(
          format({
            value: new MongoError(
              'Something went wrong.',
              123,
              'ErrorCode',
              'MongoError'
            ),
            type: 'Error',
          })
        );

        expect(output).to.equal(
          '\rMongoError[ErrorCode]: Something went wrong.'
        );
      });

      it('provides errInfo information if present', function () {
        const err = Object.assign(new Error('Something went wrong.'), {
          errInfo: { commandThatFailed: 'doSomething' },
        });
        const output = stripAnsiColors(
          format({
            value: err,
            type: 'Error',
          })
        );

        expect(output).to.equal(
          "\rError: Something went wrong.\nAdditional information: { commandThatFailed: 'doSomething' }"
        );
      });

      it('provides result information if present', function () {
        const err = Object.assign(new Error('Something went wrong.'), {
          result: { nInserted: 0 },
        });
        const output = stripAnsiColors(
          format({
            value: err,
            type: 'Error',
          })
        );

        expect(output).to.equal(
          '\rError: Something went wrong.\nResult: { nInserted: 0 }'
        );
      });

      it('provides violation info if present', function () {
        const err = Object.assign(new Error('Something went wrong.'), {
          violations: [{ ids: [1, { deeply: { nested: [[['something']]] } }] }],
        });
        const output = stripAnsiColors(
          format({
            value: err,
            type: 'Error',
          })
        );

        expect(output.replace(/\s/g, '')).to.equal(
          "Error:Somethingwentwrong.Violations:[{ids:[1,{deeply:{nested:[[['something']]]}}]}]"
        );
      });

      it('provides cause info if present', function () {
        // @ts-expect-error Need to eventually update types for built-in JS
        const err = new Error('Something went wrong', {
          cause: new Error('Something else went wrong'),
        });
        const output = stripAnsiColors(
          format({
            value: err,
            type: 'Error',
          })
        );

        expect(output).to.equal(
          '\rError: Something went wrong\nCaused by: \n\rError: Something else went wrong'
        );
      });

      it('escapes the message name if the error can be server-generated', function () {
        const output = stripAnsiColors(
          format({
            value: Object.assign(new Error('foo\bbar.'), {
              name: 'MongoServerError',
            }),
            type: 'Error',
          })
        );

        expect(output).to.equal("\rMongoServerError: 'foo\\bbar.'");
      });

      it('does not escape the message name if the error is a generic one', function () {
        const output = stripAnsiColors(
          format({
            value: Object.assign(new Error('foo\bbar.'), { name: 'FooError' }),
            type: 'Error',
          })
        );

        expect(output).to.equal('\rFooError: foo\bbar.');
      });
    });

    context('when the result is ShowDatabasesResult', function () {
      it('returns the database list', function () {
        const output = stripAnsiColors(
          format({
            value: [
              { name: 'admin', sizeOnDisk: 45056, empty: false },
              { name: 'dxl', sizeOnDisk: 8192, empty: false },
              { name: 'supplies', sizeOnDisk: 2236416, empty: false },
              { name: 'test', sizeOnDisk: 5664768, empty: false },
              { name: 'test', sizeOnDisk: 599999768000, empty: false },
              { name: 'ab\bdef', sizeOnDisk: 1234, empty: false },
            ],
            type: 'ShowDatabasesResult',
          })
        );

        expect(output.replace(/ +/g, ' ')).to.equal(
          `
admin 44.00 KiB
dxl 8.00 KiB
supplies 2.13 MiB
test 5.40 MiB
test 558.79 GiB
'ab\\bdef' 1.21 KiB
`.trim()
        );
      });
    });

    context('when the result is ShowCollectionsResult', function () {
      it('returns the collections list', function () {
        const output = stripAnsiColors(
          format({
            value: [
              { name: 'nested_documents', badge: '' },
              { name: 'decimal128', badge: '' },
              { name: 'coll', badge: '' },
              { name: 'people_imported', badge: '[view]' },
              { name: 'cats', badge: '[time-series]' },
              { name: 'cats\bcats', badge: '' },
            ],
            type: 'ShowCollectionsResult',
          })
        );

        expect(output.replace(/ +/g, ' ')).to.equal(
          'nested_documents\n' +
            'decimal128\n' +
            'coll\n' +
            'people_imported [view]\n' +
            'cats [time-series]\n' +
            "'cats\\bcats'"
        );
      });
    });

    context('when the result is StatsResult', function () {
      it('returns the --- separated list', function () {
        const output = stripAnsiColors(
          format({
            value: {
              c1: { metadata: 1 },
              c2: { metadata: 2 },
            },
            type: 'StatsResult',
          })
        );

        expect(output).to.contain(
          'c1\n{ metadata: 1 }\n---\nc2\n{ metadata: 2 }'
        );
      });
      it('accounts for special characters and escapes them', function () {
        const output = stripAnsiColors(
          format({
            value: {
              ['c\b1']: { metadata: 1 },
              c2: { metadata: 2 },
            },
            type: 'StatsResult',
          })
        );

        expect(output).to.contain(
          "'c\\b1'\n{ metadata: 1 }\n---\nc2\n{ metadata: 2 }"
        );
      });
    });

    context('when the result is ListCommandsResult', function () {
      it('returns the formatted list', function () {
        const output = stripAnsiColors(
          format({
            value: {
              c1: { metadata1: true, help: 'help1' },
              c2: {
                metadata2: true,
                help: 'help2',
                apiVersions: [],
                deprecatedApiVersions: [],
              },
              c3: {
                metadata2: true,
                help: 'help2',
                apiVersions: ['1'],
                deprecatedApiVersions: ['0'],
              },
            },
            type: 'ListCommandsResult',
          })
        );

        expect(output).to.contain(
          'c1:  metadata1\nhelp1\n\nc2:  metadata2\nhelp2'
        );
      });
    });

    context('when the result is a ShowProfileResult', function () {
      it('returns the warning if empty', function () {
        const output = stripAnsiColors(
          format({
            value: {
              count: 0,
            },
            type: 'ShowProfileResult',
          })
        );

        expect(output).to.contain('db.system.profile is empty');
      });
      it('returns the formatted list if not empty', function () {
        const output = stripAnsiColors(
          format({
            value: {
              count: 2,
              result: [
                {
                  op: 'command',
                  ns: 'test.system.profile',
                  command: {
                    aggregate: 'system.profile',
                    pipeline: [
                      { $match: {} },
                      { $group: { _id: 1, n: { $sum: 1 } } },
                    ],
                    cursor: {},
                    lsid: { id: 'bin' },
                    $db: 'test',
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
                    Mutex: { acquireCount: { r: 2 } },
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
                  user: '',
                },
              ],
            },
            type: 'ShowProfileResult',
          })
        );
        expect(output).to.contain('command\ttest.system.profile 1ms ts');
        expect(output).to.contain("aggregate: 'system.profile',");
      });
    });

    context('when the result is Help', function () {
      it('returns help text', function () {
        const output = stripAnsiColors(
          format({
            value: {
              help: 'Shell API',
            },
            type: 'Help',
          })
        );

        expect(output).to.contain('Shell API');
      });

      it('returns help text, docs, name and description', function () {
        const output = stripAnsiColors(
          format({
            value: {
              help: 'Shell API',
              docs: 'https://docs.mongodb.com',
              attr: [
                {
                  name: 'show dbs',
                  description: 'list available databases',
                },
              ],
            },
            type: 'Help',
          })
        );

        expect(output).to.contain('list available databases');
      });

      it('does not show name, if none is defined', function () {
        const output = stripAnsiColors(
          format({
            value: {
              help: 'Shell API',
              docs: 'https://docs.mongodb.com',
              attr: [
                {
                  description: 'list available databases',
                },
              ],
            },
            type: 'Help',
          })
        );

        expect(output).to.not.contain('show dbs');
        expect(output).to.contain('list available databases');
      });

      it('does not show docs, if none are defined', function () {
        const output = stripAnsiColors(
          format({
            value: {
              help: 'Shell API',
              attr: [
                {
                  name: 'show dbs',
                  description: 'list available databases',
                },
              ],
            },
            type: 'Help',
          })
        );

        expect(output).to.not.contain('https://docs.mongodb.com');
        expect(output).to.contain('list available databases');
      });

      it('handles multi-line descriptions', function () {
        const output = stripAnsiColors(
          format({
            value: {
              help: 'Shell API',
              attr: [
                {
                  name: 'show dbs',
                  description: 'list available\ndatabases\n\nwith line breaks',
                },
              ],
            },
            type: 'Help',
          })
        );

        expect(output).to.equal(`
  Shell API:

    show dbs                                   list available
                                               databases

                                               with line breaks
`);
      });
    });

    context(
      'when the result is ExplainOutput or ExplainableCursor',
      function () {
        for (const type of ['ExplainOutput', 'ExplainableCursor']) {
          it(`returns output with large depth (${type})`, function () {
            const value: Record<string, unknown> = {};
            let it = value;
            for (let i = 0; i <= 20; i++) {
              it = it[`level${i}`] = {};
            }
            const output = stripAnsiColors(
              format({
                value,
                type,
              })
            );

            expect(output).to.contain('level20');
          });
        }
      }
    );

    context('when the result is ShowBannerResult', function () {
      it('returns a formatted banner', function () {
        const output = stripAnsiColors(
          format({
            value: {
              header: 'Header',
              content: 'foo\nbar\n',
            },
            type: 'ShowBannerResult',
          })
        );

        expect(output).to.equal('------\n   Header\n   foo\n   bar\n------\n');
      });
    });
    it('returns a formatted banner with escaped special characters', function () {
      const output = stripAnsiColors(
        format({
          value: {
            header: 'Heade\br',
            content: 'foo\bbar\n',
          },
          type: 'ShowBannerResult',
        })
      );

      expect(output).to.equal(
        "------\n   'Heade\\br'\n   'foo\\bbar\\n'\n------\n"
      );
    });
  });
}
