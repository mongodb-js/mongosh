import chai from 'chai';
import sinonChai from 'sinon-chai';
import { stubInterface, StubbedInstance } from 'ts-sinon';

chai.use(sinonChai);
const { expect } = chai;


import Mapper from './mapper';
import sinon from 'sinon';
import { ServiceProvider } from '@mongosh/service-provider-core';
import { Collection, Database } from '@mongosh/shell-api';

describe('Mapper', () => {
  let mapper: Mapper;
  let serviceProvider: StubbedInstance<ServiceProvider>;
  let collection;
  let database;

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

      describe('show collections', () => {
        it('lists collection names', async() => {
          serviceProvider.listCollections.resolves([
            { name: 'coll1' },
            { name: 'coll2' }
          ]);

          const expectedOutput = `coll1
coll2`;

          expect(
            (await mapper.show('collections')).toReplString()
          ).to.equal(expectedOutput);
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
          await mapper.find(collection, {}, {});
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

          await mapper.bulkWrite(collection, requests);

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

          const result = await mapper.bulkWrite(collection, requests);

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
    });

    describe('convertToCapped', () => {
      it('calls service provider convertToCapped', async() => {
        serviceProvider.convertToCapped.resolves({ ok: 1 });

        const result = await mapper.convertToCapped(collection, 1000);

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
          await mapper.createIndexes(collection, [{ x: 1 }]);

          expect(serviceProvider.createIndexes).to.have.been.calledWith(
            'db1',
            'coll1',
            [{ key: { x: 1 } }]
          );
        });
      });

      context('when options is an object', () => {
        it('calls serviceProvider.createIndexes merging options', async() => {
          await mapper.createIndexes(collection, [{ x: 1 }], { name: 'index-1' });

          expect(serviceProvider.createIndexes).to.have.been.calledWith(
            'db1',
            'coll1',
            [{ key: { x: 1 }, name: 'index-1' }]
          );
        });
      });

      context('when options is not an object', () => {
        it('throws an error', async() => {
          const error = await mapper.createIndexes(
            collection, [{ x: 1 }], 'unsupported' as any
          ).catch(e => e);

          expect(error).to.be.instanceOf(Error);
          expect(error.message).to.equal('options must be an object');
        });
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
          await mapper[method](collection, { x: 1 });

          expect(serviceProvider.createIndexes).to.have.been.calledWith(
            'db1',
            'coll1',
            [{ key: { x: 1 } }]
          );
        });
      });

      context('when options is an object', () => {
        it('calls serviceProvider.createIndexes merging options', async() => {
          await mapper[method](collection, { x: 1 }, { name: 'index-1' });

          expect(serviceProvider.createIndexes).to.have.been.calledWith(
            'db1',
            'coll1',
            [{ key: { x: 1 }, name: 'index-1' }]
          );
        });
      });

      context('when options is not an object', () => {
        it('throws an error', async() => {
          const error = await mapper[method](
            collection, { x: 1 }, 'unsupported' as any
          ).catch(e => e);

          expect(error).to.be.instanceOf(Error);
          expect(error.message).to.equal('options must be an object');
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
        expect(await mapper[method](collection)).to.deep.equal(result);
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
      expect(await mapper.getIndexKeys(collection)).to.deep.equal([
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
        expect(await mapper.dropIndexes(collection, 'index_1')).to.deep.equal(result);
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
        expect(await mapper.dropIndexes(collection, 'index_1')).to.deep.equal({
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
        await mapper.dropIndexes(collection, 'index_1').catch(err => { catched = err; });
        expect(catched.message).to.equal(error.message);
      });
    });
  });

  describe('dropIndex', () => {
    context('when mapper.dropIndexes resolves', () => {
      let result;
      beforeEach(async() => {
        result = { nIndexesWas: 3, ok: 1 };
        mapper.dropIndexes = sinon.mock().resolves(result);
      });

      it('returns the result of serviceProvider.dropIndexes', async() => {
        expect(await mapper.dropIndex(collection, 'index_1')).to.deep.equal(result);
      });

      it('throws if index is "*"', async() => {
        let catched;
        await mapper.dropIndex(collection, '*').catch(err => { catched = err; });

        expect(catched.message).to.equal(
          'To drop indexes in the collection using \'*\', use db.collection.dropIndexes()'
        );
      });

      it('throws if index is an array', async() => {
        let catched;
        await mapper.dropIndex(collection, ['index-1']).catch(err => { catched = err; });

        expect(catched.message).to.equal(
          'The index to drop must be either the index name or the index specification document'
        );
      });
    });
  });

  describe('getCollectionInfos', () => {
    it('returns the result of serviceProvider.listCollections', async() => {
      const filter = { name: 'abc' };
      const options = { nameOnly: true };
      const result = [{ name: 'coll1' }];

      serviceProvider.listCollections.resolves(result);

      expect(await mapper.getCollectionInfos(
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

      expect(await mapper.getCollectionNames(
        database)).to.deep.equal(['coll1']);

      expect(serviceProvider.listCollections).to.have.been.calledOnceWith(
        'db1', {}, { nameOnly: true });
    });
  });

  describe('totalIndexSize', () => {
    beforeEach(() => {
      serviceProvider.stats.resolves({
        totalIndexSize: 1000
      });
    });

    it('returns totalIndexSize', async() => {
      expect(await mapper.totalIndexSize(collection)).to.equal(1000);
      expect(serviceProvider.stats).to.have.been.calledOnceWith('db1', 'coll1');
    });

    it('throws an error if called with verbose', async() => {
      let catched;
      await mapper.totalIndexSize(collection, true)
        .catch(err => { catched = err; });

      expect(catched.message).to.equal(
        'totalIndexSize takes no argument. Use db.collection.stats to get detailed information.'
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
      expect(await mapper.reIndex(collection)).to.deep.equal(result);
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
      expect(await mapper.stats(collection, { scale: 1 })).to.equal(result);
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
      expect(await mapper.dataSize(collection)).to.equal(1000);
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
      expect(await mapper.storageSize(collection)).to.equal(1000);
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
      expect(await mapper.totalSize(collection)).to.equal(2000);
      expect(serviceProvider.stats).to.have.been.calledOnceWith('db1', 'coll1');
    });
  });

  describe('drop', () => { // collection.drop
    it('re-throws an error that is not NamespaceNotFound', async() => {
      const error = new Error();
      serviceProvider.dropCollection.rejects(error);
      expect(await (mapper.drop(collection).catch((e) => e))).to.equal(error);
    });
  });
});

