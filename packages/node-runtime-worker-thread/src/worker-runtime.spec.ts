import path from 'path';
import { once } from 'events';
import Worker from 'web-worker';
import * as chai from 'chai';
import { expect } from 'chai';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import {
  Binary,
  BSONRegExp,
  BSONSymbol,
  Code,
  DBRef,
  Decimal128,
  Double,
  EJSON,
  Int32,
  Long,
  MaxKey,
  MinKey,
  ObjectId,
  Timestamp,
  UUID,
} from 'bson';
import { startSharedTestServer } from '@mongosh/testing';
import type { Caller, Exposed } from './rpc';
import { cancel, close, createCaller, exposeAll } from './rpc';
import { deserializeEvaluationResult } from './serializer';
import type { WorkerRuntime } from './worker-runtime';
import type { RuntimeEvaluationResult } from '@mongosh/browser-runtime-core';
import { interrupt } from 'interruptor';
import { dummyOptions } from './index.spec';
import { pathToFileURL } from 'url';

chai.use(sinonChai);

// We need a compiled version so we can import it as a worker
const workerThreadModule = path.resolve(
  __dirname,
  '..',
  'dist',
  'worker-runtime.js'
);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// We can't user Buffer.from for the binary data creation
// as it is not supported, so we use Uint8Array.from
// and Binary.createFromBase64.
const allBsonTypesDocString = `{
  _id: new ObjectId('642d766b7300158b1f22e972'),
  double: new Double(1.2), // Double, 1, double
  primitiveDouble: 1.2,
  doubleThatIsAlsoAnInteger: new Double(1), // Double, 1, double
  string: 'Hello, world!', // String, 2, string
  object: { key: 'value' }, // Object, 3, object
  array: [1, 2, 3], // Array, 4, array
  binData: new Binary(Uint8Array.from([1, 2, 3])), // Binary data, 5, binData
  // Undefined, 6, undefined (deprecated)
  objectId: new ObjectId('642d766c7300158b1f22e975'), // ObjectId, 7, objectId
  boolean: true, // Boolean, 8, boolean
  date: new Date('2023-04-05T13:25:08.445Z'), // Date, 9, date
  null: null, // Null, 10, null
  regex: new BSONRegExp('pattern', 'i'), // Regular Expression, 11, regex
  // DBPointer, 12, dbPointer (deprecated)
  javascript: new Code('function() {}'), // JavaScript, 13, javascript
  symbol: new BSONSymbol('symbol'), // Symbol, 14, symbol (deprecated)
  javascriptWithScope: new Code('function() {}', { foo: 1, bar: 'a' }), // JavaScript code with scope 15 "javascriptWithScope" Deprecated in MongoDB 4.4.
  int: new Int32(12345), // 32-bit integer, 16, "int"
  primitiveInt: 12345,
  timestamp: new Timestamp(new Long('7218556297505931265')), // Timestamp, 17, timestamp
  long: new Long('123456789123456789'), // 64-bit integer, 18, long
  decimal: new Decimal128(
    Uint8Array.from([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16])
  ), // Decimal128, 19, decimal
  minKey: new MinKey(), // Min key, -1, minKey
  maxKey: new MaxKey(), // Max key, 127, maxKey

  binaries: {
    generic: new Binary(Uint8Array.from([1, 2, 3]), 0), // 0
    functionData: Binary.createFromBase64('//8=', 1), // 1
    binaryOld: Binary.createFromBase64('//8=', 2), // 2
    uuidOld: Binary.createFromBase64('c//SZESzTGmQ6OfR38A11A==', 3), // 3
    uuid: new UUID('AAAAAAAA-AAAA-4AAA-AAAA-AAAAAAAAAAAA'), // 4
    md5: Binary.createFromBase64('c//SZESzTGmQ6OfR38A11A==', 5), // 5
    encrypted: Binary.createFromBase64('c//SZESzTGmQ6OfR38A11A==', 6), // 6
    compressedTimeSeries: Binary.createFromBase64('CQCKW/8XjAEAAIfx//////////H/////////AQAAAAAAAABfAAAAAAAAAAEAAAAAAAAAAgAAAAAAAAAHAAAAAAAAAA4AAAAAAAAAAA==', 7), // 7
    custom: Binary.createFromBase64('//8=', 128) // 128
  },

  dbRef: new DBRef('namespace', new ObjectId('642d76b4b7ebfab15d3c4a78')) // not actually a separate type, just a convention
}`;

