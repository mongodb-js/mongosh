import { expect, use } from 'chai';
import type { StubbedInstance } from 'ts-sinon';
import sinon from 'sinon';
import { stubInterface } from 'ts-sinon';
import type { EventEmitter } from 'events';
import { signatures, toShellResult } from './index';
import {
  ALL_SERVER_VERSIONS,
  ALL_TOPOLOGIES,
  ALL_PLATFORMS,
  shellApiType,
  ADMIN_DB,
} from './enums';
import { Database } from './database';
import Mongo from './mongo';
import { Collection } from './collection';
import ChangeStreamCursor from './change-stream-cursor';
import Explainable from './explainable';
import type {
  FindCursor as ServiceProviderCursor,
  AggregationCursor as ServiceProviderAggregationCursor,
  RunCommandCursor as ServiceProviderRunCommandCursor,
  ServiceProvider,
  ClientSession as ServiceProviderSession,
  Document,
  AnyBulkWriteOperation,
} from '@mongosh/service-provider-core';
import { bson } from '@mongosh/service-provider-core';
import ShellInstanceState from './shell-instance-state';
import { ShellApiErrors } from './error-codes';
import {
  CommonErrors,
  MongoshInvalidInputError,
  MongoshRuntimeError,
} from '@mongosh/errors';
import type { StringKey } from './helpers';

const sinonChai = require('sinon-chai'); // weird with import

