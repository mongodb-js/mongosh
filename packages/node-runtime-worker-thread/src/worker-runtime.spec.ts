import path from 'path';
import { promises as fs } from 'fs';
import { once } from 'events';
import { Worker } from 'worker_threads';
import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import { EJSON, ObjectId } from 'bson';
import { startTestServer } from '../../../testing/integration-testing-hooks';
import { Caller, cancel, close, createCaller, exposeAll, Exposed } from './rpc';
import { deserializeEvaluationResult } from './serializer';
import type { WorkerRuntime } from './worker-runtime';
import { RuntimeEvaluationResult } from '@mongosh/browser-runtime-core';

chai.use(sinonChai);

// We need a compiled version so we can import it as a worker
const workerThreadModule = fs.readFile(
  path.resolve(__dirname, '..', 'dist', 'worker-runtime.js'),
  'utf8'
);

describe('worker', () => {
  let worker: Worker;
  let caller: Caller<WorkerRuntime>;

  beforeEach(async() => {
    worker = new Worker(await workerThreadModule, { eval: true });
    await once(worker, 'message');

    caller = createCaller(
      [
        'init',
        'evaluate',
        'getCompletions',
        'getShellPrompt',
        'setEvaluationListener'
      ],
      worker
    );
    const origEvaluate = caller.evaluate;
    caller.evaluate = (code: string): Promise<any> & { cancel(): void } => {
      const promise = origEvaluate(code).then(deserializeEvaluationResult);
      (promise as any).cancel = () => {};
      return promise as Promise<any> & { cancel(): void };
    };
  });

  afterEach(async() => {
    if (worker) {
      await worker.terminate();
      worker = null;
    }

    if (caller) {
      caller[cancel]();
      caller = null;
    }
  });

  it('should throw if worker is not initialized yet', async() => {
    caller = createCaller(['evaluate'], worker);
    let err: Error;

    try {
      await caller.evaluate('1 + 1');
    } catch (e) {
      err = e;
    }

    expect(err).to.be.instanceof(Error);
    expect(err)
      .to.have.property('message')
      .match(/Can\'t call evaluate before shell runtime is initiated/);
  });

  describe('evaluate', () => {
    describe('basic shell result values', () => {
      const primitiveValues: [string, string, unknown][] = [
        ['null', 'null', null],
        ['undefined', 'undefined', undefined],
        ['boolean', '!false', true],
        ['number', '1+1', 2],
        ['string', '"hello"', 'hello']
      ];

      const everythingElse: [string, string, string | RegExp][] = [
        ['function', 'function abc() {}; abc', '[Function: abc]'],
        [
          'function with properties',
          'function def() {}; def.def = 1; def',
          '[Function: def] { def: 1 }'
        ],
        ['anonymous function', '(() => {})', /\[Function( \(anonymous\))?\]/],
        ['class constructor', 'class BCD {}; BCD', '[class BCD]'],
        [
          'class instalce',
          'class ABC { constructor() { this.abc = 1; } }; var abc = new ABC(); abc',
          'ABC { abc: 1 }'
        ],
        ['simple array', '[1, 2, 3]', '[ 1, 2, 3 ]'],
        [
          'simple array with empty items',
          '[1, 2,, 4]',
          '[ 1, 2, <1 empty item>, 4 ]'
        ],
        [
          'non-serializable array',
          '[1, 2, 3, () => {}]',
          /\[ 1, 2, 3, \[Function( \(anonymous\))?\] \]/
        ],
        [
          'simple object',
          '({str: "foo", num: 123})',
          "{ str: 'foo', num: 123 }"
        ],
        [
          'non-serializable object',
          '({str: "foo", num: 123, bool: false, fn() {}})',
          "{ str: 'foo', num: 123, bool: false, fn: [Function: fn] }"
        ],
        [
          'object with bson',
          '({min: MinKey(), max: MaxKey(), int: NumberInt("1")})',
          '{ min: MinKey(), max: MaxKey(), int: Int32(1) }'
        ],
        [
          'object with everything',
          '({ cls: class A{}, fn() {}, bsonType: NumberInt("1"), str: "123"})',
          "{ cls: [class A], fn: [Function: fn], bsonType: Int32(1), str: '123' }"
        ]
      ];

      primitiveValues.concat(everythingElse).forEach((testCase) => {
        const [testName, evalValue, printable] = testCase;

        it(testName, async() => {
          const { init, evaluate } = caller;
          await init('mongodb://nodb/', {}, { nodb: true });
          const result = await evaluate(evalValue);
          expect(result).to.have.property('printable');
          if (printable instanceof RegExp) {
            expect(result.printable).to.match(printable);
          } else {
            expect(result.printable).to.deep.equal(printable);
          }
        });
      });
    });

    describe('shell-api results', () => {
      const testServer = startTestServer('shared');
      const db = `test-db-${Date.now().toString(16)}`;

      type CommandTestRecord =
        | [string | string[], string]
        | [string | string[], string, any];

      const showCommand: CommandTestRecord[] = [
        [
          'show dbs',
          'ShowDatabasesResult',
          ({ printable }: RuntimeEvaluationResult) => {
            expect(printable.find(({ name }: any) => name === 'admin')).to.not
              .be.undefined;
          }
        ],
        ['show collections', 'ShowCollectionsResult', []],
        ['show profile', 'ShowProfileResult', { count: 0 }],
        [
          'show roles',
          'ShowResult',
          ({ printable }: RuntimeEvaluationResult) => {
            expect(printable.find(({ role }: any) => role === 'dbAdmin')).to.not
              .be.undefined;
          }
        ]
      ];

      const useCommand: CommandTestRecord[] = [
        [`use ${db}`, null, `switched to db ${db}`]
      ];

      const helpCommand: CommandTestRecord[] = [
        [
          'help',
          'Help',
          ({ printable }: RuntimeEvaluationResult) => {
            expect(printable).to.have.property('help', 'Shell Help');
            expect(printable)
              .to.have.property('docs')
              .match(/https:\/\/docs.mongodb.com/);
          }
        ]
      ];

      const cursors: CommandTestRecord[] = [
        [
          [
            `use ${db}`,
            'db.coll.insertOne({ _id: ObjectId("000000000000000000000000"), foo: 321 });',
            'db.coll.aggregate({ $match: { foo: 321 } })'
          ],
          'AggregationCursor',
          ({ printable }: RuntimeEvaluationResult) => {
            expect(printable).to.have.property('cursorHasMore', false);
            const doc = printable.documents[0];
            expect(EJSON.serialize(doc)).to.deep.equal(
              EJSON.serialize({
                _id: new ObjectId('000000000000000000000000'),
                foo: 321
              })
            );
          }
        ],
        [
          [
            `use ${db}`,
            'db.coll.insertMany([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => ({ i })))',
            'db.coll.find({ i: { $mod: [2, 0] } }, { _id: 0 })'
          ],
          'Cursor',
          {
            documents: [{ i: 2 }, { i: 4 }, { i: 6 }, { i: 8 }, { i: 10 }],
            cursorHasMore: false
          }
        ],
        [
          [
            `use ${db}`,
            "db.coll.insertMany('a'.repeat(100).split('').map(a => ({ a })))",
            'db.coll.find({}, { _id: 0 })',
            'it'
          ],
          'CursorIterationResult',
          ({ printable }: RuntimeEvaluationResult) => {
            expect(printable.documents).to.include.deep.members([{ a: 'a' }]);
          }
        ]
      ];

      const crudCommands: CommandTestRecord[] = [
        [
          [`use ${db}`, 'db.coll.insertOne({ a: "a" })'],
          'InsertOneResult',
          ({ printable }: RuntimeEvaluationResult) => {
            expect(printable).to.have.property('acknowledged', true);
            expect(printable)
              .to.have.property('insertedId')
              .instanceof(ObjectId);
          }
        ],
        [
          [`use ${db}`, 'db.coll.insertMany([{ b: "b" }, { c: "c" }])'],
          'InsertManyResult',
          ({ printable }: RuntimeEvaluationResult) => {
            expect(printable).to.have.property('acknowledged', true);
            expect(printable)
              .to.have.nested.property('insertedIds[0]')
              .instanceof(ObjectId);
          }
        ],
        [
          [
            `use ${db}`,
            'db.coll.insertOne({ a: "a" })',
            'db.coll.updateOne({ a: "a" }, { $set: { a: "b" } })'
          ],
          'UpdateResult',
          {
            acknowledged: true,
            insertedId: null,
            matchedCount: 1,
            modifiedCount: 1,
            upsertedCount: 0
          }
        ],
        [
          [
            `use ${db}`,
            'db.coll.insertOne({ a: "a" })',
            'db.coll.deleteOne({ a: "a" })'
          ],
          'DeleteResult',
          { acknowledged: true, deletedCount: 1 }
        ],
        [
          [`use ${db}`, 'db.coll.bulkWrite([{ insertOne: { d: "d" } }])'],
          'BulkWriteResult',
          ({ printable }: RuntimeEvaluationResult) => {
            expect(printable).to.have.property('acknowledged', true);
            expect(printable).to.have.property('insertedCount', 1);
            expect(printable)
              .to.have.nested.property('insertedIds[0]')
              .instanceof(ObjectId);
          }
        ]
      ];

      showCommand
        .concat(useCommand)
        .concat(helpCommand)
        .concat(cursors)
        .concat(crudCommands)
        .forEach((testCase) => {
          const [commands, resultType, printable] = testCase;

          let command: string;
          let prepare: undefined | string[];

          if (Array.isArray(commands)) {
            command = commands.pop();
            prepare = commands;
          } else {
            command = commands;
          }

          it(`"${command}" should return ${resultType} result`, async() => {
            const { init, evaluate } = caller;
            await init(await testServer.connectionString(), {}, {});

            if (prepare) {
              for (const code of prepare) {
                await evaluate(code);
              }
            }

            const result = await evaluate(command);

            expect(result).to.have.property('type', resultType);

            if (typeof printable === 'function') {
              printable(result);
            } else if (printable instanceof RegExp) {
              expect(result).to.have.property('printable').match(printable);
            } else if (typeof printable !== 'undefined') {
              expect(result)
                .to.have.property('printable')
                .deep.equal(printable);
            }
          });
        });
    });

    describe('errors', () => {
      it("should throw an error if it's thrown during evaluation", async() => {
        const { init, evaluate } = caller;

        await init('mongodb://nodb/', {}, { nodb: true });

        let err: Error;
        try {
          await evaluate('throw new TypeError("Oh no, types!")');
        } catch (e) {
          err = e;
        }

        expect(err).to.be.instanceof(Error);
        expect(err).to.have.property('name', 'TypeError');
        expect(err).to.have.property('message', 'Oh no, types!');
        expect(err)
          .to.have.property('stack')
          .matches(/TypeError: Oh no, types!/);
      });

      it("should return an error if it's returned from evaluation", async() => {
        const { init, evaluate } = caller;

        await init('mongodb://nodb/', {}, { nodb: true });

        const { printable } = await evaluate('new SyntaxError("Syntax!")');

        expect(printable).to.be.instanceof(Error);
        expect(printable).to.have.property('name', 'SyntaxError');
        expect(printable).to.have.property('message', 'Syntax!');
        expect(printable)
          .to.have.property('stack')
          .matches(/SyntaxError: Syntax!/);
      });
    });
  });

  describe('getShellPrompt', () => {
    const testServer = startTestServer('shared');

    it('should return prompt when connected to the server', async() => {
      const { init, getShellPrompt } = caller;

      await init(await testServer.connectionString());

      const result = await getShellPrompt();

      expect(result).to.match(/>/);
    });
  });

  describe('getCompletions', () => {
    const testServer = startTestServer('shared');

    it('should return completions', async() => {
      const { init, getCompletions } = caller;

      await init(await testServer.connectionString());

      const completions = await getCompletions('db.coll1.f');

      expect(completions).to.deep.contain({
        completion: 'db.coll1.find'
      });
    });
  });

  describe('evaluationListener', () => {
    const createSpiedEvaluationListener = () => {
      return {
        onPrint: sinon.spy(),
        onPrompt: sinon.spy(() => '123'),
        toggleTelemetry: sinon.spy()
      };
    };

    let exposed: Exposed<unknown>;

    afterEach(() => {
      if (exposed) {
        exposed[close]();
        exposed = null;
      }
    });

    describe('onPrint', () => {
      it('should be called when shell evaluates `print`', async() => {
        const { init, evaluate } = caller;
        const evalListener = createSpiedEvaluationListener();

        exposed = exposeAll(evalListener, worker);

        await init('mongodb://nodb/', {}, { nodb: true });
        await evaluate('print("Hi!")');

        expect(evalListener.onPrint).to.have.been.calledWith([
          { printable: 'Hi!', rawValue: 'Hi!', type: null }
        ]);
      });
    });

    describe('onPrompt', () => {
      it('should be called when shell evaluates `passwordPrompt`', async() => {
        const { init, evaluate } = caller;
        const evalListener = createSpiedEvaluationListener();

        exposed = exposeAll(evalListener, worker);

        await init('mongodb://nodb/', {}, { nodb: true });
        const password = await evaluate('passwordPrompt()');

        expect(evalListener.onPrompt).to.have.been.called;
        expect(password.printable).to.equal('123');
      });
    });

    describe('toggleTelemetry', () => {
      it('should be called when shell evaluates `enableTelemetry` or `disableTelemetry`', async() => {
        const { init, evaluate } = caller;
        const evalListener = createSpiedEvaluationListener();

        exposed = exposeAll(evalListener, worker);

        await init('mongodb://nodb/', {}, { nodb: true });

        await evaluate('enableTelemetry()');
        expect(evalListener.toggleTelemetry).to.have.been.calledWith(true);

        await evaluate('disableTelemetry()');
        expect(evalListener.toggleTelemetry).to.have.been.calledWith(false);
      });
    });
  });
});
