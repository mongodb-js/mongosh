/* eslint-disable @typescript-eslint/camelcase */
import chai from 'chai';
import sinonChai from 'sinon-chai';
import { stubInterface, StubbedInstance } from 'ts-sinon';

chai.use(sinonChai);
const { expect } = chai;


import Mapper from './mapper';
import sinon from 'sinon';
import { ServiceProvider } from '@mongosh/service-provider-core';
import { Collection, Database, Explainable } from '@mongosh/shell-api';

describe('Mapper', () => {
  let mapper: Mapper;
  let serviceProvider: StubbedInstance<ServiceProvider>;
  let collection: Collection;
  let database: Database;

  beforeEach(() => {
    serviceProvider = stubInterface<ServiceProvider>();
    mapper = new Mapper(serviceProvider);
    database = new Database(mapper, 'db1');
    collection = new Collection(mapper, database, 'coll1');
  });

  describe('commands', () => {
    beforeEach(() => {
      mapper.context = { db: new Database(mapper, 'test') };
    });

    describe('show databases', () => {
      it('lists databases', async() => {
        serviceProvider.listDatabases.resolves({
          databases: [
            { name: 'db1', sizeOnDisk: 10000, empty: false },
            { name: 'db2', sizeOnDisk: 20000, empty: false },
            { name: 'db3', sizeOnDisk: 30000, empty: false }
          ],
          totalSize: 50000,
          ok: 1
        });

        const expectedOutput = [
          { name: 'db1', sizeOnDisk: 10000, empty: false },
          { name: 'db2', sizeOnDisk: 20000, empty: false },
          { name: 'db3', sizeOnDisk: 30000, empty: false }
        ];

        expect(
          (await mapper.show('dbs')).toReplString()
        ).to.deep.equal(expectedOutput);

        expect(
          (await mapper.show('databases')).toReplString()
        ).to.deep.equal(expectedOutput);
      });

      ['collections', 'tables'].forEach((showArgument) => {
        describe(`show ${showArgument}`, () => {
          it('lists collection names', async() => {
            serviceProvider.listCollections.resolves([
              { name: 'coll1' },
              { name: 'coll2' }
            ]);

            const expectedOutput = `coll1
coll2`;
            expect(
              (await mapper.show(showArgument)).toReplString()
            ).to.equal(expectedOutput);
          });
        });
      });
    });

    describe('it', () => {
      describe('when cursor is not present', () => {
        it('returns an empty CursorIterationResult', async() => {
          const result = await mapper.it();
          expect(result.shellApiType()).to.equal('CursorIterationResult');
          expect(result).to.have.lengthOf(0);
        });
      });

      describe('when cursor is present', () => {
        let cursor;

        beforeEach(async() => {
          cursor = {
            isClosed: (): boolean => false,
            hasNext: (): Promise<boolean> => Promise.resolve(true),
            next: (): Promise<any> => Promise.resolve({})
          };

          serviceProvider.find.returns(cursor);
          await mapper.collection_find(collection, {}, {});
        });

        it('returns CursorIterationResult', async() => {
          const result = await mapper.it();
          expect(result.shellApiType()).to.equal('CursorIterationResult');
        });

        it('returns the next 20 documents', async() => {
          const result = await mapper.it();
          expect(result).to.have.lengthOf(20);
        });

        describe('when hasNext returns false', () => {
          beforeEach(() => {
            let i = 3;
            cursor.hasNext = (): Promise<boolean> => Promise.resolve(i-- > 0);
          });

          it('stops', async() => {
            const result = await mapper.it();
            expect(result).to.have.lengthOf(3);
          });
        });

        describe('when invoked with a closed cursor', () => {
          beforeEach(() => {
            cursor.isClosed = (): boolean => true;
            cursor.hasNext = (): any => { throw new Error(''); };
          });

          it('returns an empty CursorIterationResult', async() => {
            const result = await mapper.it();
            expect(result.shellApiType()).to.equal('CursorIterationResult');
            expect(result).to.have.lengthOf(0);
          });
        });
      });
    });
  });

  describe('collection', () => {
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

        await mapper.collection_bulkWrite(collection, requests);

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

        const result = await mapper.collection_bulkWrite(collection, requests);

        expect(await result.toReplString()).to.be.deep.equal({
          ackowledged: true,
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

        const result = await mapper.collection_convertToCapped(collection, 1000);

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
          await mapper.collection_createIndexes(collection, [{ x: 1 }]);

          expect(serviceProvider.createIndexes).to.have.been.calledWith(
            'db1',
            'coll1',
            [{ key: { x: 1 } }]
          );
        });
      });

      context('when options is an object', () => {
        it('calls serviceProvider.createIndexes merging options', async() => {
          await mapper.collection_createIndexes(collection, [{ x: 1 }], { name: 'index-1' });

          expect(serviceProvider.createIndexes).to.have.been.calledWith(
            'db1',
            'coll1',
            [{ key: { x: 1 }, name: 'index-1' }]
          );
        });
      });

      context('when options is not an object', () => {
        it('throws an error', async() => {
          const error = await mapper.collection_createIndexes(
            collection, [{ x: 1 }], 'unsupported' as any
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
            await mapper[`collection_${method}`](collection, { x: 1 });

            expect(serviceProvider.createIndexes).to.have.been.calledWith(
              'db1',
              'coll1',
              [{ key: { x: 1 } }]
            );
          });
        });

        context('when options is an object', () => {
          it('calls serviceProvider.createIndexes merging options', async() => {
            await mapper[`collection_${method}`](collection, { x: 1 }, { name: 'index-1' });

            expect(serviceProvider.createIndexes).to.have.been.calledWith(
              'db1',
              'coll1',
              [{ key: { x: 1 }, name: 'index-1' }]
            );
          });
        });

        context('when options is not an object', () => {
          it('throws an error', async() => {
            const error = await mapper[`collection_${method}`](
              collection, { x: 1 }, 'unsupported' as any
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
          expect(await mapper[`collection_${method}`](collection)).to.deep.equal(result);
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
          name: '_name_',
          ns: 'test.coll1'
        }];
        serviceProvider.getIndexes.resolves(result);
      });

      it('returns only indexes keys', async() => {
        expect(await mapper.collection_getIndexKeys(collection)).to.deep.equal([
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
          expect(await mapper.collection_dropIndexes(collection, 'index_1')).to.deep.equal(result);
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
          expect(await mapper.collection_dropIndexes(collection, 'index_1')).to.deep.equal({
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
          await mapper.collection_dropIndexes(collection, 'index_1').catch(err => { catched = err; });
          expect(catched.message).to.equal(error.message);
        });
      });
    });

    describe('dropIndex', () => {
      context('when mapper.collection_dropIndexes resolves', () => {
        let result;
        beforeEach(async() => {
          result = { nIndexesWas: 3, ok: 1 };
          mapper.collection_dropIndexes = sinon.mock().resolves(result);
        });

        it('returns the result of serviceProvider.dropIndexes', async() => {
          expect(await mapper.collection_dropIndex(collection, 'index_1')).to.deep.equal(result);
        });

        it('throws if index is "*"', async() => {
          let catched;
          await mapper.collection_dropIndex(collection, '*').catch(err => { catched = err; });

          expect(catched.message).to.equal(
            'To drop indexes in the collection using \'*\', use db.collection.dropIndexes().'
          );
        });

        it('throws if index is an array', async() => {
          let catched;
          await mapper.collection_dropIndex(collection, ['index-1']).catch(err => { catched = err; });

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
        expect(await mapper.collection_totalIndexSize(collection)).to.equal(1000);
        expect(serviceProvider.stats).to.have.been.calledOnceWith('db1', 'coll1');
      });

      it('throws an error if called with verbose', async() => {
        let catched;
        await mapper.collection_totalIndexSize(collection, true)
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
        expect(await mapper.collection_reIndex(collection)).to.deep.equal(result);
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
        expect(await mapper.collection_stats(collection, { scale: 1 })).to.equal(result);
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
        expect(await mapper.collection_dataSize(collection)).to.equal(1000);
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
        expect(await mapper.collection_storageSize(collection)).to.equal(1000);
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
        expect(await mapper.collection_totalSize(collection)).to.equal(2000);
        expect(serviceProvider.stats).to.have.been.calledOnceWith('db1', 'coll1');
      });
    });

    describe('drop', () => {
      it('re-throws an error that is not NamespaceNotFound', async() => {
        const error = new Error();
        serviceProvider.dropCollection.rejects(error);
        expect(await (mapper.collection_drop(collection).catch((e) => e))).to.equal(error);
      });
    });

    describe('getFullName', () => {
      it('returns the namespaced collection name', async() => {
        expect(mapper.collection_getFullName(collection)).to.equal('db1.coll1');
      });
    });

    describe('getName', () => {
      it('returns the namespaced collection name', async() => {
        expect(mapper.collection_getName(collection)).to.equal('coll1');
      });
    });

    describe('findAndModify', () => {
      let mockResult;

      beforeEach(() => {
        mockResult = { value: {} };
        serviceProvider.findAndModify.resolves(mockResult);
      });

      it('returns result.value from serviceProvider.findAndModify', async() => {
        expect(await mapper.collection_findAndModify(collection, {})).to.equal(mockResult.value);
      });

      it('calls the service provider with an empty query if none is provided', async() => {
        await mapper.collection_findAndModify(collection, {});

        expect(serviceProvider.findAndModify).to.have.been.calledWith(
          collection._database._name,
          collection._name,
          {}
        );
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

        await mapper.collection_findAndModify(collection, {
          query: { query: 1 },
          sort: { sort: 1 },
          update: { update: 1 },
          ...options
        });

        expect(serviceProvider.findAndModify).to.have.been.calledWith(
          collection._database._name,
          collection._name,
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
          await mapper.collection_renameCollection(
            collection, 'newName'
          )
        ).to.deep.equal({ ok: 1 });
      });

      it('calls the service provider with dropTarget=false if none is provided', async() => {
        await mapper.collection_renameCollection(collection, 'newName');

        expect(serviceProvider.renameCollection).to.have.been.calledWith(
          collection._database._name,
          collection._name,
          'newName',
          { dropTarget: false }
        );
      });

      it('calls the service provider with the correct options', async() => {
        await mapper.collection_renameCollection(collection, 'newName', true);

        expect(serviceProvider.renameCollection).to.have.been.calledWith(
          collection._database._name,
          collection._name,
          'newName',
          { dropTarget: true }
        );
      });

      it('rethrows a generic error', async() => {
        const error: any = new Error();

        serviceProvider.renameCollection.rejects(error);

        expect(
          await mapper.collection_renameCollection(
            collection, 'newName'
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
          await mapper.collection_renameCollection(
            collection, 'newName'
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
          (await mapper.collection_renameCollection(
            collection, {} as any
          ).catch(e => e)).message
        ).to.equal('The "newName" argument must be a string.');
      });
    });

    describe('runCommand', () => {
      it('calls serviceProvider.runCommand with the collection set', async() => {
        await mapper.collection_runCommand(collection, 'someCommand', {
          someOption: 1
        });

        expect(serviceProvider.runCommand).to.have.been.calledWith(
          collection._database._name,
          {
            someCommand: collection._name,
            someOption: 1
          }
        );
      });

      it('can be called without options', async() => {
        await mapper.collection_runCommand(collection, 'someCommand');

        expect(serviceProvider.runCommand).to.have.been.calledWith(
          collection._database._name,
          {
            someCommand: collection._name
          }
        );
      });

      it('throws an error if commandName is not a string', async() => {
        expect(
          (await mapper.collection_runCommand(
            collection, {} as any
          ).catch(e => e)).message
        ).to.equal('The "commandName" argument must be a string.');
      });

      it('throws an error if commandName is passed as option', async() => {
        expect(
          (await mapper.collection_runCommand(
            collection, 'commandName', { commandName: 1 } as any
          ).catch(e => e)).message
        ).to.equal('The "commandName" argument cannot be passed as an option to "runCommand".');
      });
    });

    describe('explain', () => {
      it('returns an Explainable object', () => {
        expect(mapper.collection_explain(collection)).to.have.instanceOf(Explainable);
      });

      it('accepts valid verbosity', () => {
        expect(
          mapper.collection_explain(collection, 'queryPlanner')._verbosity
        ).to.equal('queryPlanner');

        expect(
          mapper.collection_explain(collection, 'executionStats')._verbosity
        ).to.equal('executionStats');

        expect(
          mapper.collection_explain(collection, 'allPlansExecution')._verbosity
        ).to.equal('allPlansExecution');
      });

      it('throws in case of non valid verbosity', () => {
        expect(() => {
          mapper.collection_explain(collection, 'badVerbosityArgument');
        }).to.throw('verbosity can only be one of queryPlanner, executionStats, allPlansExecution. Received badVerbosityArgument.');
      });

      it('sets the right default verbosity', () => {
        const explainable = mapper.collection_explain(collection);
        expect(explainable._verbosity).to.equal('queryPlanner');
      });
    });
  });

  describe('database', () => {
    describe('getCollectionInfos', () => {
      it('returns the result of serviceProvider.listCollections', async() => {
        const filter = { name: 'abc' };
        const options = { nameOnly: true };
        const result = [{ name: 'coll1' }];

        serviceProvider.listCollections.resolves(result);

        expect(await mapper.database_getCollectionInfos(
          database,
          filter,
          options)).to.deep.equal(result);

        expect(serviceProvider.listCollections).to.have.been.calledOnceWith('db1', filter, options);
      });
    });

    describe('getCollectionNames', () => {
      it('returns the result of serviceProvider.listCollections', async() => {
        const result = [{ name: 'coll1' }];

        serviceProvider.listCollections.resolves(result);

        expect(await mapper.database_getCollectionNames(
          database)).to.deep.equal(['coll1']);

        expect(serviceProvider.listCollections).to.have.been.calledOnceWith(
          'db1', {}, { nameOnly: true });
      });
    });
  });

  describe('explainable', () => {
    let explainable: Explainable;

    beforeEach(() => {
      explainable = new Explainable(mapper, collection, 'queryPlanner');
    });

    describe('getCollection', () => {
      it('returns the explainable collection', () => {
        expect(
          explainable.getCollection(explainable)
        ).to.equal(collection);
      });
    });

    describe('getVerbosity', () => {
      it('returns the explainable verbosity', () => {
        expect(
          mapper.explainable_getVerbosity(explainable)
        ).to.equal('queryPlanner');
      });
    });

    describe('setVerbosity', () => {
      it('sets the explainable verbosity', () => {
        expect(explainable._verbosity).not.to.equal('allPlansExecution');
        mapper.explainable_setVerbosity(explainable, 'allPlansExecution');
        expect(explainable._verbosity).to.equal('allPlansExecution');
      });

      it('validates the verbosity', () => {
        expect(() => {
          mapper.explainable_setVerbosity(explainable, 'badVerbosityArgument');
        }).to.throw('verbosity can only be one of queryPlanner, executionStats, allPlansExecution. Received badVerbosityArgument.');
      });
    });

    describe('find', () => {
      let cursorStub;
      let explainResult;
      beforeEach(() => {
        explainResult = { ok: 1 };

        collection.find = sinon.spy(() => ({
          explain: sinon.spy(() => explainResult)
        }));

        cursorStub = mapper.explainable_find(
          explainable,
          { query: 1 },
          { projection: 1 }
        );
      });

      it('calls collection.find with arguments', () => {
        expect(collection.find).to.have.been.calledOnceWithExactly(
          { query: 1 },
          { projection: 1 }
        );
      });

      it('returns an ExplainableCursor', () => {
        expect(cursorStub.shellApiType()).to.equal('ExplainableCursor');
      });

      context('when calling toReplString on the result', () => {
        it('calls explain with verbosity', async() => {
          await cursorStub.toReplString();
          expect(
            cursorStub.explain
          ).to.have.been.calledOnceWithExactly('queryPlanner');
        });

        it('returns the explain result', async() => {
          expect(
            await cursorStub.toReplString()
          ).to.equal(explainResult);
        });
      });
    });

    describe('aggregate', () => {
      let cursorStub;
      let explainResult;
      beforeEach(() => {
        explainResult = { ok: 1 };

        collection.aggregate = sinon.spy(() => ({
          explain: sinon.spy(() => explainResult)
        }));

        cursorStub = mapper.explainable_aggregate(
          explainable,
          { pipeline: 1 },
          { aggregate: 1 }
        );
      });

      it('calls collection.aggregate with arguments', () => {
        expect(collection.aggregate).to.have.been.calledOnceWithExactly(
          { pipeline: 1 },
          { aggregate: 1 }
        );
      });

      it('returns an ExplainableCursor', () => {
        expect(cursorStub.shellApiType()).to.equal('ExplainableAggregationCursor');
      });

      context('when calling toReplString on the result', () => {
        it('calls explain with verbosity', async() => {
          await cursorStub.toReplString();
          expect(
            cursorStub.explain
          ).to.have.been.calledOnceWithExactly('queryPlanner');
        });

        it('returns the explain result', async() => {
          expect(
            await cursorStub.toReplString()
          ).to.equal(explainResult);
        });
      });
    });
  });
});