use(sinonChai);
describe('Collection', function () {
  describe('help', function () {
    const apiClass = new Collection({} as any, {} as any, 'name');
    it('calls help function', async function () {
      expect((await toShellResult(apiClass.help())).type).to.equal('Help');
      expect((await toShellResult(apiClass.help)).type).to.equal('Help');
    });
  });
  describe('signatures', function () {
    it('type', function () {
      expect(signatures.Collection.type).to.equal('Collection');
    });
    it('attributes', function () {
      expect(signatures.Collection.attributes?.aggregate).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: 'AggregationCursor',
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: [1, Infinity],
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: false,
        acceptsRawInput: false,
        shellCommandCompleter: undefined,
        newShellCommandCompleter: undefined,
      });
    });
  });
  describe('metadata', function () {
    describe('toShellResult', function () {
      const mongo = sinon.spy();
      const db = new Database(mongo as any, 'myDB');
      const coll = new Collection(mongo as any, db, 'myCollection');
      it('toShellResult', async function () {
        expect((await toShellResult(coll)).type).to.equal('Collection');
        expect((await toShellResult(coll)).printable).to.equal(
          'myDB.myCollection'
        );
      });
    });
  });
  describe('.collections', function () {
    it('allows to get a collection as property if is not one of the existing methods', function () {
      const database = new Database(
        { _instanceState: { emitApiCallWithArgs: (): void => {} } } as any,
        'db1'
      );
      const coll: any = new Collection({} as any, database, 'coll');
      expect(coll.someCollection).to.have.instanceOf(Collection);
      expect(coll.someCollection._name).to.equal('coll.someCollection');
    });

    it('reuses collections', function () {
      const database: any = new Database(
        { _instanceState: { emitApiCallWithArgs: (): void => {} } } as any,
        'db1'
      );
      const coll: any = new Collection({} as any, database, 'coll');
      expect(coll.someCollection).to.equal(
        database.getCollection('coll.someCollection')
      );
      expect(coll.someCollection).to.equal(database.coll.someCollection);
    });

    it('does not return a collection starting with _', function () {
      // this is the behaviour in the old shell
      const database: any = new Database({} as any, 'db1');
      const coll: any = new Collection({} as any, database, 'coll');
      expect(coll._someProperty).to.equal(undefined);
    });

    it('does not return a collection for symbols', function () {
      const database: any = new Database({} as any, 'db1');
      const coll: any = new Collection({} as any, database, 'coll');
      expect(coll[Symbol('someProperty')]).to.equal(undefined);
    });

    it('does not return a collection with invalid name', function () {
      const database: any = new Database({} as any, 'db1');
      const coll: any = new Collection({} as any, database, 'coll');
      expect(coll.foo$bar).to.equal(undefined);
    });

    it('allows to access _name', function () {
      const database: any = new Database({} as any, 'db1');
      const coll: any = new Collection({} as any, database, 'coll');
      expect(coll._name).to.equal('coll');
    });
  });
  describe('commands', function () {
    type ServerSchema = {
      db1: {
        coll1: {
          schema: {};
        };
      };
    };
    let mongo: Mongo<ServerSchema>;
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let database: Database<ServerSchema, ServerSchema['db1']>;
    let bus: StubbedInstance<EventEmitter>;
    let instanceState: ShellInstanceState;
    let collection: Collection<
      ServerSchema,
      ServerSchema['db1'],
      ServerSchema['db1']['coll1']
    >;

    beforeEach(function () {
      bus = stubInterface<EventEmitter>();
      serviceProvider = stubInterface<ServiceProvider>();
      serviceProvider.runCommand.resolves({ ok: 1 });
      serviceProvider.runCommandWithCheck.resolves({ ok: 1 });
      serviceProvider.initialDb = 'test';
      serviceProvider.bsonLibrary = bson;
      instanceState = new ShellInstanceState(serviceProvider, bus);
      mongo = new Mongo(
        instanceState,
        undefined,
        undefined,
        undefined,
        serviceProvider
      );
      database = new Database<ServerSchema, ServerSchema['db1']>(
        mongo,
        'db1' as StringKey<ServerSchema>
      );
      collection = new Collection<
        ServerSchema,
        ServerSchema['db1'],
        ServerSchema['db1']['coll1']
      >(mongo, database, 'coll1');
    });
    describe('aggregate', function () {
      let serviceProviderCursor: StubbedInstance<ServiceProviderAggregationCursor>;

      beforeEach(function () {
        serviceProviderCursor =
          stubInterface<ServiceProviderAggregationCursor>();
      });

      it('calls serviceProvider.aggregate with pipeline and no options', async function () {
        await collection.aggregate([{ $piplelineStage: {} }]);

        expect(serviceProvider.aggregate).to.have.been.calledWith(
          collection._database._name,
          collection._name,
          [{ $piplelineStage: {} }],
          {}
        );
      });
      it('calls serviceProvider.aggregate with no pipeline and no options', async function () {
        await collection.aggregate();

        expect(serviceProvider.aggregate).to.have.been.calledWith(
          collection._database._name,
          collection._name,
          [],
          {}
        );
      });
      it('calls serviceProvider.aggregate with stages as arguments', async function () {
        await collection.aggregate(
          { $option1: 1 },
          { $option2: 2 },
          { $option3: 3 }
        );

        expect(serviceProvider.aggregate).to.have.been.calledWith(
          collection._database._name,
          collection._name,
          [{ $option1: 1 }, { $option2: 2 }, { $option3: 3 }],
          {}
        );
      });

      it('calls serviceProvider.aggregate with pipleline and options', async function () {
        await collection.aggregate([{ $piplelineStage: {} }], {
          options: true,
          batchSize: 10,
        });

        expect(serviceProvider.aggregate).to.have.been.calledWith(
          collection._database._name,
          collection._name,
          [{ $piplelineStage: {} }],
          { options: true, batchSize: 10 }
        );
      });

      it('returns an AggregationCursor that wraps the service provider one', async function () {
        const toArrayResult = [{ foo: 'bar' }];
        serviceProviderCursor.toArray.resolves(toArrayResult);
        serviceProvider.aggregate.returns(serviceProviderCursor);

        const cursor = await collection.aggregate([
          {
            $piplelineStage: {},
          },
        ]);

        expect(await (cursor as any).toArray()).to.deep.equal(toArrayResult);
      });

      it('throws if serviceProvider.aggregate rejects', async function () {
        const expectedError = new Error();
        serviceProvider.aggregate.throws(expectedError);

        expect(
          await collection.aggregate([{ $piplelineStage: {} }]).catch((e) => e)
        ).to.equal(expectedError);
      });

      it('pass readConcern and writeConcern as dbOption', async function () {
        await collection.aggregate([], {
          otherOption: true,
          readConcern: { level: 'majority' },
          writeConcern: { w: 1 },
        });

        expect(serviceProvider.aggregate).to.have.been.calledWith(
          collection._database._name,
          collection._name,
          [],
          { otherOption: true },
          { readConcern: { level: 'majority' }, w: 1 }
        );
      });

      it('runs explain if explain true is passed', async function () {
        const expectedExplainResult = {};
        serviceProviderCursor.explain.resolves(expectedExplainResult);
        serviceProvider.aggregate.returns(serviceProviderCursor as any);

        const explainResult = await collection.aggregate([], { explain: true });

        expect(explainResult).to.deep.equal(expectedExplainResult);
        expect((await toShellResult(explainResult)).type).to.equal(
          'ExplainOutput'
        );
        expect(serviceProviderCursor.explain).to.have.been.calledOnce;
      });

      it('wont run explain if explain is not passed', async function () {
        serviceProvider.aggregate.returns(serviceProviderCursor as any);

        const cursor = await collection.aggregate([], {});

        expect((await toShellResult(cursor)).type).to.equal(
          'AggregationCursor'
        );
        expect(serviceProviderCursor.explain).not.to.have.been.called;
      });
    });

    describe('bulkWrite', function () {
      let requests: AnyBulkWriteOperation[];
      beforeEach(function () {
        requests = [{ insertOne: { document: { doc: 1 } } }];
      });

      it('calls service provider bulkWrite', async function () {
        serviceProvider.bulkWrite = sinon.spy(() =>
          Promise.resolve({
            result: { ok: 1 },
          })
        ) as any;

        await collection.bulkWrite(requests);

        expect(serviceProvider.bulkWrite).to.have.been.calledWith(
          'db1',
          'coll1',
          requests
        );
      });

      it('passes writeConcern through if specified', async function () {
        serviceProvider.bulkWrite = sinon.spy(() =>
          Promise.resolve({
            result: { ok: 1 },
          })
        ) as any;

        await collection.bulkWrite(requests, {
          writeConcern: { w: 'majority' },
        });

        expect(serviceProvider.bulkWrite).to.have.been.calledWith(
          'db1',
          'coll1',
          requests,
          { writeConcern: { w: 'majority' } }
        );
      });

      it('adapts the result', async function () {
        const id1 = new bson.ObjectId();
        const id2 = new bson.ObjectId();
        serviceProvider.bulkWrite.resolves({
          result: { ok: 1 },
          insertedCount: 1,
          matchedCount: 2,
          modifiedCount: 3,
          deletedCount: 4,
          upsertedCount: 5,
          insertedIds: { 0: id1 },
          upsertedIds: { 0: id2 },
          ok: true,
        } as any);

        const result = await collection.bulkWrite(requests);

        expect((await toShellResult(result)).printable).to.be.deep.equal({
          acknowledged: true,
          insertedCount: 1,
          matchedCount: 2,
          modifiedCount: 3,
          deletedCount: 4,
          upsertedCount: 5,
          insertedIds: { 0: id1 },
          upsertedIds: { 0: id2 },
        });
      });
    });

    describe('convertToCapped', function () {
      it('calls service provider runCommandWithCheck', async function () {
        const result = await collection.convertToCapped(1000);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          'db1',
          {
            convertToCapped: 'coll1',
            size: 1000,
          }
        );

        expect(result).to.deep.equal({ ok: 1 });
      });
    });

    describe('count', function () {
      it('passes readConcern through if specified', async function () {
        serviceProvider.count = sinon.spy(() => Promise.resolve(10)) as any;

        await collection.count(
          {},
          {
            readConcern: { level: 'majority' },
          }
        );

        expect(serviceProvider.count).to.have.been.calledWith(
          'db1',
          'coll1',
          {},
          { readConcern: { level: 'majority' } }
        );
      });
    });

    describe('deleteMany', function () {
      it('passes writeConcern through if specified', async function () {
        serviceProvider.deleteMany = sinon.spy(() =>
          Promise.resolve({
            result: { ok: 1, deletedCount: 10 },
          })
        ) as any;

        await collection.deleteMany(
          {},
          {
            writeConcern: { w: 'majority' },
          }
        );

        expect(serviceProvider.deleteMany).to.have.been.calledWith(
          'db1',
          'coll1',
          {},
          { writeConcern: { w: 'majority' } }
        );
      });

      it('returns an ExplainOutput object when explained', async function () {
        serviceProvider.deleteMany.resolves({ ok: 1 } as any);

        const explained = await collection.deleteMany(
          {},
          { explain: 'queryPlanner' }
        );
        expect((await toShellResult(explained)).type).to.equal('ExplainOutput');
        expect((await toShellResult(explained)).printable).to.deep.equal({
          ok: 1,
        });
      });
    });

    describe('deleteOne', function () {
      it('passes writeConcern through if specified', async function () {
        serviceProvider.deleteOne = sinon.spy(() =>
          Promise.resolve({
            result: { ok: 1, deletedCount: 1 },
          })
        ) as any;

        await collection.deleteOne(
          {},
          {
            writeConcern: { w: 'majority' },
          }
        );

        expect(serviceProvider.deleteOne).to.have.been.calledWith(
          'db1',
          'coll1',
          {},
          { writeConcern: { w: 'majority' } }
        );
      });

      it('returns an ExplainOutput object when explained', async function () {
        serviceProvider.deleteOne.resolves({ ok: 1 } as any);

        const explained = await collection.deleteOne(
          {},
          { explain: 'queryPlanner' }
        );
        expect((await toShellResult(explained)).type).to.equal('ExplainOutput');
        expect((await toShellResult(explained)).printable).to.deep.equal({
          ok: 1,
        });
      });
    });

    describe('distinct', function () {
      it('returns an ExplainOutput object when explained', async function () {
        serviceProvider.distinct.resolves({ ok: 1 } as any);

        const explained = await collection.distinct(
          '_id',
          {},
          { explain: 'queryPlanner' }
        );
        expect((await toShellResult(explained)).type).to.equal('ExplainOutput');
        expect((await toShellResult(explained)).printable).to.deep.equal({
          ok: 1,
        });
      });
    });

    describe('remove', function () {
      beforeEach(function () {
        serviceProvider.deleteOne = sinon.spy(() =>
          Promise.resolve({
            acknowledged: true,
            deletedCount: 1,
          })
        ) as any;
        serviceProvider.deleteMany = sinon.spy(() =>
          Promise.resolve({
            acknowledged: true,
            deletedCount: 2,
          })
        ) as any;
      });

      it('calls deleteOne if justOne is passed as an argument', async function () {
        expect((await collection.remove({}, true)).deletedCount).to.equal(1);
        expect(serviceProvider.deleteOne).to.have.been.calledWith(
          'db1',
          'coll1',
          {},
          {}
        );
        expect(serviceProvider.deleteMany).to.not.have.been.called;
      });

      it('calls deleteOne if justOne is passed as an option', async function () {
        expect(
          (await collection.remove({}, { justOne: true })).deletedCount
        ).to.equal(1);
        expect(serviceProvider.deleteOne).to.have.been.calledWith(
          'db1',
          'coll1',
          {},
          {}
        );
        expect(serviceProvider.deleteMany).to.not.have.been.called;
      });

      it('calls deleteMany if !justOne is passed as an argument', async function () {
        expect((await collection.remove({}, false)).deletedCount).to.equal(2);
        expect(serviceProvider.deleteOne).to.not.have.been.called;
        expect(serviceProvider.deleteMany).to.have.been.calledWith(
          'db1',
          'coll1',
          {},
          {}
        );
      });

      it('calls deleteMany if !justOne is passed as an option', async function () {
        expect(
          (await collection.remove({}, { justOne: false })).deletedCount
        ).to.equal(2);
        expect(serviceProvider.deleteOne).to.not.have.been.called;
        expect(serviceProvider.deleteMany).to.have.been.calledWith(
          'db1',
          'coll1',
          {},
          {}
        );
      });

      it('calls deleteMany by default', async function () {
        expect((await collection.remove({})).deletedCount).to.equal(2);
        expect(serviceProvider.deleteOne).to.not.have.been.called;
        expect(serviceProvider.deleteMany).to.have.been.calledWith(
          'db1',
          'coll1',
          {},
          {}
        );
      });

      it('returns an ExplainOutput object when explained', async function () {
        serviceProvider.deleteMany = sinon.spy(() =>
          Promise.resolve({ ok: 1 })
        ) as any;

        const explained = await collection.remove(
          {},
          { explain: 'queryPlanner' }
        );
        expect((await toShellResult(explained)).type).to.equal('ExplainOutput');
        expect((await toShellResult(explained)).printable).to.deep.equal({
          ok: 1,
        });
      });
    });

    describe('findOneAndReplace', function () {
      it('sets returnDocument to before by default', async function () {
        serviceProvider.findOneAndReplace = sinon.spy(() =>
          Promise.resolve({
            result: { ok: 1, value: {} },
          })
        ) as any;

        await collection.findOneAndReplace({}, {});

        expect(serviceProvider.findOneAndReplace).to.have.been.calledWith(
          'db1',
          'coll1',
          {},
          {},
          { returnDocument: 'before' }
        );
      });

      it('lets returnNewDocument determine returnDocument', async function () {
        serviceProvider.findOneAndReplace = sinon.spy(() =>
          Promise.resolve({
            result: { ok: 1, value: {} },
          })
        ) as any;

        await collection.findOneAndReplace(
          {},
          {},
          {
            returnNewDocument: true,
          }
        );

        expect(serviceProvider.findOneAndReplace).to.have.been.calledWith(
          'db1',
          'coll1',
          {},
          {},
          { returnDocument: 'after' }
        );
      });

      it('lets returnOriginal determine returnDocument', async function () {
        serviceProvider.findOneAndReplace = sinon.spy(() =>
          Promise.resolve({
            result: { ok: 1, value: {} },
          })
        ) as any;

        await collection.findOneAndReplace(
          {},
          {},
          {
            returnOriginal: false,
          }
        );

        expect(serviceProvider.findOneAndReplace).to.have.been.calledWith(
          'db1',
          'coll1',
          {},
          {},
          { returnDocument: 'after' }
        );
      });

      it('throws when returnDocument is an invalid value', async function () {
        try {
          await collection.findOneAndReplace(
            {},
            {},
            {
              returnDocument: 'somethingelse' as any,
            }
          );
          expect.fail('missed exception');
        } catch (error: any) {
          expect(error).to.be.instanceOf(MongoshInvalidInputError);
          expect(error.message).to.contain(
            "returnDocument needs to be either 'before' or 'after'"
          );
          expect(error.code).to.equal(CommonErrors.InvalidArgument);
        }
      });

      it('returns an ExplainOutput object when explained', async function () {
        serviceProvider.findOneAndReplace.resolves({ ok: 1 });

        const explained = await collection.findOneAndReplace(
          {},
          {},
          { explain: 'queryPlanner' }
        );
        expect((await toShellResult(explained)).type).to.equal('ExplainOutput');
        expect((await toShellResult(explained)).printable).to.deep.equal({
          ok: 1,
        });
      });
    });

    describe('findOneAndUpdate', function () {
      it('sets returnDocument to before by default', async function () {
        serviceProvider.findOneAndUpdate = sinon.spy(() =>
          Promise.resolve({
            result: { ok: 1, value: {} },
          })
        ) as any;

        await collection.findOneAndUpdate({}, {});

        expect(serviceProvider.findOneAndUpdate).to.have.been.calledWith(
          'db1',
          'coll1',
          {},
          {},
          { returnDocument: 'before' }
        );
      });

      it('lets returnNewDocument determine returnDocument', async function () {
        serviceProvider.findOneAndUpdate = sinon.spy(() =>
          Promise.resolve({
            result: { ok: 1, value: {} },
          })
        ) as any;

        await collection.findOneAndUpdate(
          {},
          {},
          {
            returnNewDocument: true,
          }
        );

        expect(serviceProvider.findOneAndUpdate).to.have.been.calledWith(
          'db1',
          'coll1',
          {},
          {},
          { returnDocument: 'after' }
        );
      });

      it('lets returnOriginal determine returnDocument', async function () {
        serviceProvider.findOneAndUpdate = sinon.spy(() =>
          Promise.resolve({
            result: { ok: 1, value: {} },
          })
        ) as any;

        await collection.findOneAndUpdate(
          {},
          {},
          {
            returnOriginal: false,
          }
        );

        expect(serviceProvider.findOneAndUpdate).to.have.been.calledWith(
          'db1',
          'coll1',
          {},
          {},
          { returnDocument: 'after' }
        );
      });

      it('throws when returnDocument is an invalid value', async function () {
        try {
          await collection.findOneAndUpdate(
            {},
            {},
            {
              returnDocument: 'somethingelse' as any,
            }
          );
          expect.fail('missed exception');
        } catch (error: any) {
          expect(error).to.be.instanceOf(MongoshInvalidInputError);
          expect(error.message).to.contain(
            "returnDocument needs to be either 'before' or 'after'"
          );
          expect(error.code).to.equal(CommonErrors.InvalidArgument);
        }
      });

      it('returns an ExplainOutput object when explained', async function () {
        serviceProvider.findOneAndUpdate.resolves({ ok: 1 });

        const explained = await collection.findOneAndUpdate(
          {},
          {},
          { explain: 'queryPlanner' }
        );
        expect((await toShellResult(explained)).type).to.equal('ExplainOutput');
        expect((await toShellResult(explained)).printable).to.deep.equal({
          ok: 1,
        });
      });
    });

    describe('getDb', function () {
      it('returns the db instance', function () {
        expect(collection.getDB()).to.equal(database);
      });
    });

    describe('getMongo', function () {
      it('returns the Mongo instance', function () {
        expect(collection.getMongo()).to.equal(mongo);
      });
    });

    describe('insert', function () {
      it('passes writeConcern through if specified', async function () {
        serviceProvider.insertMany = sinon.spy(() =>
          Promise.resolve({
            result: { ok: 1, insertedIds: {} },
          })
        ) as any;

        await collection.insert(
          {},
          {
            writeConcern: { w: 'majority' },
          }
        );

        expect(serviceProvider.insertMany).to.have.been.calledWith(
          'db1',
          'coll1',
          [{}],
          { writeConcern: { w: 'majority' } }
        );
      });
    });

    describe('insertMany', function () {
      it('passes writeConcern through if specified', async function () {
        serviceProvider.insertMany = sinon.spy(() =>
          Promise.resolve({
            result: { ok: 1, insertedIds: {} },
          })
        ) as any;

        await collection.insertMany([{}], {
          writeConcern: { w: 'majority' },
        });

        expect(serviceProvider.insertMany).to.have.been.calledWith(
          'db1',
          'coll1',
          [{}],
          { writeConcern: { w: 'majority' } }
        );
      });
    });

    describe('insertOne', function () {
      it('passes writeConcern through if specified', async function () {
        serviceProvider.insertOne = sinon.spy(() =>
          Promise.resolve({
            result: { ok: 1, insertedId: null },
          })
        ) as any;

        await collection.insertOne(
          {},
          {
            writeConcern: { w: 'majority' },
          }
        );

        expect(serviceProvider.insertOne).to.have.been.calledWith(
          'db1',
          'coll1',
          {},
          { writeConcern: { w: 'majority' } }
        );
      });
    });

    describe('replaceOne', function () {
      it('passes writeConcern through if specified', async function () {
        serviceProvider.replaceOne = sinon.spy(() =>
          Promise.resolve({
            result: {
              ok: 1,
              matchedCount: 0,
              modifiedCount: 0,
              upsertedCount: 0,
              upsertedId: null,
            },
          })
        ) as any;

        await collection.replaceOne(
          {},
          {},
          {
            writeConcern: { w: 'majority' },
          }
        );

        expect(serviceProvider.replaceOne).to.have.been.calledWith(
          'db1',
          'coll1',
          {},
          {},
          { writeConcern: { w: 'majority' } }
        );
      });
    });

    describe('updateOne', function () {
      it('passes writeConcern through if specified', async function () {
        serviceProvider.updateOne = sinon.spy(() =>
          Promise.resolve({
            result: {
              ok: 1,
              matchedCount: 0,
              modifiedCount: 0,
              upsertedCount: 0,
              upsertedId: null,
            },
          })
        ) as any;

        await collection.updateOne(
          {},
          {},
          {
            writeConcern: { w: 'majority' },
          }
        );

        expect(serviceProvider.updateOne).to.have.been.calledWith(
          'db1',
          'coll1',
          {},
          {},
          { writeConcern: { w: 'majority' } }
        );
      });

      it('returns an ExplainOutput object when explained', async function () {
        serviceProvider.updateOne.resolves({ ok: 1 } as any);

        const explained = await collection.updateOne(
          {},
          {},
          { explain: 'queryPlanner' }
        );
        expect((await toShellResult(explained)).type).to.equal('ExplainOutput');
        expect((await toShellResult(explained)).printable).to.deep.equal({
          ok: 1,
        });
      });
    });

    describe('updateMany', function () {
      it('passes writeConcern through if specified', async function () {
        serviceProvider.updateMany = sinon.spy(() =>
          Promise.resolve({
            result: {
              ok: 1,
              matchedCount: 0,
              modifiedCount: 0,
              upsertedCount: 0,
              upsertedId: null,
            },
          })
        ) as any;

        await collection.updateMany(
          {},
          {},
          {
            writeConcern: { w: 'majority' },
          }
        );

        expect(serviceProvider.updateMany).to.have.been.calledWith(
          'db1',
          'coll1',
          {},
          {},
          { writeConcern: { w: 'majority' } }
        );
      });

      it('returns an ExplainOutput object when explained', async function () {
        serviceProvider.updateMany.resolves({ ok: 1 } as any);

        const explained = await collection.updateMany(
          {},
          {},
          { explain: 'queryPlanner' }
        );
        expect((await toShellResult(explained)).type).to.equal('ExplainOutput');
        expect((await toShellResult(explained)).printable).to.deep.equal({
          ok: 1,
        });
      });
    });

    describe('createIndexes', function () {
      beforeEach(function () {
        serviceProvider.createIndexes.resolves(['index_1']);
      });

      context('when options is not passed', function () {
        it('calls serviceProvider.createIndexes using keyPatterns as keys', async function () {
          await collection.createIndexes([{ x: 1 }]);

          expect(serviceProvider.createIndexes).to.have.been.calledWith(
            'db1',
            'coll1',
            [{ key: { x: 1 } }]
          );
        });
      });

      context('when options is an object', function () {
        it('calls serviceProvider.createIndexes merging options', async function () {
          await collection.createIndexes([{ x: 1 }], { name: 'index-1' });

          expect(serviceProvider.createIndexes).to.have.been.calledWith(
            'db1',
            'coll1',
            [{ key: { x: 1 }, name: 'index-1' }],
            { name: 'index-1' }
          );
        });
        it('should allow commitQuorum parameter', async function () {
          await collection.createIndexes([{ x: 1 }], { name: 'index-1' }, 3);

          expect(serviceProvider.createIndexes).to.have.been.calledWith(
            'db1',
            'coll1',
            [{ key: { x: 1 }, name: 'index-1' }],
            { name: 'index-1', commitQuorum: 3 }
          );
        });
      });
      context('when options is not an object', function () {
        it('throws an error', async function () {
          const error = await collection
            .createIndexes([{ x: 1 }], 'unsupported' as any)
            .catch((e) => e);

          expect(error).to.be.instanceOf(MongoshInvalidInputError);
          expect(error.message).to.contain(
            'The "options" argument must be an object.'
          );
          expect(error.code).to.equal(CommonErrors.InvalidArgument);
        });
      });
    });

    for (const method of ['ensureIndex', 'createIndex'] as const) {
      describe(method, function () {
        beforeEach(function () {
          serviceProvider.createIndexes.resolves(['index_1']);
        });

        context('when options is not passed', function () {
          it('calls serviceProvider.createIndexes using keys', async function () {
            await collection[method]({ x: 1 });

            expect(serviceProvider.createIndexes).to.have.been.calledWith(
              'db1',
              'coll1',
              [{ key: { x: 1 } }]
            );
          });
        });

        context('when options is an object', function () {
          it('calls serviceProvider.createIndexes merging options', async function () {
            await collection[method]({ x: 1 }, { name: 'index-1' });

            expect(serviceProvider.createIndexes).to.have.been.calledWith(
              'db1',
              'coll1',
              [{ key: { x: 1 }, name: 'index-1' }],
              { name: 'index-1' }
            );
          });
          it('should allow commitQuorum parameter', async function () {
            await collection[method]({ x: 1 }, { name: 'index-1' }, 3);

            expect(serviceProvider.createIndexes).to.have.been.calledWith(
              'db1',
              'coll1',
              [{ key: { x: 1 }, name: 'index-1' }],
              { name: 'index-1', commitQuorum: 3 }
            );
          });
        });

        context('when options is not an object', function () {
          it('throws an error', async function () {
            const error = await collection[method](
              { x: 1 },
              'unsupported' as any
            ).catch((e) => e);

            expect(error).to.be.instanceOf(MongoshInvalidInputError);
            expect(error.message).to.contain(
              'The "options" argument must be an object.'
            );
            expect(error.code).to.equal(CommonErrors.InvalidArgument);
          });
        });
      });
    }

    for (const method of [
      'getIndexes',
      'getIndexSpecs',
      'getIndices',
    ] as const) {
      describe(method, function () {
        let result: Document[];
        beforeEach(function () {
          result = [
            {
              v: 2,
              key: {
                _id: 1,
              },
              name: '_id_',
              ns: 'test.coll1',
            },
          ];
          serviceProvider.getIndexes.resolves(result);
        });

        it('returns serviceProvider.getIndexes using keys', async function () {
          expect(await collection[method]()).to.deep.equal(result);
        });
      });
    }

    describe('getIndexKeys', function () {
      let result: Document[];
      beforeEach(function () {
        result = [
          {
            v: 2,
            key: {
              _id: 1,
            },
            name: '_id_',
            ns: 'test.coll1',
          },
          {
            v: 2,
            key: {
              name: 1,
            },
            name: 'name_',
            ns: 'test.coll1',
          },
        ];
        serviceProvider.getIndexes.resolves(result);
      });

      it('returns only indexes keys', async function () {
        expect(await collection.getIndexKeys()).to.deep.equal([
          { _id: 1 },
          { name: 1 },
        ]);
      });
    });

    describe('dropIndexes', function () {
      context('when serviceProvider.dropIndexes resolves', function () {
        let result: Document;
        beforeEach(function () {
          result = { nIndexesWas: 3, ok: 1 };
          serviceProvider.runCommandWithCheck.resolves(result);
        });

        it('returns the result of serviceProvider.dropIndexes', async function () {
          expect(await collection.dropIndexes('index_1')).to.deep.equal(result);
        });

        it('defaults to removing all indexes', async function () {
          expect(await collection.dropIndexes()).to.deep.equal(result);
          expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
            database.getName(),
            { dropIndexes: collection.getName(), index: '*' },
            {}
          );
        });
      });

      context(
        'when serviceProvider.dropIndexes rejects IndexNotFound',
        function () {
          let expectedError: Error;
          beforeEach(function () {
            expectedError = new Error('index not found with name [index_1]');
            Object.assign(expectedError, {
              ok: 0,
              errmsg: 'index not found with name [index_1]',
              code: 27,
              codeName: 'IndexNotFound',
              name: 'MongoServerError',
            });

            serviceProvider.runCommandWithCheck.rejects(expectedError);
          });

          it('returns the error as object', async function () {
            let caughtError: Error | undefined;
            await collection
              .dropIndexes('index_1')
              .catch((err) => (caughtError = err));

            expect(caughtError).to.deep.equal(expectedError);
          });
        }
      );

      context(
        'when serviceProvider.dropIndexes rejects IndexNotFound because mongod 4.0 does not support arrays',
        function () {
          beforeEach(function () {
            const error = new Error('invalid index name spec');
            Object.assign(error, {
              ok: 0,
              errmsg: 'invalid index name spec',
              code: 27,
              codeName: 'IndexNotFound',
              name: 'MongoError',
            });

            // eslint-disable-next-line @typescript-eslint/require-await
            serviceProvider.runCommandWithCheck.callsFake(async (db, cmd) => {
              if (cmd.dropIndexes) {
                if (Array.isArray(cmd.index)) {
                  throw error;
                } else if (cmd.index === 'index_1') {
                  return { nIndexesWas: 2, ok: 1 };
                } else {
                  return { nIndexesWas: 3, ok: 1 };
                }
              } else if (cmd.buildInfo) {
                return { version: '4.0.0' };
              } else {
                expect.fail('unknown runCommandWithCheck');
              }
            });
          });

          it('falls back to multiple dropIndexes calls', async function () {
            expect(
              await collection.dropIndexes(['index_1', 'index_2'])
            ).to.deep.equal({ nIndexesWas: 3, ok: 1 });
          });
        }
      );

      context(
        'when serviceProvider.dropIndexes rejects any other error',
        function () {
          let error: Error;
          beforeEach(function () {
            error = new Error('Some error');
            serviceProvider.runCommandWithCheck.rejects(
              new Error('Some error')
            );
          });

          it('rejects with error', async function () {
            let caught!: Error;
            await collection.dropIndexes('index_1').catch((err) => {
              caught = err;
            });
            expect(caught.message).to.equal(error.message);
          });
        }
      );
    });

    describe('dropIndex', function () {
      context('when collection.dropIndexes resolves', function () {
        let result: Document;
        beforeEach(function () {
          result = { nIndexesWas: 3, ok: 1 };
          serviceProvider.runCommandWithCheck.resolves(result);
        });

        it('returns the result of serviceProvider.dropIndexes', async function () {
          expect(await collection.dropIndex('index_1')).to.deep.equal(result);
        });

        it('throws if index is "*"', async function () {
          let caught!: Error & { code?: string };
          await collection.dropIndex('*').catch((err) => {
            caught = err;
          });

          expect(caught).to.be.instanceOf(MongoshInvalidInputError);
          expect(caught.message).to.contain(
            "To drop indexes in the collection using '*', use db.collection.dropIndexes()."
          );
          expect(caught.code).to.equal(CommonErrors.InvalidArgument);
        });

        it('throws if index is an array', async function () {
          let caught!: Error & { code?: string };
          await collection.dropIndex(['index-1']).catch((err) => {
            caught = err;
          });

          expect(caught).to.be.instanceOf(MongoshInvalidInputError);
          expect(caught.message).to.contain(
            'The index to drop must be either the index name or the index specification document.'
          );
          expect(caught.code).to.equal(CommonErrors.InvalidArgument);
        });
      });
    });

    describe('totalIndexSize', function () {
      beforeEach(function () {
        const tryNext = sinon.stub();
        tryNext.onCall(0).resolves({ value: 1000 });
        tryNext.onCall(1).resolves(null);
        serviceProvider.aggregate.returns({ tryNext } as any);
      });

      it('returns totalIndexSize', async function () {
        expect(await collection.totalIndexSize()).to.equal(1000);
        expect(serviceProvider.aggregate).to.have.been.calledOnce;
      });

      it('throws an error if called with verbose', async function () {
        let caught!: Error & { code?: string };
        await collection.totalIndexSize(true).catch((err) => {
          caught = err;
        });

        expect(caught).to.be.instanceOf(MongoshInvalidInputError);
        expect(caught.message).to.contain(
          '"totalIndexSize" takes no argument. Use db.collection.stats to get detailed information.'
        );
        expect(caught.code).to.equal(CommonErrors.InvalidArgument);
      });
    });

    describe('reIndex', function () {
      it('returns the result of serviceProvider.dropIndexes', async function () {
        expect(await collection.reIndex()).to.deep.equal({ ok: 1 });
        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          'db1',
          {
            reIndex: 'coll1',
          }
        );
      });
    });

    describe('stats', function () {
      beforeEach(function () {
        const serviceProviderCursor = stubInterface<ServiceProviderCursor>();
        serviceProviderCursor.limit.returns(serviceProviderCursor);
        serviceProviderCursor.tryNext.returns(undefined as any);
        serviceProvider.find.returns(serviceProviderCursor);

        const tryNext = sinon.stub();
        tryNext.onCall(0).resolves({ storageStats: {} });
        tryNext.onCall(1).resolves(null);
        serviceProvider.aggregate.returns({ tryNext } as any);
      });

      it('calls serviceProvider.aggregate on the database with no options', async function () {
        await collection.stats();

        expect(serviceProvider.aggregate).to.have.been.calledOnce;
        expect(serviceProvider.aggregate.firstCall.args[0]).to.equal(
          database._name
        );
        expect(serviceProvider.aggregate.firstCall.args[1]).to.equal(
          collection._name
        );
        expect(serviceProvider.aggregate.firstCall.args[2][0]).to.deep.equal({
          $collStats: {
            storageStats: {
              scale: 1,
            },
          },
        });
      });

      it('calls serviceProvider.aggregate on the database with the default scale option', async function () {
        await collection.stats({ scale: 2 });

        expect(serviceProvider.aggregate).to.have.been.calledOnce;
        expect(serviceProvider.aggregate.firstCall.args[0]).to.equal(
          database._name
        );
        expect(serviceProvider.aggregate.firstCall.args[1]).to.equal(
          collection._name
        );
        expect(serviceProvider.aggregate.firstCall.args[2][0]).to.deep.equal({
          $collStats: {
            storageStats: {
              // We scale the results ourselves, this checks we are passing the default scale.
              scale: 1,
            },
          },
        });
      });

      it('calls serviceProvider.aggregate on the database with default scale when legacy scale is passed', async function () {
        await collection.stats(2);

        expect(serviceProvider.aggregate).to.have.been.calledOnce;
        expect(serviceProvider.aggregate.firstCall.args[0]).to.equal(
          database._name
        );
        expect(serviceProvider.aggregate.firstCall.args[1]).to.equal(
          collection._name
        );
        expect(serviceProvider.aggregate.firstCall.args[2][0]).to.deep.equal({
          $collStats: {
            storageStats: {
              // We scale the results ourselves, this checks we are passing the default scale.
              scale: 1,
            },
          },
        });
      });

      context(
        'when the user lacks permissions to check for the sharding cluster collection in config',
        function () {
          beforeEach(function () {
            const serviceProviderCursor =
              stubInterface<ServiceProviderCursor>();
            serviceProviderCursor.limit.returns(serviceProviderCursor);
            serviceProviderCursor.tryNext.returns(undefined as any);
            // Throw an error when attempting to check permissions.
            serviceProvider.find.onCall(0).returns(false as any);
            serviceProvider.find.onCall(1).returns(serviceProviderCursor);
          });

          context(
            'when there is more than one collStats document returned',
            function () {
              beforeEach(function () {
                const tryNext = sinon.stub();
                tryNext.onCall(0).resolves({ storageStats: {} });
                tryNext.onCall(1).resolves({ storageStats: {} });
                tryNext.onCall(2).resolves({ storageStats: {} });
                tryNext.onCall(3).resolves(null);
                serviceProvider.aggregate.returns({ tryNext } as any);
              });

              it('returns sharded `true`', async function () {
                const stats = await collection.stats(2);
                expect(stats.sharded).to.equal(true);
              });
            }
          );

          context('when there is one collStats document returned', function () {
            it('returns sharded `false`', async function () {
              const stats = await collection.stats(2);
              expect(stats.sharded).to.equal(false);
            });
          });
        }
      );

      context('deprecated fallback', function () {
        context(
          'when the aggregation fails with error code that is not `13388`',
          function () {
            beforeEach(function () {
              const tryNext = sinon.stub();
              const mockError: any = new Error('test error');
              mockError.code = 123;
              tryNext.onCall(0).rejects(mockError);
              serviceProvider.aggregate.returns({ tryNext } as any);
            });

            it('does not run the deprecated collStats command', async function () {
              const error = await collection.stats().catch((e) => e);

              expect(serviceProvider.runCommandWithCheck).to.not.have.been
                .called;
              expect(error.message).to.equal('test error');
            });
          }
        );

        context(
          'when the aggregation fails with error code `13388`',
          function () {
            for (const mockError of [
              {
                ...new Error('Code 13388'),
                code: 13388,
              },
              {
                ...new Error('Stale Config'),
                codeName: 'StaleConfig',
              },
              {
                ...new Error('Failed to Parse'),
                codeName: 'FailedToParse',
              },
            ]) {
              context(`in case of ${mockError.name} error`, function () {
                beforeEach(function () {
                  const tryNext = sinon.stub();
                  tryNext.onCall(0).rejects(mockError);
                  serviceProvider.aggregate.returns({ tryNext } as any);
                });

                it('runs the deprecated collStats command with the default scale', async function () {
                  await collection.stats();

                  expect(
                    serviceProvider.runCommandWithCheck
                  ).to.have.been.calledWith(database._name, {
                    collStats: collection._name,
                    scale: 1,
                  });
                });

                it('runs the deprecated collStats command with a custom scale', async function () {
                  await collection.stats({
                    scale: 1024, // Scale to kilobytes.
                  });

                  expect(
                    serviceProvider.runCommandWithCheck
                  ).to.have.been.calledWith(database._name, {
                    collStats: collection._name,
                    scale: 1024,
                  });
                });

                it('runs the deprecated collStats command with the legacy scale parameter', async function () {
                  await collection.stats(2);

                  expect(
                    serviceProvider.runCommandWithCheck
                  ).to.have.been.calledWith(database._name, {
                    collStats: collection._name,
                    scale: 2,
                  });
                });

                context(
                  'when the fallback collStats command fails',
                  function () {
                    beforeEach(function () {
                      serviceProvider.runCommandWithCheck.rejects(
                        new Error('not our error')
                      );
                    });

                    it('surfaces the original aggregation error', async function () {
                      const error = await collection.stats().catch((e) => e);

                      expect(serviceProvider.runCommandWithCheck).to.have.been
                        .called;
                      expect(error.message).to.equal(mockError.message);
                    });
                  }
                );
              });
            }
          }
        );
      });

      context('indexDetails', function () {
        let expectedResult: Document;
        let indexesResult: Document[];

        beforeEach(function () {
          expectedResult = {
            avgObjSize: 0,
            indexSizes: {},
            nindexes: 0,
            indexDetails: { k1_1: { details: 1 }, k2_1: { details: 2 } },
            ok: 1,
            ns: 'db1.coll1',
            sharded: false,
          };
          indexesResult = [
            { v: 2, key: { k1: 1 }, name: 'k1_1' },
            { v: 2, key: { k2: 1 }, name: 'k2_1' },
          ];
          const tryNext = sinon.stub();
          tryNext.onCall(0).resolves({
            storageStats: {
              indexDetails: expectedResult.indexDetails,
            },
          });
          tryNext.onCall(1).resolves(null);
          serviceProvider.aggregate.returns({ tryNext } as any);
          serviceProvider.getIndexes.resolves(indexesResult);
        });
        it('not returned when no args', async function () {
          const result = await collection.stats();
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { indexDetails, ...expectedResultWithoutIndexDetails } =
            expectedResult;
          expect(result).to.deep.equal(expectedResultWithoutIndexDetails);
        });
        it('not returned when options indexDetails: false', async function () {
          const result = await collection.stats({ indexDetails: false });
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { indexDetails, ...expectedResultWithoutIndexDetails } =
            expectedResult;
          expect(result).to.deep.equal(expectedResultWithoutIndexDetails);
        });
        it('returned all when true, even if no key/name set', async function () {
          const result = await collection.stats({ indexDetails: true });
          expect(result).to.deep.equal(expectedResult);
        });
        it('returned only 1 when indexDetailsName set', async function () {
          const result = await collection.stats({
            indexDetails: true,
            indexDetailsName: 'k2_1',
          });
          expect(result).to.deep.equal({
            ...expectedResult,
            indexDetails: { k2_1: expectedResult.indexDetails.k2_1 },
          });
        });
        it('returned all when indexDetailsName set but not found', async function () {
          const result = await collection.stats({
            indexDetails: true,
            indexDetailsName: 'k3_1',
          });
          expect(result).to.deep.equal(expectedResult);
        });
        it('returned only 1 when indexDetailsKey set', async function () {
          const result = await collection.stats({
            indexDetails: true,
            indexDetailsKey: indexesResult[1].key,
          });
          expect(result).to.deep.equal({
            ...expectedResult,
            indexDetails: { k2_1: expectedResult.indexDetails.k2_1 },
          });
        });
        it('returned all when indexDetailsKey set but not found', async function () {
          const result = await collection.stats({
            indexDetails: true,
            indexDetailsKey: { other: 1 },
          });
          expect(result).to.deep.equal(expectedResult);
        });
        it('throws when indexDetailsName and indexDetailsKey are given', async function () {
          const error = await collection
            .stats({
              indexDetails: true,
              indexDetailsName: 'k2_1',
              indexDetailsKey: { other: 1 },
            })
            .catch((e) => e);

          expect(error).to.be.instanceOf(MongoshInvalidInputError);
          expect(error.message).to.contain(
            'Cannot filter indexDetails on both indexDetailsKey and indexDetailsName'
          );
          expect(error.code).to.equal(CommonErrors.InvalidArgument);
        });
        it('throws when indexDetailsKey is not an object', async function () {
          const error = await collection
            .stats({ indexDetails: true, indexDetailsKey: 'string' } as any)
            .catch((e) => e);

          expect(error).to.be.instanceOf(MongoshInvalidInputError);
          expect(error.message).to.contain(
            'Expected options.indexDetailsKey to be a document'
          );
          expect(error.code).to.equal(CommonErrors.InvalidArgument);
        });
        it('throws when indexDetailsName is not a string', async function () {
          const error = await collection
            .stats({ indexDetails: true, indexDetailsName: {} } as any)
            .catch((e) => e);

          expect(error).to.be.instanceOf(MongoshInvalidInputError);
          expect(error.message).to.contain(
            'Expected options.indexDetailsName to be a string'
          );
          expect(error.code).to.equal(CommonErrors.InvalidArgument);
        });
      });

      it('throws if serviceProvider.aggregate rejects', async function () {
        const expectedError = new Error();
        const tryNext = sinon.stub();
        tryNext.onCall(0).rejects(expectedError);
        tryNext.onCall(1).resolves(null);
        serviceProvider.aggregate.returns({ tryNext } as any);
        const caughtError = await collection.stats().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('throws if serviceProvider.aggregate returns undefined', async function () {
        const tryNext = sinon.stub();
        tryNext.onCall(0).resolves(undefined);
        tryNext.onCall(1).resolves(null);
        serviceProvider.aggregate.returns({ tryNext } as any);
        const error = await collection
          .stats({ indexDetails: true, indexDetailsName: 'k2_1' })
          .catch((e) => e);

        expect(error).to.be.instanceOf(MongoshRuntimeError);
        expect(error.message).to.contain(
          'Error running $collStats aggregation stage'
        );
      });
    });

    describe('dataSize', function () {
      beforeEach(function () {
        const tryNext = sinon.stub();
        tryNext.onCall(0).resolves({ value: 1000 });
        tryNext.onCall(1).resolves(null);
        serviceProvider.aggregate.returns({ tryNext } as any);
      });

      it('returns stats.size', async function () {
        expect(await collection.dataSize()).to.equal(1000);
        expect(serviceProvider.aggregate).to.have.been.calledOnce;
      });
    });

    describe('storageSize', function () {
      beforeEach(function () {
        const tryNext = sinon.stub();
        tryNext.onCall(0).resolves({ value: 1000 });
        tryNext.onCall(1).resolves(null);
        serviceProvider.aggregate.returns({ tryNext } as any);
      });

      it('returns stats.storageSize', async function () {
        expect(await collection.storageSize()).to.equal(1000);
        expect(serviceProvider.aggregate).to.have.been.calledOnce;
      });
    });

    describe('totalSize', function () {
      beforeEach(function () {
        const tryNext = sinon.stub();
        tryNext.onCall(0).resolves({ value: 1000 });
        tryNext.onCall(1).resolves(null);
        serviceProvider.aggregate.returns({ tryNext } as any);
      });

      it('returns stats.totalSize', async function () {
        expect(await collection.totalSize()).to.equal(1000);
        expect(serviceProvider.aggregate).to.have.been.calledOnce;
      });
    });

    describe('drop', function () {
      it('re-throws an error that is not NamespaceNotFound', async function () {
        const error = new Error();
        serviceProvider.dropCollection.rejects(error);
        expect(await collection.drop().catch((e) => e)).to.equal(error);
      });

      it('passes through options', async function () {
        serviceProvider.listCollections.resolves([{}]);
        serviceProvider.dropCollection.resolves();
        await collection.drop({ promoteValues: false });
        expect(serviceProvider.dropCollection).to.have.been.calledWith(
          'db1',
          'coll1',
          { promoteValues: false }
        );
      });
    });

    describe('getFullName', function () {
      it('returns the namespaced collection name', function () {
        expect(collection.getFullName()).to.equal('db1.coll1');
      });
    });

    describe('getName', function () {
      it('returns the namespaced collection name', function () {
        expect(collection.getName()).to.equal('coll1');
      });
    });

    describe('findAndModify', function () {
      let mockResult: Document;

      beforeEach(function () {
        mockResult = { value: {} };
        serviceProvider.findOneAndUpdate.resolves(mockResult);
        serviceProvider.findOneAndReplace.resolves(mockResult);
        serviceProvider.findOneAndDelete.resolves(mockResult);
      });

      it('returns result.value from serviceProvider.findOneAndReplace', async function () {
        expect(
          await collection.findAndModify({ query: {}, update: {} })
        ).to.equal(mockResult.value);
        expect(serviceProvider.findOneAndReplace).to.have.been.calledWith(
          collection._database._name,
          collection._name,
          {},
          {}
        );
      });

      it('throws if no query is provided', async function () {
        try {
          await collection.findAndModify({} as any);
        } catch (e: any) {
          return expect(e.name).to.equal('MongoshInvalidInputError');
        }
        expect.fail('MongoshInvalidInputError not thrown for findAndModify');
      });
      it('throws if no argument is provided', async function () {
        try {
          await (collection.findAndModify as any)();
        } catch (e: any) {
          return expect(e.name).to.equal('MongoshInvalidInputError');
        }
        expect.fail('MongoshInvalidInputError not thrown for findAndModify');
      });

      it('calls the service provider with the correct options', async function () {
        const options = {
          remove: true,
          new: true,
          fields: { projection: 1 },
          upsert: true,
          bypassDocumentValidation: true,
          writeConcern: { writeConcern: 1 },
          collation: { collation: 1, locale: 'en_US' },
          arrayFilters: [{ filter: 1 }],
        };

        await collection.findAndModify({
          query: { query: 1 },
          sort: { sort: 1 },
          update: { update: 1 },
          ...options,
        });

        const { fields: projection, ...expectedOptions } = options;
        expect(serviceProvider.findOneAndDelete).to.have.been.calledWith(
          collection._database._name,
          collection._name,
          { query: 1 },
          { ...expectedOptions, sort: { sort: 1 }, projection }
        );
      });
    });

    describe('renameCollection', function () {
      let mockResult: any;

      beforeEach(function () {
        mockResult = {};
        serviceProvider.renameCollection.resolves(mockResult);
      });

      it('returns { ok: 1 } if the operation is successful', async function () {
        expect(await collection.renameCollection('newName')).to.deep.equal({
          ok: 1,
        });
      });

      it('calls the service provider with dropTarget=false if none is provided', async function () {
        await collection.renameCollection('newName');

        expect(serviceProvider.renameCollection).to.have.been.calledWith(
          collection._database._name,
          collection._name,
          'newName',
          { dropTarget: false }
        );
      });

      it('calls the service provider with the correct options', async function () {
        await collection.renameCollection('newName', true);

        expect(serviceProvider.renameCollection).to.have.been.calledWith(
          collection._database._name,
          collection._name,
          'newName',
          { dropTarget: true }
        );
      });

      it('rethrows a generic error', async function () {
        const error: any = new Error();

        serviceProvider.renameCollection.rejects(error);

        expect(
          await collection.renameCollection('newName').catch((e) => e)
        ).to.equal(error);
      });

      it('returns a MongoError with { ok: 0 } instead of throwing', async function () {
        const error: any = new Error();
        error.name = 'MongoError';
        error.code = 123;
        error.errmsg = 'msg';
        error.codeName = 'NamespaceNotFound';

        serviceProvider.renameCollection.rejects(error);

        expect(await collection.renameCollection('newName')).to.deep.equal({
          code: error.code,
          errmsg: error.errmsg,
          codeName: error.codeName,
          ok: 0,
        });
      });

      it('throws an error if newName is not a string', async function () {
        try {
          await collection.renameCollection({} as any);
          expect.fail('expected error');
        } catch (e: any) {
          expect(e.message).to.include('type string');
          expect(e.name).to.equal('MongoshInvalidInputError');
          expect(e.code).to.equal(CommonErrors.InvalidArgument);
        }
      });
    });

    describe('runCommand', function () {
      it('calls serviceProvider.runCommand with the collection set', async function () {
        await collection.runCommand('someCommand', {
          someOption: 1,
        } as any);

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          collection._database._name,
          {
            someCommand: collection._name,
            someOption: 1,
          }
        );
      });

      it('can be called without options', async function () {
        await collection.runCommand('someCommand');

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          collection._database._name,
          {
            someCommand: collection._name,
          }
        );
      });

      it('accepts an explicit options object as its first command for legacy compatibility', async function () {
        await collection.runCommand({ someCommand: 'differenttestns' });

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          collection._database._name,
          {
            someCommand: 'differenttestns',
          }
        );
      });

      it('throws an error if commandName is not a string', async function () {
        const e = await collection.runCommand(42 as any).catch((e) => e);

        expect(e).to.be.instanceOf(MongoshInvalidInputError);
        expect(e.message).to.include('type string');
        expect(e.code).to.equal(CommonErrors.InvalidArgument);
      });

      it('throws an error if both arguments are options objects', async function () {
        const e = await collection.runCommand({}, {}).catch((e) => e);

        expect(e).to.be.instanceOf(MongoshInvalidInputError);
        expect(e.message).to.include(
          'takes a command string as its first arugment'
        );
        expect(e.code).to.equal(CommonErrors.InvalidArgument);
      });

      it('throws an error if commandName is passed as option', async function () {
        const e = await collection
          .runCommand('commandName', { commandName: 1 } as any)
          .catch((e) => e);

        expect(e).to.be.instanceOf(MongoshInvalidInputError);
        expect(e.message).to.contain(
          'The "commandName" argument cannot be passed as an option to "runCommand".'
        );
        expect(e.code).to.equal(CommonErrors.InvalidArgument);
      });
    });

    describe('explain', function () {
      it('returns an Explainable object', function () {
        expect(collection.explain()).to.have.instanceOf(Explainable);
      });

      it('accepts valid verbosity', function () {
        expect(collection.explain('queryPlanner')._verbosity).to.equal(
          'queryPlanner'
        );

        expect(collection.explain('executionStats')._verbosity).to.equal(
          'executionStats'
        );

        expect(collection.explain('allPlansExecution')._verbosity).to.equal(
          'allPlansExecution'
        );

        expect(collection.explain(true)._verbosity).to.equal(
          'allPlansExecution'
        );

        expect(collection.explain(false)._verbosity).to.equal('queryPlanner');
      });

      it('throws in case of non valid verbosity', function () {
        expect(() => {
          collection.explain(0 as any);
        }).to.throw('verbosity must be a string');
      });

      it('sets the right default verbosity', function () {
        const explainable = collection.explain();
        expect(explainable._verbosity).to.equal('queryPlanner');
      });
    });

    describe('latencyStats', function () {
      it('calls serviceProvider.aggregate on the database with options', async function () {
        // eslint-disable-next-line @typescript-eslint/require-await
        serviceProvider.aggregate.returns({ tryNext: async () => null } as any);
        await collection.latencyStats({ histograms: true });

        expect(serviceProvider.aggregate).to.have.been.calledWith(
          database._name,
          collection._name,
          [
            {
              $collStats: { latencyStats: { histograms: true } },
            },
          ],
          {}
        );
      });

      it('returns whatever serviceProvider.aggregate returns', async function () {
        const tryNext = sinon.stub();
        tryNext.onCall(0).resolves({ 1: 'db1' });
        tryNext.onCall(1).resolves(null);
        serviceProvider.aggregate.returns({ tryNext } as any);
        const result = await collection.latencyStats();
        expect(result).to.deep.equal([{ 1: 'db1' }]);
      });

      it('throws if serviceProvider.aggregate rejects', async function () {
        const expectedError = new Error();
        serviceProvider.aggregate.throws(expectedError);
        const caughtError = await collection.latencyStats().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });

    describe('initializeUnorderedBulkOp', function () {
      it('calls serviceProvider.aggregate on the database with options', async function () {
        await collection.initializeUnorderedBulkOp();

        expect(serviceProvider.initializeBulkOp).to.have.been.calledWith(
          database._name,
          collection._name,
          false
        );
      });

      it('returns Bulk wrapping whatever serviceProvider returns', async function () {
        const expectedResult = { batches: [] } as any;
        serviceProvider.initializeBulkOp.resolves(expectedResult);
        const result = await collection.initializeUnorderedBulkOp();
        expect((await toShellResult(result)).type).to.equal('Bulk');
        expect(result._serviceProviderBulkOp).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.initializeBulkOp rejects', async function () {
        const expectedError = new Error();
        serviceProvider.initializeBulkOp.throws(expectedError);
        const caughtError = await collection
          .initializeUnorderedBulkOp()
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('initializeOrderedBulkOp', function () {
      it('calls serviceProvider.aggregate on the database with options', async function () {
        await collection.initializeOrderedBulkOp();

        expect(serviceProvider.initializeBulkOp).to.have.been.calledWith(
          database._name,
          collection._name,
          true
        );
      });

      it('returns Bulk wrapped in whatever serviceProvider returns', async function () {
        const expectedResult = { batches: [] } as any;
        serviceProvider.initializeBulkOp.resolves(expectedResult);
        const result = await collection.initializeOrderedBulkOp();
        expect((await toShellResult(result)).type).to.equal('Bulk');
        expect(result._serviceProviderBulkOp).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider rejects', async function () {
        const expectedError = new Error();
        serviceProvider.initializeBulkOp.throws(expectedError);
        const caughtError = await collection
          .initializeOrderedBulkOp()
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('getPlanCache', function () {
      it('returns a PlanCache object', async function () {
        const pc = collection.getPlanCache();
        expect(pc[shellApiType]).to.equal('PlanCache');
        expect((await toShellResult(pc)).printable).to.equal(
          'PlanCache for collection coll1.'
        );
      });
    });
    describe('validate', function () {
      it('calls serviceProvider.runCommand on the collection default', async function () {
        serviceProvider.runCommandWithCheck.resolves({ ok: 1 });
        await collection.validate();
        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            validate: collection._name,
            full: false,
          }
        );
      });
      it('calls serviceProvider.runCommand on the collection with boolean argument', async function () {
        await collection.validate(true);
        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            validate: collection._name,
            full: true,
          }
        );
      });
      it('calls serviceProvider.runCommand on the collection with options', async function () {
        await collection.validate({ full: true, repair: true });
        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            validate: collection._name,
            full: true,
            repair: true,
          }
        );
      });

      it('returns whatever serviceProvider.runCommand returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await collection.validate();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommand rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await collection.validate().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('mapReduce', function () {
      let mapFn: () => void;
      let reduceFn: (a: string, b: string[]) => string;
      beforeEach(function () {
        mapFn = function (): void {};
        reduceFn = function (keyCustId, valuesPrices): string {
          return valuesPrices.reduce((t, s) => t + s);
        };
      });
      it('calls serviceProvider.mapReduce on the collection with js args', async function () {
        serviceProvider.runCommandWithCheck.resolves({ ok: 1 });
        await collection.mapReduce(mapFn, reduceFn, {
          out: 'map_reduce_example',
        });
        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            mapReduce: collection._name,
            map: mapFn,
            reduce: reduceFn,
            out: 'map_reduce_example',
          }
        );
      });
      it('calls serviceProvider.runCommand on the collection with string args', async function () {
        serviceProvider.runCommandWithCheck.resolves({ ok: 1 });
        await collection.mapReduce(mapFn.toString(), reduceFn.toString(), {
          out: 'map_reduce_example',
        });
        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          database._name,
          {
            mapReduce: collection._name,
            map: mapFn.toString(),
            reduce: reduceFn.toString(),
            out: 'map_reduce_example',
          }
        );
      });

      it('returns whatever serviceProvider.mapReduce returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await collection.mapReduce(mapFn, reduceFn, {
          out: { inline: 1 },
        });
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.mapReduce rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await collection
          .mapReduce(mapFn, reduceFn, { out: { inline: 1 } })
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });

      it('throws if options is an object and options.out is not defined', async function () {
        const error = await collection
          .mapReduce(mapFn, reduceFn, {})
          .catch((e) => e);
        expect(error).to.be.instanceOf(MongoshInvalidInputError);
        expect(error.message).to.contain("Missing 'out' option");
        expect(error.code).to.equal(CommonErrors.InvalidArgument);
      });
    });
    describe('getShardVersion', function () {
      it('calls serviceProvider.runCommand on the database with options', async function () {
        await collection.getShardVersion();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            getShardVersion: `${database._name}.${collection._name}`,
          }
        );
      });

      it('returns whatever serviceProvider.runCommand returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await collection.getShardVersion();
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommand rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await collection.getShardVersion().catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('getShardDistribution', function () {
      it('throws when collection is not sharded', async function () {
        const serviceProviderCursor = stubInterface<ServiceProviderCursor>();
        serviceProviderCursor.limit.returns(serviceProviderCursor);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        serviceProviderCursor.tryNext.returns(null as any);
        serviceProvider.find.returns(serviceProviderCursor);

        const tryNext = sinon.stub();
        tryNext.onCall(0).resolves({ storageStats: {} });
        tryNext.onCall(1).resolves(null);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        serviceProvider.aggregate.returns({ tryNext } as any);

        const error = await collection.getShardDistribution().catch((e) => e);

        expect(error).to.be.instanceOf(MongoshInvalidInputError);
        expect(error.message).to.contain('is not sharded');
        expect(error.code).to.equal(
          ShellApiErrors.NotConnectedToShardedCluster
        );
      });

      describe('with orphan documents', function () {
        const mockedNumChunks = 2;
        const mockedCollectionConfigInfo = {};
        const mockedShardStats = {
          shard: 'test-shard',
          storageStats: {
            size: 1000,
            numOrphanDocs: 10,
            avgObjSize: 7,
            count: 15,
          },
        };
        const mockedShardInfo = {
          host: 'dummy-host',
        };

        beforeEach(function () {
          const serviceProviderCursor = stubInterface<ServiceProviderCursor>();

          // Make find and limit have no effect so the value of findOne is determined by tryNext.
          serviceProviderCursor.limit.returns(serviceProviderCursor);
          serviceProvider.find.returns(serviceProviderCursor);

          // Mock according to the order of findOne calls getShardDistribution uses.
          serviceProviderCursor.tryNext
            .onCall(0)
            .resolves(mockedCollectionConfigInfo);
          serviceProviderCursor.tryNext.onCall(1).resolves(mockedShardInfo);
          serviceProvider.countDocuments.returns(
            Promise.resolve(mockedNumChunks)
          );

          const aggregateTryNext = sinon.stub();
          aggregateTryNext.onCall(0).resolves(mockedShardStats);
          aggregateTryNext.onCall(1).resolves(null);

          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          serviceProvider.aggregate.returns({
            tryNext: aggregateTryNext,
          } as any);
        });

        it('should account for numOrphanDocs when calculating size', async function () {
          const shardDistribution = await collection.getShardDistribution();

          const { storageStats } = mockedShardStats;
          expect(shardDistribution.type).equals('StatsResult');
          const adjustedSize =
            storageStats.size -
            storageStats.numOrphanDocs * storageStats.avgObjSize;
          expect(shardDistribution.value.Totals.data).equals(
            `${adjustedSize}B`
          );
          const shardField = Object.keys(shardDistribution.value).find(
            (field) => field !== 'Totals'
          ) as `Shard ${string} at ${string}`;

          expect(shardField).not.undefined;
          expect(
            shardDistribution.value[shardField]['estimated data per chunk']
          ).equals(`${adjustedSize / mockedNumChunks}B`);
        });
      });
    });

    describe('analyzeShardKey', function () {
      it('calls serviceProvider.runCommand on the admin database', async function () {
        await collection.analyzeShardKey({ myKey: 1 });

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            analyzeShardKey: `${database._name}.${collection._name}`,
            key: { myKey: 1 },
          }
        );
      });

      it('returns whatever serviceProvider.runCommand returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await collection.analyzeShardKey({ myKey: 1 });
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommand rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await collection
          .analyzeShardKey({ myKey: 1 })
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });

    describe('configureQueryAnalyzer', function () {
      it('calls serviceProvider.runCommand on the admin database', async function () {
        await collection.configureQueryAnalyzer({
          mode: 'full',
          sampleRate: 1,
        });

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          ADMIN_DB,
          {
            configureQueryAnalyzer: `${database._name}.${collection._name}`,
            mode: 'full',
            sampleRate: new bson.Double(1),
          }
        );
      });

      it('returns whatever serviceProvider.runCommand returns', async function () {
        const expectedResult = { ok: 1 };
        serviceProvider.runCommandWithCheck.resolves(expectedResult);
        const result = await collection.configureQueryAnalyzer({
          mode: 'full',
          sampleRate: 1,
        });
        expect(result).to.deep.equal(expectedResult);
      });

      it('throws if serviceProvider.runCommand rejects', async function () {
        const expectedError = new Error();
        serviceProvider.runCommandWithCheck.rejects(expectedError);
        const caughtError = await collection
          .configureQueryAnalyzer({ mode: 'full', sampleRate: 1 })
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });

    describe('checkMetadataConsistency', function () {
      it('calls serviceProvider.runCursorCommand and returns a RunCommandCursor', async function () {
        const providerCursor = stubInterface<ServiceProviderRunCommandCursor>();
        serviceProvider.runCursorCommand.returns(providerCursor);
        const runCommandCursor = await collection.checkMetadataConsistency();
        expect(runCommandCursor._cursor).to.equal(providerCursor);
        expect(serviceProvider.runCursorCommand).to.have.been.calledWith(
          'db1',
          { checkMetadataConsistency: 'coll1' },
          {}
        );
      });
    });

    describe('return information about the collection as metadata', function () {
      let serviceProviderCursor: StubbedInstance<ServiceProviderCursor>;
      let proxyCursor: ServiceProviderCursor;

      beforeEach(function () {
        serviceProviderCursor = stubInterface<ServiceProviderCursor>();
        serviceProviderCursor.limit.returns(serviceProviderCursor);
        serviceProviderCursor.tryNext.resolves({ _id: 'abc' });
        proxyCursor = new Proxy(serviceProviderCursor, {
          get: (target, prop): any => {
            if (prop === 'closed') {
              return false;
            }
            return (target as any)[prop];
          },
        });
      });

      it('works for find()', async function () {
        serviceProvider.find.returns(proxyCursor);
        const cursor = collection.find();
        const result = await toShellResult(cursor);
        expect(result.type).to.equal('Cursor');
        expect(result)
          .to.have.nested.property('printable.documents.length')
          .not.equal(0);
        expect(result).to.have.nested.property(
          'printable.documents[0]._id',
          'abc'
        );
        expect(result.source).to.deep.equal({
          namespace: {
            db: 'db1',
            collection: 'coll1',
          },
        });
      });

      it('works for findOne()', async function () {
        serviceProvider.find.returns(serviceProviderCursor);
        const document = await collection.findOne({ hasBanana: true });
        const result = await toShellResult(document);
        expect(result.type).to.equal('Document');
        expect(result.printable._id).to.equal('abc');
        expect(result.source).to.deep.equal({
          namespace: {
            db: 'db1',
            collection: 'coll1',
          },
        });
      });

      it('works for getIndexes()', async function () {
        const fakeIndex = { v: 2, key: { _id: 1 }, name: '_id_' };
        serviceProvider.getIndexes.resolves([fakeIndex]);

        const indexResult = await collection.getIndexes();
        const result = await toShellResult(indexResult);
        expect(result.type).to.equal(null);
        expect(result.printable).to.deep.equal([fakeIndex]);
        expect(result.source).to.deep.equal({
          namespace: {
            db: 'db1',
            collection: 'coll1',
          },
        });
      });
    });
    describe('watch', function () {
      let fakeSpCursor: any;
      beforeEach(function () {
        fakeSpCursor = {
          closed: false,
          tryNext: async () => {},
        };
        serviceProvider.watch.returns(fakeSpCursor);
      });
      it('calls serviceProvider.watch when given no args', async function () {
        await collection.watch();
        expect(serviceProvider.watch).to.have.been.calledWith(
          [],
          {},
          {},
          collection._database._name,
          collection._name
        );
      });
      it('calls serviceProvider.watch when given pipeline arg', async function () {
        const pipeline = [{ $match: { operationType: 'insertOne' } }];
        await collection.watch(pipeline);
        expect(serviceProvider.watch).to.have.been.calledWith(
          pipeline,
          {},
          {},
          collection._database._name,
          collection._name
        );
      });
      it('calls serviceProvider.watch when given pipeline and ops args', async function () {
        const pipeline = [{ $match: { operationType: 'insertOne' } }];
        const ops = { batchSize: 1 };
        await collection.watch(pipeline, ops);
        expect(serviceProvider.watch).to.have.been.calledWith(
          pipeline,
          ops,
          {},
          collection._database._name,
          collection._name
        );
      });

      it('returns whatever serviceProvider.watch returns', async function () {
        const expectedCursor = new ChangeStreamCursor(
          fakeSpCursor,
          collection._name,
          mongo
        );
        const result = await collection.watch();
        expect(result).to.deep.equal(expectedCursor);
        expect(collection._mongo._instanceState.currentCursor).to.equal(result);
      });

      it('throws if serviceProvider.watch throws', async function () {
        const expectedError = new Error();
        serviceProvider.watch.throws(expectedError);
        try {
          await collection.watch();
        } catch (e: any) {
          expect(e).to.equal(expectedError);
          return;
        }
        expect.fail('Failed to throw');
      });
    });

    describe('getSearchIndexes', function () {
      let searchIndexes: Document[];

      beforeEach(function () {
        searchIndexes = [{ name: 'foo' }, { name: 'bar' }];
        serviceProvider.getSearchIndexes.resolves(searchIndexes);
      });

      context('without name or options', function () {
        it('calls serviceProvider.listSearchIndexes(), then toArray() on the returned cursor', async function () {
          const result = await collection.getSearchIndexes();

          expect(result).to.equal(searchIndexes);

          expect(serviceProvider.getSearchIndexes).to.have.been.calledWith(
            'db1',
            'coll1',
            undefined
          );
        });
      });

      context('with name', function () {
        it('calls serviceProvider.listSearchIndexes(name), then toArray() on the returned cursor', async function () {
          const result = await collection.getSearchIndexes('my-index');

          expect(result).to.equal(searchIndexes);

          expect(serviceProvider.getSearchIndexes).to.have.been.calledWith(
            'db1',
            'coll1',
            'my-index'
          );
        });
      });

      context('with options', function () {
        it('calls serviceProvider.listSearchIndexes(options), then toArray() on the returned cursor', async function () {
          const options = { allowDiskUse: true };
          const result = await collection.getSearchIndexes(options);

          expect(result).to.equal(searchIndexes);

          expect(serviceProvider.getSearchIndexes).to.have.been.calledWith(
            'db1',
            'coll1',
            undefined,
            options
          );
        });
      });

      context('with name and options', function () {
        it('calls serviceProvider.listSearchIndexes(name, options), then toArray() on the returned cursor', async function () {
          const options = { allowDiskUse: true };
          const result = await collection.getSearchIndexes('my-index', options);

          expect(result).to.equal(searchIndexes);

          expect(serviceProvider.getSearchIndexes).to.have.been.calledWith(
            'db1',
            'coll1',
            'my-index',
            options
          );
        });
      });
    });

    describe('createSearchIndex', function () {
      beforeEach(function () {
        serviceProvider.createSearchIndexes.resolves(['index_1']);
      });

      context('with definition options', function () {
        it('calls serviceProvider.createIndexes', async function () {
          await collection.createSearchIndex({ mappings: { dynamic: true } });

          expect(serviceProvider.createSearchIndexes).to.have.been.calledWith(
            'db1',
            'coll1',
            [{ name: 'default', definition: { mappings: { dynamic: true } } }]
          );
        });
      });

      context('with name, definition options', function () {
        it('calls serviceProvider.createIndexes', async function () {
          await collection.createSearchIndex('my-index', {
            mappings: { dynamic: true },
          });

          expect(serviceProvider.createSearchIndexes).to.have.been.calledWith(
            'db1',
            'coll1',
            [{ name: 'my-index', definition: { mappings: { dynamic: true } } }]
          );
        });
      });

      context('with name, definition options and type !== search', function () {
        it('calls serviceProvider.createSearchIndexes', async function () {
          await collection.createSearchIndex('my-index', 'vectorSearch', {
            mappings: { dynamic: true },
          });

          expect(serviceProvider.createSearchIndexes).to.have.been.calledWith(
            'db1',
            'coll1',
            [
              {
                name: 'my-index',
                type: 'vectorSearch',
                definition: { mappings: { dynamic: true } },
              },
            ]
          );
        });
      });

      context('with name, definition options and type === search', function () {
        it('calls serviceProvider.createSearchIndexes', async function () {
          await collection.createSearchIndex('my-index', 'search', {
            mappings: { dynamic: true },
          });

          expect(serviceProvider.createSearchIndexes).to.have.been.calledWith(
            'db1',
            'coll1',
            [{ name: 'my-index', definition: { mappings: { dynamic: true } } }]
          );
        });
      });

      context('with definition options and type but no name', function () {
        it('calls serviceProvider.createSearchIndexes', async function () {
          await collection.createSearchIndex(
            { mappings: { dynamic: true } },
            'vectorSearch'
          );

          expect(serviceProvider.createSearchIndexes).to.have.been.calledWith(
            'db1',
            'coll1',
            [
              {
                name: 'default',
                type: 'vectorSearch',
                definition: { mappings: { dynamic: true } },
              },
            ]
          );
        });
      });

      context('with description options', function () {
        it('calls serviceProvider.createSearchIndexes', async function () {
          await collection.createSearchIndex({
            name: 'my-index',
            type: 'vectorSearch',
            definition: {
              mappings: { dynamic: true },
            },
          });

          expect(serviceProvider.createSearchIndexes).to.have.been.calledWith(
            'db1',
            'coll1',
            [
              {
                name: 'my-index',
                type: 'vectorSearch',
                definition: { mappings: { dynamic: true } },
              },
            ]
          );
        });
      });
    });

    describe('createSearchIndexes', function () {
      beforeEach(function () {
        serviceProvider.createSearchIndexes.resolves(['index_1', 'index_2']);
      });

      it('calls serviceProvider.createIndexes', async function () {
        await collection.createSearchIndexes([
          { name: 'foo', definition: { mappings: { dynamic: true } } },
          { name: 'bar', definition: {} },
          { name: 'sch', type: 'search', definition: {} },
          { name: 'vec', type: 'vectorSearch', definition: {} },
        ]);

        expect(serviceProvider.createSearchIndexes).to.have.been.calledWith(
          'db1',
          'coll1',
          [
            { name: 'foo', definition: { mappings: { dynamic: true } } },
            { name: 'bar', definition: {} },
            { name: 'sch', definition: {} },
            { name: 'vec', type: 'vectorSearch', definition: {} },
          ]
        );
      });
    });

    describe('dropSearchIndex', function () {
      beforeEach(function () {
        serviceProvider.dropSearchIndex.resolves();
      });

      it('calls serviceProvider.dropSearchIndex', async function () {
        await collection.dropSearchIndex('foo');

        expect(serviceProvider.dropSearchIndex).to.have.been.calledWith(
          'db1',
          'coll1',
          'foo'
        );
      });
    });

    describe('updateSearchIndex', function () {
      beforeEach(function () {
        serviceProvider.updateSearchIndex.resolves();
      });

      it('calls serviceProvider.updateSearchIndex', async function () {
        await collection.updateSearchIndex('foo', {
          mappings: { dynamic: true },
        });

        expect(serviceProvider.updateSearchIndex).to.have.been.calledWith(
          'db1',
          'coll1',
          'foo',
          { mappings: { dynamic: true } }
        );
      });
    });
  });

  describe('fle2', function () {
    type ServerSchema = {
      db1: {
        collfle2: {
          schema: {};
        };
      };
    };
    let mongo1: Mongo<ServerSchema>;
    let mongo2: Mongo<ServerSchema>;
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let database: Database<ServerSchema, ServerSchema['db1']>;
    let bus: StubbedInstance<EventEmitter>;
    let instanceState: ShellInstanceState;
    let collection: Collection<
      ServerSchema,
      ServerSchema['db1'],
      ServerSchema['db1']['collfle2']
    >;
    let keyId: any[];
    beforeEach(function () {
      bus = stubInterface<EventEmitter>();
      serviceProvider = stubInterface<ServiceProvider>();
      serviceProvider.runCommand.resolves({ ok: 1 });
      serviceProvider.runCommandWithCheck.resolves({ ok: 1 });
      serviceProvider.initialDb = 'test';
      serviceProvider.bsonLibrary = bson;
      instanceState = new ShellInstanceState(serviceProvider, bus);
      keyId = [
        { $binary: { base64: 'oh3caogGQ4Sf34ugKnZ7Xw==', subType: '04' } },
      ];

      mongo1 = new Mongo<ServerSchema>(
        instanceState,
        undefined,
        {
          keyVaultNamespace: 'db1.keyvault',
          kmsProviders: { local: { key: 'A'.repeat(128) } },
          encryptedFieldsMap: {
            'db1.collfle2': {
              fields: [{ path: 'phoneNumber', keyId, bsonType: 'string' }],
            },
          },
        },
        undefined,
        serviceProvider
      );
      database = new Database<ServerSchema, ServerSchema['db1']>(
        mongo1,
        'db1' as StringKey<ServerSchema>
      );
      collection = new Collection(
        mongo1,
        database,
        'collfle2' as StringKey<ServerSchema['db1']>
      );
      mongo2 = new Mongo(
        instanceState,
        undefined,
        undefined,
        undefined,
        serviceProvider
      );
    });

    describe('drop', function () {
      it('does not pass encryptedFields through options when collection is in encryptedFieldsMap', async function () {
        serviceProvider.dropCollection.resolves();
        await collection.drop();
        expect(serviceProvider.dropCollection).to.have.been.calledWith(
          'db1',
          'collfle2',
          {}
        );
      });

      it('passes encryptedFields through options when collection is not in encryptedFieldsMap', async function () {
        serviceProvider.listCollections.resolves([
          {
            options: {
              encryptedFields: {
                fields: [{ path: 'phoneNumber', keyId, bsonType: 'string' }],
              },
            },
          },
        ]);
        serviceProvider.dropCollection.resolves();
        await mongo2.getDB('db1').getCollection('collfle2').drop();
        expect(serviceProvider.dropCollection).to.have.been.calledWith(
          'db1',
          'collfle2',
          {
            encryptedFields: {
              fields: [{ path: 'phoneNumber', keyId, bsonType: 'string' }],
            },
          }
        );
      });
    });

    describe('compactStructuredEncryptionData', function () {
      it('calls service provider runCommandWithCheck', async function () {
        const result = await collection.compactStructuredEncryptionData();

        expect(serviceProvider.runCommandWithCheck).to.have.been.calledWith(
          'db1',
          { compactStructuredEncryptionData: 'collfle2' }
        );
        expect(result).to.be.deep.equal({ ok: 1 });
      });
    });
  });
  describe('with session', function () {
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let collection: Collection;
    let internalSession: StubbedInstance<ServiceProviderSession>;
    const exceptions: {
      [key in keyof (typeof Collection)['prototype']]?: {
        a?: any;
        m?: string;
        i?: number;
        e?: boolean;
      };
    } = {
      renameCollection: { a: ['name'] },
      createIndexes: { a: [[]] },
      runCommand: { a: ['coll', {}], m: 'runCommandWithCheck', i: 2 },
      findOne: { m: 'find' },
      insert: { m: 'insertMany' },
      update: { m: 'updateOne', i: 4 },
      createIndex: { m: 'createIndexes' },
      ensureIndex: { m: 'createIndexes' },
      getIndexSpecs: { m: 'getIndexes', i: 2 },
      getIndices: { m: 'getIndexes', i: 2 },
      getIndexKeys: { m: 'getIndexes', i: 2 },
      dropIndex: { m: 'runCommandWithCheck', i: 2 },
      dropIndexes: { m: 'runCommandWithCheck', i: 2 },
      compactStructuredEncryptionData: { m: 'runCommandWithCheck' },
      convertToCapped: { m: 'runCommandWithCheck', i: 2 },
      dataSize: { m: 'aggregate', e: true },
      storageSize: { m: 'aggregate', e: true },
      totalSize: { m: 'aggregate', e: true },
      totalIndexSize: { m: 'aggregate', e: true, a: [] },
      drop: { m: 'dropCollection', i: 2 },
      exists: { m: 'listCollections', i: 2 },
      stats: { m: 'runCommandWithCheck', i: 2 },
      mapReduce: { m: 'runCommandWithCheck', i: 2 },
      validate: { m: 'runCommandWithCheck', i: 2 },
      getShardVersion: { m: 'runCommandWithCheck', i: 2 },
      analyzeShardKey: { a: [{ myKey: 1 }], m: 'runCommandWithCheck', i: 2 },
      configureQueryAnalyzer: {
        a: [{ mode: 'full', sampleRate: 1 }],
        m: 'runCommandWithCheck',
        i: 2,
      },
      latencyStats: { m: 'aggregate' },
      initializeOrderedBulkOp: { m: 'initializeBulkOp' },
      initializeUnorderedBulkOp: { m: 'initializeBulkOp' },
      distinct: { i: 4 },
      estimatedDocumentCount: { i: 2 },
      findAndModify: {
        a: [{ query: {}, update: {} }],
        m: 'findOneAndReplace',
        i: 4,
      },
      findOneAndReplace: { i: 4 },
      findOneAndUpdate: { i: 4 },
      replaceOne: { i: 4 },
      updateMany: { i: 4 },
      updateOne: { i: 4 },
      getIndexes: { i: 2 },
      reIndex: { m: 'runCommandWithCheck', i: 2 },
      hideIndex: { m: 'runCommandWithCheck', i: 2 },
      unhideIndex: { m: 'runCommandWithCheck', i: 2 },
      remove: { m: 'deleteMany' },
      watch: { i: 1 },
      getSearchIndexes: { i: 3 },
      checkMetadataConsistency: { m: 'runCursorCommand', i: 2 },
    };
    const ignore: (keyof (typeof Collection)['prototype'])[] = [
      'getShardDistribution',
      'stats',
      'isCapped',
      'compactStructuredEncryptionData',
      // none of these search index helpers take an options param, so they don't take session
      'createSearchIndex',
      'createSearchIndexes',
      'dropSearchIndex',
      'updateSearchIndex',
    ];
    const args = [{ query: {} }, {}, { out: 'coll' }];
    beforeEach(function () {
      const bus = stubInterface<EventEmitter>();
      serviceProvider = stubInterface<ServiceProvider>();
      serviceProvider.initialDb = 'test';
      serviceProvider.bsonLibrary = bson;
      internalSession = stubInterface<ServiceProviderSession>();
      serviceProvider.startSession.returns(internalSession);
      serviceProvider.aggregate.returns(
        stubInterface<ServiceProviderAggregationCursor>()
      );
      serviceProvider.find.returns(stubInterface<ServiceProviderCursor>());
      serviceProvider.getIndexes.resolves([]);
      serviceProvider.createIndexes.resolves(['index_1']);
      serviceProvider.listCollections.resolves([]);
      serviceProvider.watch.returns({
        closed: false,
        tryNext: async () => {},
      } as any);
      serviceProvider.countDocuments.resolves(1);
      serviceProvider.getSearchIndexes.resolves([]);
      serviceProvider.createSearchIndexes.resolves(['index_1']);
      serviceProvider.dropSearchIndex.resolves();
      serviceProvider.updateSearchIndex.resolves();

      serviceProvider.runCommandWithCheck.resolves({
        ok: 1,
        version: 1,
        bits: 1,
        commands: 1,
        users: [],
        roles: [],
        logComponentVerbosity: 1,
      });
      for (const k of [
        'bulkWrite',
        'deleteMany',
        'deleteOne',
        'insertMany',
        'insertOne',
        'replaceOne',
        'updateOne',
        'updateMany',
        'findOneAndDelete',
        'findOneAndReplace',
        'findOneAndUpdate',
      ] as const) {
        serviceProvider[k].resolves({ result: {}, value: {} } as any);
      }
      const instanceState = new ShellInstanceState(serviceProvider, bus);
      const mongo = new Mongo(
        instanceState,
        undefined,
        undefined,
        undefined,
        serviceProvider
      );
      const session = mongo.startSession();
      collection = session.getDatabase('db1').getCollection('coll');
    });
    context('all commands that use the same command in sp', function () {
      for (const method of (
        Object.getOwnPropertyNames(Collection.prototype) as (string &
          keyof (typeof Collection)['prototype'])[]
      ).filter(
        (k) =>
          typeof k === 'string' &&
          !ignore.includes(k) &&
          !Object.keys(exceptions).includes(k)
      )) {
        if (
          !method.startsWith('_') &&
          !method.startsWith('print') &&
          Collection.prototype[method].returnsPromise
        ) {
          it(`passes the session through for ${method}`, async function () {
            try {
              await collection[method](...args);
            } catch (e: any) {
              expect.fail(
                `Collection.${method} failed, error thrown ${e.message}`
              );
            }
            expect(
              (serviceProvider[method as keyof ServiceProvider] as any)
                .calledOnce
            ).to.equal(
              true,
              `expected sp.${method} to be called but it was not`
            );
            expect(
              (serviceProvider[method as keyof ServiceProvider] as any).getCall(
                -1
              ).args[3].session
            ).to.equal(internalSession);
          });
        }
      }
    });
    context('all commands that use other methods', function () {
      for (const method of Object.keys(exceptions).filter(
        (k) => !ignore.includes(k as any)
      ) as (string & keyof typeof exceptions)[]) {
        const customA = exceptions[method]?.a || args;
        const customM = exceptions[method]?.m || method;
        const customI = exceptions[method]?.i || 3;
        const customE = exceptions[method]?.e || false;
        it(`passes the session through for ${method} (args=${JSON.stringify(
          customA
        )}, sp method = ${customM}, index=${customI}, expectFail=${customE})`, async function () {
          try {
            await collection[method](...customA);
            if (customE) {
              expect.fail('missed exception');
            }
          } catch (e: any) {
            if (!customE) {
              expect.fail(`${method} failed, error thrown ${e.stack}`);
            }
          }
          expect(
            (serviceProvider[customM as keyof ServiceProvider] as any).called
          ).to.equal(
            true,
            `expecting sp.${customM} to be called but it was not`
          );
          const call = (
            serviceProvider[customM as keyof ServiceProvider] as any
          ).getCall(-1).args[customI];
          if (Array.isArray(call)) {
            for (const k of call) {
              expect(k.session).to.equal(
                internalSession,
                `method ${method} supposed to call sp.${customM} with options at arg ${customI}`
              );
            }
          } else {
            expect(call.session).to.equal(
              internalSession,
              `method ${method} supposed to call sp.${customM} with options at arg ${customI}`
            );
          }
        });
      }
    });
  });
});
