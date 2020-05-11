import { expect, use } from 'chai';
import sinon, { StubbedInstance, stubInterface } from 'ts-sinon';
import { EventEmitter } from 'events';
import { signatures } from './decorators';
import { ALL_SERVER_VERSIONS, ALL_TOPOLOGIES, ALL_PLATFORMS } from './enums';
import Database from './database';
import Mongo from './mongo';
import Collection from './collection';
import AggregationCursor from './aggregation-cursor';
import Explainable from './explainable';
import { Cursor as ServiceProviderCursor, ServiceProvider } from '@mongosh/service-provider-core';
import ShellInternalState from './shell-internal-state';

const sinonChai = require('sinon-chai'); // weird with import

use(sinonChai);
describe('Collection', () => {
  describe('signatures', () => {
    it('type', () => {
      expect(signatures.Collection.type).to.equal('Collection');
    });
    it('attributes', () => {
      expect(signatures.Collection.attributes.aggregate).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        returnType: 'AggregationCursor',
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        serverVersions: ALL_SERVER_VERSIONS
      });
    });
    it('hasAsyncChild', () => {
      expect(signatures.Collection.hasAsyncChild).to.equal(true);
    });
  });
  describe('metadata', () => {
    describe('toReplString', () => {
      const mongo = sinon.spy();
      const db = new Database(mongo, 'myDB');
      const coll = new Collection(mongo, db, 'myCollection');
      it('toReplString returns DB name', () => {
        expect(coll.toReplString()).to.equal('myCollection');
      });
      it('shellApiType', () => {
        expect(coll.shellApiType()).to.equal('Collection');
      });
    });
  });
  describe('commands', () => {
    let mongo: Mongo;
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let database: Database;
    let bus: StubbedInstance<EventEmitter>;
    let internalState: ShellInternalState;
    let collection: Collection;

    beforeEach(() => {
      bus = stubInterface<EventEmitter>();
      serviceProvider = stubInterface<ServiceProvider>();
      internalState = new ShellInternalState(serviceProvider, bus);
      mongo = new Mongo(internalState);
      database = new Database(mongo, 'db1');
      collection = new Collection(mongo, database, 'coll1');
    });
    describe('aggregate', () => {
      let serviceProviderCursor: StubbedInstance<ServiceProviderCursor>;

      beforeEach(() => {
        serviceProviderCursor = stubInterface<ServiceProviderCursor>();
      });

      it('calls serviceProvider.aggregate with pipeline and no options', async() => {
        await collection.aggregate(
          [{ $piplelineStage: {} }]
        );

        expect(serviceProvider.aggregate).to.have.been.calledWith(
          collection.database.name,
          collection.name,
          [{ $piplelineStage: {} }],
          {}
        );
      });
      it('calls serviceProvider.aggregate with no pipeline and no options', async() => {
        await collection.aggregate();

        expect(serviceProvider.aggregate).to.have.been.calledWith(
          collection.database.name,
          collection.name,
          [],
          {}
        );
      });
      it('calls serviceProvider.aggregate with stages as arguments', async() => {
        await collection.aggregate(
          { $option1: 1 },
          { $option2: 2 },
          { $option3: 3 }
        );

        expect(serviceProvider.aggregate).to.have.been.calledWith(
          collection.database.name,
          collection.name,
          [{ $option1: 1 }, { $option2: 2 }, { $option3: 3 }],
          {}
        );
      });

      it('calls serviceProvider.aggregate with pipleline and options', async() => {
        await collection.aggregate(
          [{ $piplelineStage: {} }],
          { options: true });

        expect(serviceProvider.aggregate).to.have.been.calledWith(
          collection.database.name,
          collection.name,
          [{ $piplelineStage: {} }],
          { options: true }
        );
      });

      it('returns an AggregationCursor that wraps the service provider one', async() => {
        const toArrayResult = [];
        serviceProviderCursor.toArray.resolves(toArrayResult);
        serviceProvider.aggregate.returns(serviceProviderCursor);

        const cursor = await collection.aggregate([{
          $piplelineStage: {}
        }]);

        expect(await (cursor as AggregationCursor).toArray()).to.equal(toArrayResult);
      });

      it('throws if serviceProvider.aggregate rejects', async() => {
        const expectedError = new Error();
        serviceProvider.aggregate.throws(expectedError);

        expect(
          await collection.aggregate(
            [{ $piplelineStage: {} }]
          ).catch(e => e)
        ).to.equal(expectedError);
      });

      it('pass readConcern and writeConcern as dbOption', async() => {
        collection.aggregate(
          [],
          { otherOption: true, readConcern: { level: 'majority' }, writeConcern: { w: 1 } }
        );

        expect(serviceProvider.aggregate).to.have.been.calledWith(
          collection.database.name,
          collection.name,
          [],
          { otherOption: true },
          { readConcern: { level: 'majority' }, w: 1 }
        );
      });

      it('runs explain if explain true is passed', async() => {
        const expectedExplainResult = {};
        serviceProviderCursor.explain.resolves(expectedExplainResult);
        serviceProvider.aggregate.returns(serviceProviderCursor as any);

        const explainResult = await collection.aggregate(
          [],
          { explain: true }
        );

        expect(explainResult).to.equal(expectedExplainResult);
        expect(serviceProviderCursor.explain).to.have.been.calledOnce;
      });

      it('wont run explain if explain is not passed', async() => {
        serviceProvider.aggregate.returns(serviceProviderCursor as any);

        const cursor = await collection.aggregate(
          [],
          {}
        );

        await cursor.toReplString();

        expect(cursor.shellApiType()).to.equal('AggregationCursor');
        expect(serviceProviderCursor.explain).not.to.have.been.called;
      });
    });

    describe('bulkWrite', () => {
      let requests;
      beforeEach(async() => {
        requests = [
          { insertOne: { 'document': { doc: 1 } } }
        ];
      });

      it('calls service provider bulkWrite', async() => {
        serviceProvider.bulkWrite = sinon.spy(() => Promise.resolve({
          result: { ok: 1 }
        })) as any;

        await collection.bulkWrite(requests);

        expect(serviceProvider.bulkWrite).to.have.been.calledWith(
          'db1',
          'coll1',
          requests
        );
      });

      it('adapts the result', async() => {
        serviceProvider.bulkWrite.resolves({
          result: { ok: 1 },
          insertedCount: 1,
          matchedCount: 2,
          modifiedCount: 3,
          deletedCount: 4,
          upsertedCount: 5,
          insertedIds: [ 6 ],
          upsertedIds: [ 7 ]
        });

        const result = await collection.bulkWrite(requests);

        expect(await result.toReplString()).to.be.deep.equal({
          acknowledged: true,
          insertedCount: 1,
          matchedCount: 2,
          modifiedCount: 3,
          deletedCount: 4,
          upsertedCount: 5,
          insertedIds: [ 6 ],
          upsertedIds: [ 7 ]
        });
      });
    });

    describe('convertToCapped', () => {
      it('calls service provider convertToCapped', async() => {
        serviceProvider.convertToCapped.resolves({ ok: 1 });

        const result = await collection.convertToCapped(1000);

        expect(serviceProvider.convertToCapped).to.have.been.calledWith(
          'db1',
          'coll1',
          1000
        );

        expect(result).to.deep.equal({ ok: 1 });
      });
    });

    describe('createIndexes', () => {
      beforeEach(async() => {
        serviceProvider.createIndexes.resolves({ ok: 1 });
      });

      context('when options is not passed', () => {
        it('calls serviceProvider.createIndexes using keyPatterns as keys', async() => {
          await collection.createIndexes([{ x: 1 }]);

          expect(serviceProvider.createIndexes).to.have.been.calledWith(
            'db1',
            'coll1',
            [{ key: { x: 1 } }]
          );
        });
      });

      context('when options is an object', () => {
        it('calls serviceProvider.createIndexes merging options', async() => {
          await collection.createIndexes([{ x: 1 }], { name: 'index-1' });

          expect(serviceProvider.createIndexes).to.have.been.calledWith(
            'db1',
            'coll1',
            [{ key: { x: 1 }, name: 'index-1' }]
          );
        });
      });

      context('when options is not an object', () => {
        it('throws an error', async() => {
          const error = await collection.createIndexes(
            [{ x: 1 }], 'unsupported' as any
          ).catch(e => e);

          expect(error).to.be.instanceOf(Error);
          expect(error.message).to.equal('The "options" argument must be an object.');
        });
      });
    });


    ['ensureIndex', 'createIndex'].forEach((method) => {
      describe(method, () => {
        beforeEach(async() => {
          serviceProvider.createIndexes.resolves({ ok: 1 });
        });

        context('when options is not passed', () => {
          it('calls serviceProvider.createIndexes using keys', async() => {
            await collection[method]({ x: 1 });

            expect(serviceProvider.createIndexes).to.have.been.calledWith(
              'db1',
              'coll1',
              [{ key: { x: 1 } }]
            );
          });
        });

        context('when options is an object', () => {
          it('calls serviceProvider.createIndexes merging options', async() => {
            await collection[method]({ x: 1 }, { name: 'index-1' });

            expect(serviceProvider.createIndexes).to.have.been.calledWith(
              'db1',
              'coll1',
              [{ key: { x: 1 }, name: 'index-1' }]
            );
          });
        });

        context('when options is not an object', () => {
          it('throws an error', async() => {
            const error = await collection[method](
              { x: 1 }, 'unsupported' as any
            ).catch(e => e);

            expect(error).to.be.instanceOf(Error);
            expect(error.message).to.equal('The "options" argument must be an object.');
          });
        });
      });
    });

    ['getIndexes', 'getIndexSpecs', 'getIndices'].forEach((method) => {
      describe(method, () => {
        let result;
        beforeEach(async() => {
          result = [{
            v: 2,
            key: {
              _id: 1
            },
            name: '_id_',
            ns: 'test.coll1'
          }];
          serviceProvider.getIndexes.resolves(result);
        });

        it('returns serviceProvider.getIndexes using keys', async() => {
          expect(await collection[method]()).to.deep.equal(result);
        });
      });
    });

    describe('getIndexKeys', () => {
      let result;
      beforeEach(async() => {
        result = [{
          v: 2,
          key: {
            _id: 1
          },
          name: '_id_',
          ns: 'test.coll1'
        },
        {
          v: 2,
          key: {
            name: 1
          },
          name: 'name_',
          ns: 'test.coll1'
        }];
        serviceProvider.getIndexes.resolves(result);
      });

      it('returns only indexes keys', async() => {
        expect(await collection.getIndexKeys()).to.deep.equal([
          { _id: 1 },
          { name: 1 }
        ]);
      });
    });

    describe('dropIndexes', () => {
      context('when serviceProvider.dropIndexes resolves', () => {
        let result;
        beforeEach(async() => {
          result = { nIndexesWas: 3, ok: 1 };
          serviceProvider.dropIndexes.resolves(result);
        });

        it('returns the result of serviceProvider.dropIndexes', async() => {
          expect(await collection.dropIndexes('index_1')).to.deep.equal(result);
        });
      });

      context('when serviceProvider.dropIndexes rejects IndexNotFound', () => {
        beforeEach(async() => {
          const error = new Error('index not found with name [index_1]');
          Object.assign(error, {
            ok: 0,
            errmsg: 'index not found with name [index_1]',
            code: 27,
            codeName: 'IndexNotFound',
            name: 'MongoError'
          });

          serviceProvider.dropIndexes.rejects(error);
        });

        it('returns the error as object', async() => {
          expect(await collection.dropIndexes('index_1')).to.deep.equal({
            ok: 0,
            errmsg: 'index not found with name [index_1]',
            code: 27,
            codeName: 'IndexNotFound'
          });
        });
      });

      context('when serviceProvider.dropIndexes rejects any other error', () => {
        let error;
        beforeEach(async() => {
          error = new Error('Some error');
          serviceProvider.dropIndexes.rejects(new Error('Some error'));
        });

        it('rejects with error', async() => {
          let catched;
          await collection.dropIndexes('index_1').catch(err => { catched = err; });
          expect(catched.message).to.equal(error.message);
        });
      });
    });

    describe('dropIndex', () => {
      context('when collection.dropIndexes resolves', () => {
        let result;
        beforeEach(async() => {
          result = { nIndexesWas: 3, ok: 1 };
          serviceProvider.dropIndexes.resolves(result);
        });

        it('returns the result of serviceProvider.dropIndexes', async() => {
          expect(await collection.dropIndex('index_1')).to.deep.equal(result);
        });

        it('throws if index is "*"', async() => {
          let catched;
          await collection.dropIndex('*').catch(err => { catched = err; });

          expect(catched.message).to.equal(
            'To drop indexes in the collection using \'*\', use db.collection.dropIndexes().'
          );
        });

        it('throws if index is an array', async() => {
          let catched;
          await collection.dropIndex(['index-1']).catch(err => { catched = err; });

          expect(catched.message).to.equal(
            'The index to drop must be either the index name or the index specification document.'
          );
        });
      });
    });

    describe('totalIndexSize', () => {
      beforeEach(() => {
        serviceProvider.stats.resolves({
          totalIndexSize: 1000
        });
      });

      it('returns totalIndexSize', async() => {
        expect(await collection.totalIndexSize()).to.equal(1000);
        expect(serviceProvider.stats).to.have.been.calledOnceWith('db1', 'coll1');
      });

      it('throws an error if called with verbose', async() => {
        let catched;
        await collection.totalIndexSize(true)
          .catch(err => { catched = err; });

        expect(catched.message).to.equal(
          '"totalIndexSize" takes no argument. Use db.collection.stats to get detailed information.'
        );
      });
    });

    describe('reIndex', () => {
      let result;

      beforeEach(() => {
        result = { ok: 1 };
        serviceProvider.reIndex.resolves(result);
      });

      it('returns the result of serviceProvider.dropIndexes', async() => {
        expect(await collection.reIndex()).to.deep.equal(result);
        expect(serviceProvider.reIndex).to.have.been.calledWith('db1', 'coll1');
      });
    });

    describe('stats', () => {
      let result;

      beforeEach(() => {
        result = {};
        serviceProvider.stats.resolves(result);
      });

      it('returns stats', async() => {
        expect(await collection.stats({ scale: 1 })).to.equal(result);
        expect(serviceProvider.stats).to.have.been.calledOnceWith('db1', 'coll1', { scale: 1 });
      });
    });

    describe('dataSize', () => {
      let result;

      beforeEach(() => {
        result = { size: 1000 };
        serviceProvider.stats.resolves(result);
      });

      it('returns stats.size', async() => {
        expect(await collection.dataSize()).to.equal(1000);
        expect(serviceProvider.stats).to.have.been.calledOnceWith('db1', 'coll1');
      });
    });

    describe('storageSize', () => {
      let result;

      beforeEach(() => {
        result = { storageSize: 1000 };
        serviceProvider.stats.resolves(result);
      });

      it('returns stats.storageSize', async() => {
        expect(await collection.storageSize()).to.equal(1000);
        expect(serviceProvider.stats).to.have.been.calledOnceWith('db1', 'coll1');
      });
    });

    describe('totalSize', () => {
      let result;

      beforeEach(() => {
        result = { storageSize: 1000, totalIndexSize: 1000 };
        serviceProvider.stats.resolves(result);
      });

      it('returns sum of storageSize and totalIndexSize', async() => {
        expect(await collection.totalSize()).to.equal(2000);
        expect(serviceProvider.stats).to.have.been.calledOnceWith('db1', 'coll1');
      });
    });

    describe('drop', () => {
      it('re-throws an error that is not NamespaceNotFound', async() => {
        const error = new Error();
        serviceProvider.dropCollection.rejects(error);
        expect(await (collection.drop().catch((e) => e))).to.equal(error);
      });
    });

    describe('getFullName', () => {
      it('returns the namespaced collection name', async() => {
        expect(collection.getFullName()).to.equal('db1.coll1');
      });
    });

    describe('getName', () => {
      it('returns the namespaced collection name', async() => {
        expect(collection.getName()).to.equal('coll1');
      });
    });

    describe('findAndModify', () => {
      let mockResult;

      beforeEach(() => {
        mockResult = { value: {} };
        serviceProvider.findAndModify.resolves(mockResult);
      });

      it('returns result.value from serviceProvider.findAndModify', async() => {
        expect(await collection.findAndModify({ query: {} })).to.equal(mockResult.value);
      });

      it('throws if no query is provided', async() => {
        try {
          await collection.findAndModify({});
        } catch (e) {
          return expect(e.name).to.equal('MongoshInvalidInputError');
        }
        expect.fail('MongoshInvalidInputError not thrown for findAndModify');
      });
      it('throws if no argument is provided', async() => {
        try {
          await collection.findAndModify();
        } catch (e) {
          return expect(e.name).to.equal('MongoshInvalidInputError');
        }
        expect.fail('MongoshInvalidInputError not thrown for findAndModify');
      });

      it('calls the service provider with the correct options', async() => {
        const options = {
          remove: true,
          new: true,
          fields: { projection: 1 },
          upsert: true,
          bypassDocumentValidation: true,
          writeConcern: { writeConcern: 1 },
          collation: { collation: 1 },
          arrayFilters: [ { filter: 1 } ]
        };

        await collection.findAndModify({
          query: { query: 1 },
          sort: { sort: 1 },
          update: { update: 1 },
          ...options
        });

        expect(serviceProvider.findAndModify).to.have.been.calledWith(
          collection.database.name,
          collection.name,
          { query: 1 },
          { sort: 1 },
          { update: 1 },
          options
        );
      });
    });

    describe('renameCollection', () => {
      let mockResult;

      beforeEach(() => {
        mockResult = {};
        serviceProvider.renameCollection.resolves(mockResult);
      });

      it('returns { ok: 1 } if the operation is successful', async() => {
        expect(
          await collection.renameCollection(
            'newName'
          )
        ).to.deep.equal({ ok: 1 });
      });

      it('calls the service provider with dropTarget=false if none is provided', async() => {
        await collection.renameCollection('newName');

        expect(serviceProvider.renameCollection).to.have.been.calledWith(
          collection.database.name,
          collection.name,
          'newName',
          { dropTarget: false }
        );
      });

      it('calls the service provider with the correct options', async() => {
        await collection.renameCollection('newName', true);

        expect(serviceProvider.renameCollection).to.have.been.calledWith(
          collection.database.name,
          collection.name,
          'newName',
          { dropTarget: true }
        );
      });

      it('rethrows a generic error', async() => {
        const error: any = new Error();

        serviceProvider.renameCollection.rejects(error);

        expect(
          await collection.renameCollection(
            'newName'
          ).catch(e => e)
        ).to.equal(error);
      });

      it('returns a MongoError with { ok: 0 } instead of throwing', async() => {
        const error: any = new Error();
        error.name = 'MongoError';
        error.code = 123;
        error.errmsg = 'msg';
        error.codeName = 'NamespaceNotFound';

        serviceProvider.renameCollection.rejects(error);

        expect(
          await collection.renameCollection(
            'newName'
          )
        ).to.deep.equal({
          code: error.code,
          errmsg: error.errmsg,
          codeName: error.codeName,
          ok: 0
        });
      });

      it('throws an error if newName is not a string', async() => {
        expect(
          (await collection.renameCollection(
             {} as any
          ).catch(e => e)).message
        ).to.equal('The "newName" argument must be a string.');
      });
    });

    describe('runCommand', () => {
      it('calls serviceProvider.runCommand with the collection set', async() => {
        await collection.runCommand('someCommand', {
          someOption: 1
        });

        expect(serviceProvider.runCommand).to.have.been.calledWith(
          collection.database.name,
          {
            someCommand: collection.name,
            someOption: 1
          }
        );
      });

      it('can be called without options', async() => {
        await collection.runCommand('someCommand');

        expect(serviceProvider.runCommand).to.have.been.calledWith(
          collection.database.name,
          {
            someCommand: collection.name
          }
        );
      });

      it('throws an error if commandName is not a string', async() => {
        expect(
          (await collection.runCommand(
             {} as any
          ).catch(e => e)).message
        ).to.equal('The "commandName" argument must be a string.');
      });

      it('throws an error if commandName is passed as option', async() => {
        expect(
          (await collection.runCommand(
            'commandName', { commandName: 1 } as any
          ).catch(e => e)).message
        ).to.equal('The "commandName" argument cannot be passed as an option to "runCommand".');
      });
    });

    describe('explain', () => {
      it('returns an Explainable object', () => {
        expect(collection.explain()).to.have.instanceOf(Explainable);
      });

      it('accepts valid verbosity', () => {
        expect(
          collection.explain('queryPlanner').verbosity
        ).to.equal('queryPlanner');

        expect(
          collection.explain('executionStats').verbosity
        ).to.equal('executionStats');

        expect(
          collection.explain('allPlansExecution').verbosity
        ).to.equal('allPlansExecution');
      });

      it('throws in case of non valid verbosity', () => {
        expect(() => {
          collection.explain('badVerbosityArgument');
        }).to.throw('verbosity can only be one of queryPlanner, executionStats, allPlansExecution. Received badVerbosityArgument.');
      });

      it('sets the right default verbosity', () => {
        const explainable = collection.explain();
        expect(explainable.verbosity).to.equal('queryPlanner');
      });
    });
  });
});