describe('worker-runtime', function () {
  let worker: any;
  let caller: Caller<WorkerRuntime>;

  beforeEach(async function () {
    worker = new Worker(pathToFileURL(workerThreadModule).href);
    await once(worker, 'message');

    caller = createCaller(
      [
        'init',
        'evaluate',
        'getCompletions',
        'getShellPrompt',
        'setEvaluationListener',
        'interrupt',
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

  afterEach(function () {
    if (worker) {
      worker.terminate();
    }

    if (caller) {
      caller[cancel]();
      caller = null as any;
    }
  });

  it('should throw if worker is not initialized yet', async function () {
    const { evaluate } = caller;

    let err!: Error;

    try {
      await evaluate('1 + 1');
    } catch (e: any) {
      err = e;
    }

    expect(err).to.be.instanceof(Error);
    expect(err)
      .to.have.property('message')
      .match(/Can't call evaluate before shell runtime is initiated/);
  });

  describe('evaluate', function () {
    describe('basic shell result values', function () {
      const primitiveValues: [string, string, unknown][] = [
        ['null', 'null', null],
        ['undefined', 'undefined', undefined],
        ['boolean', '!false', true],
        ['number', '1+1', 2],
        ['string', '"hello"', 'hello'],
      ];

      const everythingElse: [string, string, string | RegExp][] = [
        ['function', 'function abc() {}; abc', '[Function: abc]'],
        [
          'function with properties',
          'function def() {}; def.def = 1; def',
          '[Function: def] { def: 1 }',
        ],
        ['anonymous function', '(() => {})', /\[Function.+\]/],
        ['class constructor', 'class BCD {}; BCD', '[class BCD]'],
        [
          'class instalce',
          'class ABC { constructor() { this.abc = 1; } }; var abc = new ABC(); abc',
          'ABC { abc: 1 }',
        ],
        ['simple array', '[1, 2, 3]', '[ 1, 2, 3 ]'],
        [
          'simple array with empty items',
          '[1, 2,, 4]',
          '[ 1, 2, <1 empty item>, 4 ]',
        ],
        [
          'non-serializable array',
          '[1, 2, 3, () => {}]',
          /\[ 1, 2, 3, \[Function( \(anonymous\))?\] \]/,
        ],
        [
          'simple object',
          '({str: "foo", num: 123})',
          "{ str: 'foo', num: 123 }",
        ],
        [
          'non-serializable object',
          '({str: "foo", num: 123, bool: false, fn() {}})',
          "{ str: 'foo', num: 123, bool: false, fn: [Function: fn] }",
        ],
        [
          'object with bson',
          '({min: MinKey(), max: MaxKey(), int: NumberInt("1")})',
          '{ min: MinKey(), max: MaxKey(), int: Int32(1) }',
        ],
        [
          'object with everything',
          '({ cls: class A{}, fn() {}, bsonType: NumberInt("1"), str: "123"})',
          "{ cls: [class A], fn: [Function: fn], bsonType: Int32(1), str: '123' }",
        ],
      ];

      primitiveValues.concat(everythingElse).forEach((testCase) => {
        const [testName, evalValue, printable] = testCase;

        it(testName, async function () {
          const { init, evaluate } = caller;
          await init('mongodb://nodb/', dummyOptions, { nodb: true });
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

    describe('shell-api results', function () {
      const testServer = startSharedTestServer();
      const db = `test-db-${Date.now().toString(16)}`;
      let exposed: Exposed<unknown>; // adding `| null` breaks TS type inference

      afterEach(function () {
        if (exposed) {
          exposed[close]();
          exposed = null as any;
        }
      });

      type CommandTestRecord =
        | [string | string[], string]
        | [string | string[], string | null, any];

      const showCommand: CommandTestRecord[] = [
        [
          'show dbs',
          'ShowDatabasesResult',
          ({ printable }: RuntimeEvaluationResult) => {
            expect(printable.find(({ name }: any) => name === 'admin')).to.not
              .be.undefined;
          },
        ],
        ['show collections', 'ShowCollectionsResult', []],
        ['show profile', 'ShowProfileResult', { count: 0 }],
        [
          'show roles',
          'ShowResult',
          ({ printable }: RuntimeEvaluationResult) => {
            expect(printable.find(({ role }: any) => role === 'dbAdmin')).to.not
              .be.undefined;
          },
        ],
      ];

      const useCommand: CommandTestRecord[] = [
        [`use ${db}`, null, `switched to db ${db}`],
      ];

      const helpCommand: CommandTestRecord[] = [
        [
          'help',
          'Help',
          ({ printable }: RuntimeEvaluationResult) => {
            expect(printable).to.have.property('help', 'Shell Help');
            expect(printable)
              .to.have.property('docs')
              .match(/https:\/\/mongodb.com\/docs/);
          },
        ],
      ];

      const cursors: CommandTestRecord[] = [
        [
          [
            `use ${db}`,
            'db.coll.insertOne({ _id: ObjectId("000000000000000000000000"), foo: 321 });',
            'db.coll.aggregate({ $match: { foo: 321 } })',
          ],
          'AggregationCursor',
          ({ printable }: RuntimeEvaluationResult) => {
            expect(printable).to.have.property('cursorHasMore', false);
            const doc = printable.documents[0];
            expect(EJSON.serialize(doc)).to.deep.equal(
              EJSON.serialize({
                _id: new ObjectId('000000000000000000000000'),
                foo: 321,
              })
            );
          },
        ],
        [
          [
            `use ${db}`,
            'db.coll.insertMany([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => ({ i })))',
            'db.coll.find({ i: { $mod: [2, 0] } }, { _id: 0 })',
          ],
          'Cursor',
          {
            documents: [{ i: 2 }, { i: 4 }, { i: 6 }, { i: 8 }, { i: 10 }],
            cursorHasMore: false,
          },
        ],
        [
          [
            `use ${db}`,
            "db.coll.insertMany('a'.repeat(100).split('').map(a => ({ a })))",
            'db.coll.find({}, { _id: 0 })',
            'it',
          ],
          'CursorIterationResult',
          ({ printable }: RuntimeEvaluationResult) => {
            expect(printable.documents).to.include.deep.members([{ a: 'a' }]);
          },
        ],
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
          },
        ],
        [
          [`use ${db}`, 'db.coll.insertMany([{ b: "b" }, { c: "c" }])'],
          'InsertManyResult',
          ({ printable }: RuntimeEvaluationResult) => {
            expect(printable).to.have.property('acknowledged', true);
            expect(printable)
              .to.have.nested.property('insertedIds[0]')
              .instanceof(ObjectId);
          },
        ],
        [
          [
            `use ${db}`,
            'db.coll.insertOne({ a: "a" })',
            'db.coll.updateOne({ a: "a" }, { $set: { a: "b" } })',
          ],
          'UpdateResult',
          {
            acknowledged: true,
            insertedId: null,
            matchedCount: 1,
            modifiedCount: 1,
            upsertedCount: 0,
          },
        ],
        [
          [
            `use ${db}`,
            'db.coll.insertOne({ a: "a" })',
            'db.coll.deleteOne({ a: "a" })',
          ],
          'DeleteResult',
          { acknowledged: true, deletedCount: 1 },
        ],
        [
          [
            `use ${db}`,
            `db.coll.insertOne(${allBsonTypesDocString})`,
            'db.coll.find({ _id: ObjectId("642d766b7300158b1f22e972") })',
          ],
          'Cursor',
          ({ printable }: RuntimeEvaluationResult) => {
            const allBsonTypesDoc = EJSON.deserialize(
              EJSON.serialize(
                {
                  _id: new ObjectId('642d766b7300158b1f22e972'),
                  double: new Double(1.2),
                  primitiveDouble: 1.2,
                  doubleThatIsAlsoAnInteger: new Double(1),
                  string: 'Hello, world!',
                  object: { key: 'value' },
                  array: [1, 2, 3],
                  binData: new Binary(Uint8Array.from([1, 2, 3])),
                  objectId: new ObjectId('642d766c7300158b1f22e975'),
                  boolean: true,
                  date: new Date('2023-04-05T13:25:08.445Z'),
                  null: null,
                  regex: new BSONRegExp('pattern', 'i'),
                  javascript: new Code('function() {}'),
                  symbol: new BSONSymbol('symbol'),
                  javascriptWithScope: new Code('function() {}', {
                    foo: 1,
                    bar: 'a',
                  }),
                  int: new Int32(12345),
                  primitiveInt: 12345,
                  timestamp: new Timestamp(new Long('7218556297505931265')),
                  long: new Long('123456789123456789'),
                  decimal: new Decimal128(
                    Uint8Array.from([
                      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
                    ])
                  ),
                  minKey: new MinKey(),
                  maxKey: new MaxKey(),

                  binaries: {
                    generic: new Binary(Uint8Array.from([1, 2, 3]), 0),
                    functionData: Binary.createFromBase64('//8=', 1),
                    binaryOld: Binary.createFromBase64('//8=', 2),
                    uuidOld: Binary.createFromBase64(
                      'c//SZESzTGmQ6OfR38A11A==',
                      3
                    ),
                    uuid: new UUID('AAAAAAAA-AAAA-4AAA-AAAA-AAAAAAAAAAAA'),
                    md5: Binary.createFromBase64('c//SZESzTGmQ6OfR38A11A==', 5),
                    encrypted: Binary.createFromBase64(
                      'c//SZESzTGmQ6OfR38A11A==',
                      6
                    ),
                    compressedTimeSeries: Binary.createFromBase64(
                      'CQCKW/8XjAEAAIfx//////////H/////////AQAAAAAAAABfAAAAAAAAAAEAAAAAAAAAAgAAAAAAAAAHAAAAAAAAAA4AAAAAAAAAAA==',
                      7
                    ),
                    custom: Binary.createFromBase64('//8=', 128),
                  },

                  dbRef: new DBRef(
                    'namespace',
                    new ObjectId('642d76b4b7ebfab15d3c4a78')
                  ),
                },
                { relaxed: false }
              ),
              { relaxed: false }
            );

            // We print primitive doubles and ints without canonical formatting,
            // like the cli repl.
            allBsonTypesDoc.double = 1.2;
            allBsonTypesDoc.primitiveDouble = 1.2;
            allBsonTypesDoc.doubleThatIsAlsoAnInteger = 1;
            allBsonTypesDoc.int = 12345;
            allBsonTypesDoc.primitiveInt = 12345;
            allBsonTypesDoc.array = [1, 2, 3];
            allBsonTypesDoc.symbol = 'symbol';

            expect(printable.documents[0]).to.deep.equal(allBsonTypesDoc);
          },
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
          },
        ],
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
            command = commands.pop()!;
            prepare = commands;
          } else {
            command = commands;
          }

          it(`"${command}" should return ${resultType} result`, async function () {
            // Without this dummy evaluation listener, a request to getConfig()
            // from the shell leads to a never-resolved Promise.
            exposed = exposeAll(
              {
                getConfig() {},
                validateConfig() {},
              },
              worker
            );

            const { init, evaluate } = caller;
            await init(await testServer.connectionString(), dummyOptions, {});

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

    describe('errors', function () {
      it("should throw an error if it's thrown during evaluation", async function () {
        const { init, evaluate } = caller;

        await init('mongodb://nodb/', dummyOptions, { nodb: true });

        let err!: Error;
        try {
          await evaluate('throw new TypeError("Oh no, types!")');
        } catch (e: any) {
          err = e;
        }

        expect(err).to.be.instanceof(Error);
        expect(err).to.have.property('name', 'TypeError');
        expect(err).to.have.property('message', 'Oh no, types!');
        expect(err)
          .to.have.property('stack')
          .matches(/TypeError: Oh no, types!/);
      });

      it('should preserve extra error properties', async function () {
        const { init, evaluate } = caller;

        await init('mongodb://nodb/', dummyOptions, { nodb: true });

        let err!: Error;
        try {
          await evaluate(
            'throw Object.assign(new TypeError("Oh no, types!"), { errInfo: { message: "wrong type :S" } })'
          );
        } catch (e: any) {
          err = e;
        }

        expect(err).to.be.instanceof(Error);
        expect(err).to.have.property('name', 'TypeError');
        expect(err).to.have.property('message', 'Oh no, types!');
        expect((err as any).errInfo.message).to.equal('wrong type :S');
      });

      it("should return an error if it's returned from evaluation", async function () {
        const { init, evaluate } = caller;

        await init('mongodb://nodb/', dummyOptions, { nodb: true });

        const { printable } = await evaluate('new SyntaxError("Syntax!")');

        expect(printable).to.be.instanceof(Error);
        expect(printable).to.have.property('name', 'SyntaxError');
        expect(printable).to.have.property('message', 'Syntax!');
        expect(printable)
          .to.have.property('stack')
          .matches(/SyntaxError: Syntax!/);
      });

      it('should throw when trying to run two evaluations concurrently', async function () {
        const { init, evaluate } = caller;
        await init('mongodb://nodb/', dummyOptions, { nodb: true });

        let err!: Error;

        try {
          await Promise.all([
            evaluate('sleep(50); 1+1'),
            evaluate('sleep(50); 1+1'),
          ]);
        } catch (e: any) {
          err = e;
        }

        expect(err).to.be.instanceof(Error);
        expect(err)
          .to.have.property('message')
          .match(
            /Can't run another evaluation while the previous is not finished/
          );
      });
    });
  });

  describe('getShellPrompt', function () {
    const testServer = startSharedTestServer();

    it('should return prompt when connected to the server', async function () {
      const { init, getShellPrompt } = caller;

      await init(await testServer.connectionString());

      const result = await getShellPrompt();

      expect(result).to.match(/>/);
    });
  });

  describe('getCompletions', function () {
    const testServer = startSharedTestServer();

    let exposed: Exposed<unknown> | null;

    afterEach(function () {
      if (exposed) {
        exposed[close]();
        exposed = null;
      }
    });

    it('should return completions', async function () {
      const db = `completions-${Date.now()}`;
      await testServer.withClient((client) =>
        client.db(db).collection('coll1').insertOne({})
      );

      const { init, getCompletions } = caller;
      exposed = exposeAll<object>(
        {
          getConfig() {
            return null;
          },
        },
        worker
      );
      await init(await testServer.connectionString({}, { pathname: `/${db}` }));

      const completions = await getCompletions('db.coll1.f');

      expect(completions).to.deep.contain({
        completion: 'db.coll1.find',
      });
    });
  });

  describe('evaluationListener', function () {
    const spySandbox = sinon.createSandbox();

    const createSpiedEvaluationListener = () => {
      const evalListener = {
        onPrint() {},
        onPrompt() {
          return '123';
        },
        getConfig() {},
        setConfig() {},
        resetConfig() {},
        validateConfig() {},
        listConfigOptions() {
          return ['displayBatchSize'];
        },
        onRunInterruptible() {},
        getLogPath() {},
      };

      spySandbox.spy(evalListener, 'onPrint');
      spySandbox.spy(evalListener, 'onPrompt');
      spySandbox.spy(evalListener, 'getConfig');
      spySandbox.spy(evalListener, 'setConfig');
      spySandbox.spy(evalListener, 'resetConfig');
      spySandbox.spy(evalListener, 'validateConfig');
      spySandbox.spy(evalListener, 'listConfigOptions');
      spySandbox.spy(evalListener, 'onRunInterruptible');
      spySandbox.spy(evalListener, 'getLogPath');

      return evalListener;
    };

    let exposed: Exposed<unknown> | null;

    afterEach(function () {
      if (exposed) {
        exposed[close]();
        exposed = null;
      }

      spySandbox.restore();
    });

    describe('onPrint', function () {
      it('should be called when shell evaluates `print`', async function () {
        const { init, evaluate } = caller;
        const evalListener = createSpiedEvaluationListener();

        exposed = exposeAll(evalListener, worker);

        await init('mongodb://nodb/', dummyOptions, { nodb: true });
        await evaluate('print("Hi!")');

        expect(evalListener.onPrint).to.have.been.calledWith([
          {
            printable: 'Hi!',
            source: undefined,
            type: null,
            constructionOptions: undefined,
          },
        ]);
      });

      it('should correctly serialize bson objects', async function () {
        const { init, evaluate } = caller;
        const evalListener = createSpiedEvaluationListener();

        exposed = exposeAll(evalListener, worker);

        await init('mongodb://nodb/', dummyOptions, { nodb: true });
        await evaluate('print(new ObjectId("62a209b0c7dc31e23ab9da45"))');

        expect(evalListener.onPrint).to.have.been.calledWith([
          {
            printable: "ObjectId('62a209b0c7dc31e23ab9da45')",
            source: undefined,
            type: 'InspectResult',
          },
        ]);
      });

      it('should correctly serialize all bson types', async function () {
        const { init, evaluate } = caller;
        const evalListener = createSpiedEvaluationListener();

        exposed = exposeAll(evalListener, worker);

        await init('mongodb://nodb/', dummyOptions, { nodb: true });
        await evaluate(`print(${allBsonTypesDocString})`);

        expect(evalListener.onPrint).to.have.been.calledWith([
          {
            printable: `{
  _id: ObjectId('642d766b7300158b1f22e972'),
  double: Double(1.2),
  primitiveDouble: 1.2,
  doubleThatIsAlsoAnInteger: Double(1),
  string: 'Hello, world!',
  object: { key: 'value' },
  array: [ 1, 2, 3 ],
  binData: Binary.createFromBase64('AQID', 0),
  objectId: ObjectId('642d766c7300158b1f22e975'),
  boolean: true,
  date: 2023-04-05T13:25:08.445Z,
  null: null,
  regex: BSONRegExp('pattern', 'i'),
  javascript: Code('function() {}'),
  symbol: BSONSymbol('symbol'),
  javascriptWithScope: Code('function() {}', { foo: 1, bar: 'a' }),
  int: Int32(12345),
  primitiveInt: 12345,
  timestamp: Timestamp({ t: 1680701109, i: 1 }),
  long: Long('123456789123456789'),
  decimal: Decimal128('5.477284286264328586719275128128001E-4088'),
  minKey: MinKey(),
  maxKey: MaxKey(),
  binaries: {
    generic: Binary.createFromBase64('AQID', 0),
    functionData: Binary.createFromBase64('//8=', 1),
    binaryOld: Binary.createFromBase64('//8=', 2),
    uuidOld: Binary.createFromBase64('c//SZESzTGmQ6OfR38A11A==', 3),
    uuid: UUID('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'),
    md5: MD5('73ffd26444b34c6990e8e7d1dfc035d4'),
    encrypted: Binary.createFromBase64('c//SZESzTGmQ6OfR38A11A==', 6),
    compressedTimeSeries: Binary.createFromBase64('CQCKW/8XjAEAAIfx//////////H/////////AQAAAAAAAABfAAAAAAAAAAEAAAAAAAAAAgAAAAAAAAAHAAAAAAAAAA4AAAAAAAAAAA==', 7),
    custom: Binary.createFromBase64('//8=', 128)
  },
  dbRef: DBRef('namespace', ObjectId('642d76b4b7ebfab15d3c4a78'))
}`,
            source: undefined,
            type: 'InspectResult',
          },
        ]);
      });
    });

    describe('onPrompt', function () {
      it('should be called when shell evaluates `passwordPrompt`', async function () {
        const { init, evaluate } = caller;
        const evalListener = createSpiedEvaluationListener();

        exposed = exposeAll(evalListener, worker);

        await init('mongodb://nodb/', dummyOptions, { nodb: true });
        const password = await evaluate('passwordPrompt()');

        expect(evalListener.onPrompt).to.have.been.called;
        expect(password.printable).to.equal('123');
      });
    });

    describe('getConfig', function () {
      it('should be called when shell evaluates `config.get()`', async function () {
        const { init, evaluate } = caller;
        const evalListener = createSpiedEvaluationListener();

        exposed = exposeAll(evalListener, worker);

        await init('mongodb://nodb/', dummyOptions, { nodb: true });

        await evaluate('config.get("key")');
        expect(evalListener.getConfig).to.have.been.calledWith('key');
      });
    });

    describe('setConfig', function () {
      it('should be called when shell evaluates `config.set()`', async function () {
        const { init, evaluate } = caller;
        const evalListener = createSpiedEvaluationListener();

        exposed = exposeAll(evalListener, worker);

        await init('mongodb://nodb/', dummyOptions, { nodb: true });

        await evaluate('config.set("displayBatchSize", 200)');
        expect(evalListener.validateConfig).to.have.been.calledWith(
          'displayBatchSize',
          200
        );
        expect(evalListener.setConfig).to.have.been.calledWith(
          'displayBatchSize',
          200
        );
      });
    });

    describe('resetConfig', function () {
      it('should be called when shell evaluates `config.reset()`', async function () {
        const { init, evaluate } = caller;
        const evalListener = createSpiedEvaluationListener();

        exposed = exposeAll(evalListener, worker);

        await init('mongodb://nodb/', dummyOptions, { nodb: true });

        await evaluate('config.reset("displayBatchSize")');
        expect(evalListener.resetConfig).to.have.been.calledWith(
          'displayBatchSize'
        );
      });
    });

    describe('getLogPath', function () {
      it('should be called when shell evaluates `log.getPath()`', async function () {
        const { init, evaluate } = caller;
        const evalListener = createSpiedEvaluationListener();

        exposed = exposeAll(evalListener, worker);

        await init('mongodb://nodb/', dummyOptions, { nodb: true });

        await evaluate('log.getPath()');
        expect(evalListener.getLogPath).to.have.been.called;
      });
    });

    describe('listConfigOptions', function () {
      it('should be called when shell evaluates `config[asPrintable]`', async function () {
        const { init, evaluate } = caller;
        const evalListener = createSpiedEvaluationListener();

        exposed = exposeAll(evalListener, worker);

        await init('mongodb://nodb/', dummyOptions, { nodb: true });

        await evaluate(`
        var JSSymbol = Object.getOwnPropertySymbols(Array.prototype)[0].constructor;
        config[JSSymbol.for("@@mongosh.asPrintable")]()`);
        expect(evalListener.listConfigOptions).to.have.been.calledWith();
      });
    });

    describe('onRunInterruptible', function () {
      it('should call callback when interruptible evaluation starts and ends', async function () {
        const { init, evaluate } = caller;
        const evalListener = createSpiedEvaluationListener();

        exposed = exposeAll(evalListener, worker);

        await init('mongodb://nodb/', dummyOptions, { nodb: true });
        await evaluate('1+1');

        const [firstCall, secondCall] = (
          evalListener.onRunInterruptible as sinon.SinonSpy
        ).args;

        expect(firstCall[0]).to.have.property('__id');
        expect(secondCall[0]).to.equal(null);
      });

      it('should return a handle that allows to interrupt the evaluation', async function () {
        const { init, evaluate } = caller;
        const evalListener = createSpiedEvaluationListener();

        exposed = exposeAll(evalListener, worker);

        await init('mongodb://nodb/', dummyOptions, { nodb: true });

        let err!: Error;

        try {
          await Promise.all([
            evaluate('while(true){}'),
            (async () => {
              await sleep(50);
              const handle = (evalListener.onRunInterruptible as sinon.SinonSpy)
                .args[0][0];
              interrupt(handle);
            })(),
          ]);
        } catch (e: any) {
          err = e;
        }

        expect(err).to.be.instanceof(Error);
        expect(err)
          .to.have.property('message')
          .match(/Script execution was interrupted/);
      });
    });
  });

  describe('interrupt', function () {
    it('should interrupt in-flight async tasks', async function () {
      const { init, evaluate, interrupt } = caller;

      await init('mongodb://nodb/', dummyOptions, { nodb: true });

      let err!: Error;

      try {
        await Promise.all([
          evaluate('sleep(100000)'),
          (async () => {
            await sleep(10);
            await interrupt();
          })(),
        ]);
      } catch (e: any) {
        err = e;
      }

      expect(err).to.be.instanceof(Error);
      expect(err)
        .to.have.property('message')
        .match(/Async script execution was interrupted/);
    });
  });
});
