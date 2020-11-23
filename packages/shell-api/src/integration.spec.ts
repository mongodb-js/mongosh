import { expect } from 'chai';
import { CliServiceProvider } from '../../service-provider-server'; // avoid cyclic dep just for test
import ShellInternalState from './shell-internal-state';
import Cursor from './cursor';
import Explainable from './explainable';
import AggregationCursor from './aggregation-cursor';
import ShellApi from './shell-api';
import { startTestServer, skipIfServerVersion } from '../../../testing/integration-testing-hooks';
import { toShellResult } from './index';

// Compile JS code as an expression. We use this to generate some JS functions
// whose code is stringified and compiled elsewhere, to make sure that the code
// does not contain coverage instrumentation.
const compileExpr = (templ, ...subs): any => {
  return eval(`(${String.raw(templ, ...subs)})`); // eslint-disable-line no-eval
};

describe('Shell API (integration)', function() {
  const testServer = startTestServer('shared');
  this.timeout(60000);
  let serviceProvider: CliServiceProvider;

  const getIndexNames = async(dbName: string, collectionName: string): Promise<any> => {
    const specs = await serviceProvider.getIndexes(
      dbName,
      collectionName
    );

    return specs.map(spec => spec.name);
  };

  const findAllWithoutId = (dbName: string, collectionName: string): any => serviceProvider.find(
    dbName,
    collectionName,
    {},
    { projection: { _id: 0 } }
  ).toArray();

  const expectCollectionToExist = async(dbName: any, collectionName: any): Promise<void> => {
    const collectionNames = (await serviceProvider.listCollections(dbName)).map(({ name }) => name);
    expect(collectionNames).to.include(collectionName);
  };

  const expectCollectionNotToExist = async(dbName: any, collectionName: any): Promise<void> => {
    const collectionNames = (await serviceProvider.listCollections(dbName)).map(({ name }) => name);
    expect(collectionNames).to.not.include(collectionName);
  };

  // TODO: replace with serviceProvider.createCollection()
  const createCollection = async(dbName: string, collectionName: string): Promise<any> => {
    const now = Date.now();
    await serviceProvider.insertOne(dbName, collectionName, { _id: now });
    await serviceProvider.deleteOne(dbName, collectionName, { _id: now });
  };

  const loadQueryCache = async(collection): Promise<any> => {
    const res = await collection.insertMany([
      { '_id': 1, 'item': 'abc', 'price': 12, 'quantity': 2, 'type': 'apparel' },
      { '_id': 2, 'item': 'jkl', 'price': 20, 'quantity': 1, 'type': 'electronics' },
      { '_id': 3, 'item': 'abc', 'price': 10, 'quantity': 5, 'type': 'apparel' },
      { '_id': 4, 'item': 'abc', 'price': 8, 'quantity': 10, 'type': 'apparel' },
      { '_id': 5, 'item': 'jkl', 'price': 15, 'quantity': 15, 'type': 'electronics' }
    ]);
    expect(res.acknowledged).to.equal(true);
    expect((await collection.createIndex({ item: 1 })).ok).to.equal(1);
    expect((await collection.createIndex({ item: 1, quantity: 1 })).ok).to.equal(1);
    expect((await collection.createIndex({ item: 1, price: 1 }, { partialFilterExpression: { price: { $gte: 10 } } })).ok).to.equal(1);
    expect((await collection.createIndex({ quantity: 1 })).ok).to.equal(1);
    expect((await collection.createIndex({ quantity: 1, type: 1 })).ok).to.equal(1);
    await collection.find( { item: 'abc', price: { $gte: 10 } } ).toArray();
    await collection.find( { item: 'abc', price: { $gte: 5 } } ).toArray();
    await collection.find( { quantity: { $gte: 20 } } ).toArray();
    await collection.find( { quantity: { $gte: 5 }, type: 'apparel' } ).toArray();
  };

  const loadMRExample = async(collection): Promise<any> => {
    const res = await collection.insertMany([
      { _id: 1, cust_id: 'Ant O. Knee', ord_date: new Date('2020-03-01'), price: 25, items: [ { sku: 'oranges', qty: 5, price: 2.5 }, { sku: 'apples', qty: 5, price: 2.5 } ], status: 'A' },
      { _id: 2, cust_id: 'Ant O. Knee', ord_date: new Date('2020-03-08'), price: 70, items: [ { sku: 'oranges', qty: 8, price: 2.5 }, { sku: 'chocolates', qty: 5, price: 10 } ], status: 'A' },
      { _id: 3, cust_id: 'Busby Bee', ord_date: new Date('2020-03-08'), price: 50, items: [ { sku: 'oranges', qty: 10, price: 2.5 }, { sku: 'pears', qty: 10, price: 2.5 } ], status: 'A' },
      { _id: 4, cust_id: 'Busby Bee', ord_date: new Date('2020-03-18'), price: 25, items: [ { sku: 'oranges', qty: 10, price: 2.5 } ], status: 'A' },
      { _id: 5, cust_id: 'Busby Bee', ord_date: new Date('2020-03-19'), price: 50, items: [ { sku: 'chocolates', qty: 5, price: 10 } ], status: 'A' },
      { _id: 6, cust_id: 'Cam Elot', ord_date: new Date('2020-03-19'), price: 35, items: [ { sku: 'carrots', qty: 10, price: 1.0 }, { sku: 'apples', qty: 10, price: 2.5 } ], status: 'A' },
      { _id: 7, cust_id: 'Cam Elot', ord_date: new Date('2020-03-20'), price: 25, items: [ { sku: 'oranges', qty: 10, price: 2.5 } ], status: 'A' },
      { _id: 8, cust_id: 'Don Quis', ord_date: new Date('2020-03-20'), price: 75, items: [ { sku: 'chocolates', qty: 5, price: 10 }, { sku: 'apples', qty: 10, price: 2.5 } ], status: 'A' },
      { _id: 9, cust_id: 'Don Quis', ord_date: new Date('2020-03-20'), price: 55, items: [ { sku: 'carrots', qty: 5, price: 1.0 }, { sku: 'apples', qty: 10, price: 2.5 }, { sku: 'oranges', qty: 10, price: 2.5 } ], status: 'A' },
      { _id: 10, cust_id: 'Don Quis', ord_date: new Date('2020-03-23'), price: 25, items: [ { sku: 'oranges', qty: 10, price: 2.5 } ], status: 'A' }
    ]);
    expect(res.acknowledged).to.equal(true);
  };

  before(async() => {
    serviceProvider = await CliServiceProvider.connect(await testServer.connectionString());
  });

  after(() => {
    return serviceProvider.close(true);
  });

  let internalState;
  let shellApi;
  let mongo;
  let dbName;
  let database;
  let collection;
  let collectionName;

  beforeEach(async() => {
    dbName = `test-${Date.now()}`;
    collectionName = 'docs';

    internalState = new ShellInternalState(serviceProvider);
    shellApi = new ShellApi(internalState);
    mongo = internalState.currentDb.getMongo();
    database = mongo.getDB(dbName);
    collection = database.getCollection(collectionName);
    await database.dropDatabase();
  });

  afterEach(async() => {
    await serviceProvider.dropDatabase(dbName);
  });

  describe('commands', () => {
    describe('it', () => {
      beforeEach(async() => {
        const docs = [];

        let i = 1;
        while (i <= 21) {
          docs.push({ doc: i });
          i++;
        }

        await serviceProvider.insertMany(dbName, collectionName, docs);
      });

      describe('when calling it after find', () => {
        it('returns next batch of docs', async() => {
          collection.find({}, { _id: 0 });
          await shellApi.it();
          expect(await shellApi.it()).to.deep.equal([{
            doc: 21
          }]);
        });
      });

      describe('when calling limit after skip', () => {
        let cursor: Cursor;

        beforeEach(() => {
          cursor = collection.find({}, { _id: 0 })
            .skip(1)
            .limit(1);
        });

        describe('when calling toArray on the cursor', () => {
          it('returns the right documents', async() => {
            expect(await cursor.toArray()).to.deep.equal([{ doc: 2 }]);
          });
        });

        describe('when calling toShellResult on the cursor', () => {
          it('returns the right documents', async() => {
            expect((await toShellResult(cursor)).printable.constructor).to.equal(Array);
            expect((await toShellResult(cursor)).printable).to.deep.equal([{ doc: 2 }]);
          });
        });
      });
    });
  });

  describe('collection', () => {
    describe('bulkWrite', () => {
      context('with an insertOne request', () => {
        let requests;
        let result;

        beforeEach(async() => {
          requests = [
            {
              insertOne: {
                document: {
                  doc: 1
                }
              }
            }
          ];

          result = await collection.bulkWrite(requests);
        });

        it('returns acknowledged = true', () => {
          expect(result.acknowledged).to.be.true;
        });

        it('returns insertedCount = 1', () => {
          expect(result.insertedCount).to.equal(1);
        });

        it('returns insertedIds', () => {
          expect(Object.keys(result.insertedIds)).to.have.lengthOf(1);
        });

        it('performs insert', async() => {
          const docs = await serviceProvider.find(
            dbName,
            collectionName,
            {},
            { projection: { _id: 0 } }
          ).toArray();

          expect(docs).to.deep.equal([
            { doc: 1 }
          ]);
        });
      });
    });

    describe('updateOne', () => {
      beforeEach(async() => {
        await serviceProvider.insertMany(dbName, collectionName, [
          { doc: 1 },
          { doc: 1 },
          { doc: 2 }
        ]);
      });

      context('without upsert', () => {
        let result;

        beforeEach(async() => {
          result = await collection.updateOne(
            { doc: 1 }, { $inc: { x: 1 } }
          );
        });

        it('updates only one existing document matching filter', async() => {
          const docs = await findAllWithoutId(dbName, collectionName);

          expect(docs).to.deep.equal([
            { doc: 1, x: 1 },
            { doc: 1 },
            { doc: 2 }
          ]);
        });

        it('returns update result correctly', () => {
          it('returns update result correctly', () => {
            const {
              acknowledged,
              insertedId,
              matchedCount,
              modifiedCount,
              upsertedCount
            } = result;

            expect({
              acknowledged,
              insertedId,
              matchedCount,
              modifiedCount,
              upsertedCount
            }).to.deep.equal({
              acknowledged: 1,
              insertedId: null,
              matchedCount: 1,
              modifiedCount: 1,
              upsertedCount: 0
            });
          });
        });
      });

      context('with upsert', () => {
        let result;

        beforeEach(async() => {
          result = await collection.updateOne(
            { _id: 'new-doc' }, { $set: { _id: 'new-doc', doc: 3 } }, { upsert: true }
          );
        });

        it('inserts a document', async() => {
          const docs = await findAllWithoutId(dbName, collectionName);

          expect(docs).to.deep.equal([
            { doc: 1 },
            { doc: 1 },
            { doc: 2 },
            { doc: 3 }
          ]);
        });

        it('returns update result correctly', () => {
          const {
            acknowledged,
            insertedId,
            matchedCount,
            modifiedCount,
            upsertedCount
          } = result;

          expect({
            acknowledged,
            insertedId,
            matchedCount,
            modifiedCount,
            upsertedCount
          }).to.deep.equal({
            acknowledged: true,
            insertedId: {
              _id: 'new-doc',
              index: 0
            },
            matchedCount: 0,
            modifiedCount: 0,
            upsertedCount: 1
          });
        });
      });
    });

    describe('convertToCapped', () => {
      let result;

      beforeEach(async() => {
        await createCollection(dbName, collectionName);

        expect(await serviceProvider.isCapped(
          dbName,
          collectionName
        )).to.be.false;

        result = await collection.convertToCapped(
          1000
        );
      });

      it('returns ok = 1', () => {
        expect(result.ok).to.equal(1);
      });

      it('converts the collection', async() => {
        expect(await serviceProvider.isCapped(
          dbName,
          collectionName
        )).to.be.true;
      });
    });

    describe('createIndexes', () => {
      let result;

      beforeEach(async() => {
        await createCollection(dbName, collectionName);
        expect(await getIndexNames(dbName, collectionName)).not.to.contain('index-1');

        result = await collection.createIndexes([{ x: 1 }], {
          name: 'index-1'
        });
      });

      it('returns creation result', () => {
        expect(result).to.contain({
          createdCollectionAutomatically: false,
          numIndexesBefore: 1,
          numIndexesAfter: 2,
          ok: 1
        });
      });

      it('creates the index', async() => {
        expect(await getIndexNames(dbName, collectionName)).to.contain('index-1');
      });
    });

    describe('getIndexes', () => {
      let result;

      beforeEach(async() => {
        await createCollection(dbName, collectionName);
        await serviceProvider.createIndexes(dbName, collectionName, [
          { key: { x: 1 } }
        ]);

        result = await collection.getIndexes(collection);
      });

      it('returns indexes for the collection', () => {
        expect(result.length).to.equal(2);
        expect(result[0]).to.deep.include(
          {
            key: {
              _id: 1
            },
            name: '_id_',
            v: 2
          });
        expect(result[1]).to.deep.include(
          {
            key: {
              x: 1
            },
            name: 'x_1',
            v: 2
          });
      });
    });

    describe('dropIndexes', () => {
      beforeEach(async() => {
        await createCollection(dbName, collectionName);
        await serviceProvider.createIndexes(dbName, collectionName, [
          { key: { x: 1 }, name: 'index-1' }
        ]);
      });

      it('removes indexes', async() => {
        expect(await getIndexNames(dbName, collectionName)).to.contain('index-1');

        await collection.dropIndexes('*');

        expect(await getIndexNames(dbName, collectionName)).not.to.contain('index-1');
      });
    });

    describe('#reIndex', () => {
      beforeEach(async() => {
        await createCollection(dbName, collectionName);
      });

      it('runs against the db', async() => {
        const result = await collection.reIndex();

        expect(
          result
        ).to.deep.include({
          nIndexesWas: 1,
          nIndexes: 1,
          ok: 1
        });
        expect(result.indexes.length).to.equal(1);
        expect(result.indexes[0]).to.deep.include({
          v: 2,
          key: {
            '_id': 1
          },
          name: '_id_'
        });
      });
    });

    describe('totalIndexSize', () => {
      beforeEach(async() => {
        await createCollection(dbName, collectionName);
      });

      it('returns total index size', async() => {
        expect(typeof await collection.totalIndexSize()).to.equal('number');
      });
    });

    describe('dataSize', () => {
      beforeEach(async() => {
        await createCollection(dbName, collectionName);
      });

      it('returns total index size', async() => {
        expect(typeof await collection.dataSize()).to.equal('number');
      });
    });

    describe('storageSize', () => {
      beforeEach(async() => {
        await createCollection(dbName, collectionName);
      });

      it('returns total index size', async() => {
        expect(typeof await collection.storageSize()).to.equal('number');
      });
    });

    describe('totalSize', () => {
      beforeEach(async() => {
        await createCollection(dbName, collectionName);
      });

      it('returns total index size', async() => {
        expect(typeof await collection.totalSize()).to.equal('number');
      });
    });

    describe('stats', () => {
      beforeEach(async() => {
        await createCollection(dbName, collectionName);
        await serviceProvider.insertOne(dbName, collectionName, { x: 1 });
      });

      it('returns stats without indexDetails', async() => {
        const stats = await collection.stats();
        expect(stats).to.contain.keys(
          'avgObjSize',
          'capped',
          'count',
          'indexSizes',
          'nindexes',
          'ns',
          'ok',
          'size',
          'storageSize',
          'totalIndexSize',
          'wiredTiger'
        );
      });
      it('returns stats with indexDetails', async() => {
        const stats = await collection.stats({ indexDetails: true });
        expect(stats).to.contain.keys(
          'avgObjSize',
          'capped',
          'count',
          'indexDetails',
          'indexSizes',
          'nindexes',
          'ns',
          'ok',
          'size',
          'storageSize',
          'totalIndexSize',
          'wiredTiger'
        );
      });
    });

    describe('drop', () => {
      context('when a collection exists', () => {
        let result;
        beforeEach(async() => {
          await createCollection(dbName, collectionName);
          result = await collection.drop();
        });

        it('returns true', async() => {
          expect(result).to.be.true;
        });

        it('deletes the collection', async() => {
          await expectCollectionNotToExist(dbName, collectionName);
        });
      });

      context('when a collection does not exist', () => {
        it('returns false', async() => {
          expect(await collection.drop()).to.be.false;
        });
      });
    });

    describe('exists', () => {
      context('when a collection exists', () => {
        beforeEach(async() => {
          await createCollection(dbName, collectionName);
        });

        it('returns the collection object', async() => {
          expect((await collection.exists()).name).to.equal(collectionName);
        });
      });

      context('when a collection does not exist', () => {
        it('returns false', async() => {
          expect(await collection.drop()).to.be.false;
        });
      });
    });

    describe('runCommand', () => {
      beforeEach(async() => {
        await createCollection(dbName, collectionName);
      });


      it('runs a command with the collection as parameter and returns the result', async() => {
        expect(await collection.runCommand('collStats')).to.include({
          ok: 1,
          ns: `${dbName}.${collectionName}`
        });
      });
    });

    describe('findAndModify', () => {
      beforeEach(async() => {
        await serviceProvider.insertMany(
          dbName,
          collectionName,
          [
            { doc: 1, foo: 1 },
            { doc: 2, foo: 1 }
          ]
        );
      });

      it('changes only a matching document', async() => {
        await collection.findAndModify(
          {
            query: { doc: 1 },
            update: { foo: 'bar' }
          }
        );

        expect(await findAllWithoutId(dbName, collectionName)).to.deep.equal([
          { foo: 'bar' },
          { doc: 2, foo: 1 }
        ]);
      });

      it('removes only a matching document', async() => {
        await collection.findAndModify(
          {
            query: { doc: 1 },
            remove: true
          }
        );

        expect(await findAllWithoutId(dbName, collectionName)).to.deep.equal([
          { doc: 2, foo: 1 }
        ]);
      });

      it('changes the first matching document with sort', async() => {
        await collection.findAndModify(
          {
            query: { foo: 1 },
            sort: { doc: -1 },
            update: { changed: true }
          }
        );

        expect(await findAllWithoutId(dbName, collectionName)).to.deep.equal([
          { doc: 1, foo: 1 },
          { changed: true }
        ]);
      });

      it('returns the old document if new is not passed', async() => {
        expect(
          await collection.findAndModify({ query: { doc: 1 }, update: { changed: true } })
        ).to.deep.include({ doc: 1 });

        expect(
          await collection.findAndModify({ query: { doc: 2 }, remove: true })
        ).to.deep.include({ doc: 2 });
      });

      it('returns the new document if new is passed', async() => {
        expect(
          await collection.findAndModify({
            query: { doc: 1 }, new: true, update: { changed: true }
          })
        ).to.deep.include({ changed: true });
      });

      it('allows upserts', async() => {
        await collection.findAndModify({
          query: { doc: 3 }, new: true, update: { doc: 3 }, upsert: true
        });

        expect(
          await findAllWithoutId(dbName, collectionName)
        ).to.deep.include({ doc: 3 });
      });
    });

    describe('renameCollection', () => {
      context('without dropTarget', () => {
        beforeEach(async() => {
          await serviceProvider.insertOne(dbName, collectionName, { doc: 1 });
          await collection.renameCollection(
            'newName'
          );
        });

        it('renames a collection', async() => {
          await expectCollectionToExist(dbName, 'newName');
          await new Promise((resolve) => { setTimeout(resolve, 2000); });
          await expectCollectionNotToExist(dbName, collectionName);
        });

        it('does not drop documents', async() => {
          expect(
            await findAllWithoutId(
              dbName,
              'newName'
            )
          ).to.deep.include({
            doc: 1
          });
        });
      });

      context('with dropTarget = true', () => {
        beforeEach(async() => {
          await serviceProvider.insertOne(dbName, collectionName, { doc: 1 });
          await collection.renameCollection(
            'newName',
            true
          );
        });

        it('renames a collection', async() => {
          await expectCollectionToExist(dbName, 'newName');
          await new Promise((resolve) => { setTimeout(resolve, 2000); });
          await expectCollectionNotToExist(dbName, collectionName);
        });

        it('drops documents', async() => {
          expect(
            await findAllWithoutId(
              dbName,
              'newName'
            )
          ).to.deep.include({
            doc: 1
          });
        });
      });
    });

    describe('aggregate', () => {
      it('runs an aggregate pipeline on the database', async() => {
        await serviceProvider.insertOne(dbName, collectionName, { x: 1 });

        const cursor = await collection.aggregate([{
          $count: 'count'
        }]);

        expect(await (cursor as AggregationCursor).toArray()).to.deep.equal([{ count: 1 }]);
      });

      it('runs an explain with explain: true', async() => {
        await serviceProvider.insertOne(dbName, collectionName, { x: 1 });

        const cursor = await collection.aggregate([{
          $count: 'count'
        }]);

        expect(await (cursor as AggregationCursor).toArray()).to.deep.equal([{ count: 1 }]);
      });
    });
  });

  describe('db', () => {
    describe('getCollectionInfos', () => {
      it('returns an array with collection infos', async() => {
        await createCollection(dbName, collectionName);

        expect(await database.getCollectionInfos({}, { nameOnly: true })).to.deep.equal([{
          name: collectionName,
          type: 'collection'
        }]);
      });
    });

    describe('getCollectionNames', () => {
      it('returns an array with collection names', async() => {
        await createCollection(dbName, collectionName);

        expect(
          await database.getCollectionNames()
        ).to.deep.equal([collectionName]);
      });
    });

    describe('adminCommand', () => {
      it('runs an adminCommand', async() => {
        const result = await database.adminCommand(
          { serverStatus: 1 }
        );
        expect(result.ok).to.equal(1);
        expect(result.process).to.match(/mongo/);
      });
    });

    describe('aggregate', () => {
      it('runs an aggregate pipeline on the database', async() => {
        const cursor = await database.aggregate([{
          $listLocalSessions: {}
        }]);

        expect((await (cursor as AggregationCursor).toArray())[0]).to.have.keys('_id', 'lastUse');
      });
    });

    describe('dropDatabase', () => {
      let otherDbName;
      beforeEach(() => {
        otherDbName = `${dbName}-2`;
      });

      afterEach(async() => {
        await serviceProvider.dropDatabase(otherDbName);
      });

      const listDatabases = async(): Promise<string> => {
        const { databases } = await serviceProvider.listDatabases('admin');
        return databases.map(db => db.name);
      };

      it('drops only the target database', async() => {
        await createCollection(dbName, collectionName);
        await createCollection(otherDbName, collectionName);

        expect(
          await listDatabases()
        ).to.contain(dbName);

        await database.dropDatabase();

        expect(
          await listDatabases()
        ).not.to.contain(dbName);

        expect(
          await listDatabases()
        ).to.contain(otherDbName);
      });

      it('returns the drop database result', async() => {
        expect(
          await database.dropDatabase()
        ).to.deep.equal({ 'dropped': dbName, 'ok': 1 });
      });
    });

    describe('createCollection', () => {
      it('creates a collection without options', async() => {
        await database.createCollection('newcoll');
        const stats = await serviceProvider.runCommand(dbName, { collStats: 'newcoll' });
        expect(stats.nindexes).to.equal(1);
      });
      it('creates a collection with options', async() => {
        await database.createCollection('newcoll', {
          capped: true,
          size: 1024,
          max: 5000
        });
        const stats = await serviceProvider.runCommand(dbName, { collStats: 'newcoll' });
        expect(stats.nindexes).to.equal(1);
        expect(stats.capped).to.equal(true);
        expect(stats.maxSize).to.equal(1024);
        expect(stats.max).to.equal(5000);
      });
    });
    describe('createView', () => {
      it('creates a view without options', async() => {
        expect(
          await database.createView(
            'view',
            'source',
            [{ $match: { x: 1 } }]
          )
        ).to.deep.equal({ ok: 1 });
        const views = await serviceProvider.find(dbName, 'system.views', {}).toArray();
        expect(views).to.deep.equal([
          {
            _id: `${dbName}.view`,
            viewOn: 'source',
            pipeline: [ { $match: { x: 1 } } ]
          }
        ]);
      });
      it('creates a view with options', async() => {
        expect(
          await database.createView(
            'view',
            'source',
            [{ $match: { x: 1 } }],
            { collation: { locale: 'simple' } }
          )
        ).to.deep.equal({ ok: 1 });
        const views = await serviceProvider.find(dbName, 'system.views', {}).toArray();
        expect(views).to.deep.equal([
          {
            _id: `${dbName}.view`,
            viewOn: 'source',
            pipeline: [ { $match: { x: 1 } } ]
          }
        ]);
      });
    });
  });

  describe('explainable', () => {
    let explainable;

    beforeEach(() => {
      explainable = new Explainable(
        mongo,
        collection,
        'queryPlanner'
      );
    });

    describe('find', () => {
      it('returns a cursor that has the explain as result of toShellResult', async() => {
        const cursor = await explainable.find()
          .skip(1)
          .limit(1);
        const result = await toShellResult(cursor);
        expect(result.printable).to.have.keys([
          'ok',
          'queryPlanner',
          'serverInfo'
        ]);
      });
    });

    describe('aggregate', () => {
      it('returns a cursor that has the explain as result of toShellResult', async() => {
        const cursor = await explainable.find()
          .skip(1)
          .limit(1);
        const result = await toShellResult(cursor);
        expect(result.printable).to.have.keys([
          'ok',
          'queryPlanner',
          'serverInfo'
        ]);
      });
    });
  });

  describe('Bulk API', async() => {
    let bulk;
    ['initializeUnorderedBulkOp', 'initializeOrderedBulkOp'].forEach((m) => {
      describe(m, () => {
        describe('insert', () => {
          beforeEach(async() => {
            bulk = await collection[m]();
            for (let i = 0; i < 1000; i++) {
              bulk.insert({ x: i });
            }
            expect(await collection.countDocuments()).to.equal(0);
            await bulk.execute();
          });
          it('tojson returns correctly', async() => {
            expect(bulk.tojson()).to.deep.equal({ nInsertOps: 1000, nUpdateOps: 0, nRemoveOps: 0, nBatches: 1 });
          });
          it('executes', async() => {
            expect(await collection.countDocuments()).to.equal(1000);
          });
          it('getOperations returns correctly', () => {
            const ops = bulk.getOperations();
            expect(ops.length).to.equal(1);
            const op = ops[0];
            expect(op.originalZeroIndex).to.equal(0);
            expect(op.batchType).to.equal(1);
            expect(op.operations.length).to.equal(1000);
            expect(op.operations[99].x).to.equal(99);
          });
        });
        describe('remove', async() => {
          beforeEach(async() => {
            bulk = await collection[m]();
            for (let i = 0; i < 1000; i++) {
              await collection.insertOne({ x: i });
            }
            expect(await collection.countDocuments()).to.equal(1000);
            bulk.find({ x: { $mod: [ 2, 0 ] } }).remove();
            await bulk.execute();
          });
          it('tojson returns correctly', async() => {
            expect(bulk.tojson()).to.deep.equal({ nInsertOps: 0, nUpdateOps: 0, nRemoveOps: 1, nBatches: 1 });
          });
          it('executes', async() => {
            expect(await collection.countDocuments()).to.equal(500);
          });
          it('getOperations returns correctly', () => {
            const ops = bulk.getOperations();
            expect(ops.length).to.equal(1);
            const op = ops[0];
            expect(op.originalZeroIndex).to.equal(0);
            expect(op.batchType).to.equal(3);
            expect(op.operations.length).to.equal(1);
          });
        });
        describe('removeOne', async() => {
          beforeEach(async() => {
            bulk = await collection[m]();
            for (let i = 0; i < 1000; i++) {
              await collection.insertOne({ x: i });
            }
            expect(await collection.countDocuments()).to.equal(1000);
            bulk.find({ x: { $mod: [ 2, 0 ] } }).removeOne();
            await bulk.execute();
          });
          it('tojson returns correctly', async() => {
            expect(bulk.tojson()).to.deep.equal({ nInsertOps: 0, nUpdateOps: 0, nRemoveOps: 1, nBatches: 1 });
          });
          it('executes', async() => {
            expect(await collection.countDocuments()).to.equal(999);
          });
          it('getOperations returns correctly', () => {
            const ops = bulk.getOperations();
            expect(ops.length).to.equal(1);
            const op = ops[0];
            expect(op.originalZeroIndex).to.equal(0);
            expect(op.batchType).to.equal(3);
            expect(op.operations.length).to.equal(1);
          });
        });
        describe('replaceOne', async() => {
          beforeEach(async() => {
            bulk = await collection[m]();
            for (let i = 0; i < 1000; i++) {
              await collection.insertOne({ x: i });
            }
            expect(await collection.countDocuments()).to.equal(1000);
            bulk.find({ x: 2 }).replaceOne({ x: 1 });
            await bulk.execute();
          });
          it('tojson returns correctly', async() => {
            expect(bulk.tojson()).to.deep.equal({ nInsertOps: 0, nUpdateOps: 1, nRemoveOps: 0, nBatches: 1 });
          });
          it('executes', async() => {
            expect(await collection.countDocuments({ x: 1 })).to.equal(2);
            expect(await collection.countDocuments({ x: 2 })).to.equal(0);
            expect(await collection.countDocuments()).to.equal(1000);
          });
          it('getOperations returns correctly', () => {
            const ops = bulk.getOperations();
            expect(ops.length).to.equal(1);
            const op = ops[0];
            expect(op.originalZeroIndex).to.equal(0);
            expect(op.batchType).to.equal(2);
            expect(op.operations.length).to.equal(1);
          });
        });
        describe('updateOne', async() => {
          beforeEach(async() => {
            bulk = await collection[m]();
            for (let i = 0; i < 1000; i++) {
              await collection.insertOne({ x: i });
            }
            expect(await collection.countDocuments()).to.equal(1000);
            bulk.find({ x: 2 }).updateOne({ $inc: { x: -1 } });
            await bulk.execute();
          });
          it('tojson returns correctly', async() => {
            expect(bulk.tojson()).to.deep.equal({ nInsertOps: 0, nUpdateOps: 1, nRemoveOps: 0, nBatches: 1 });
          });
          it('executes', async() => {
            expect(await collection.countDocuments({ x: 1 })).to.equal(2);
            expect(await collection.countDocuments({ x: 2 })).to.equal(0);
            expect(await collection.countDocuments()).to.equal(1000);
          });
          it('getOperations returns correctly', () => {
            const ops = bulk.getOperations();
            expect(ops.length).to.equal(1);
            const op = ops[0];
            expect(op.originalZeroIndex).to.equal(0);
            expect(op.batchType).to.equal(2);
            expect(op.operations.length).to.equal(1);
          });
        });
        describe('update', async() => {
          beforeEach(async() => {
            bulk = await collection[m]();
            for (let i = 0; i < 1000; i++) {
              await collection.insertOne({ x: i });
            }
            expect(await collection.countDocuments()).to.equal(1000);
            bulk.find({ x: { $mod: [ 2, 0 ] } }).update({ $inc: { x: 1 } });
            await bulk.execute();
          });
          it('tojson returns correctly', async() => {
            expect(bulk.tojson()).to.deep.equal({ nInsertOps: 0, nUpdateOps: 1, nRemoveOps: 0, nBatches: 1 });
          });
          it('executes', async() => {
            expect(await collection.countDocuments()).to.equal(1000);
            expect(await collection.countDocuments({ x: { $mod: [ 2, 0 ] } })).to.equal(0);
          });
          it('getOperations returns correctly', () => {
            const ops = bulk.getOperations();
            expect(ops.length).to.equal(1);
            const op = ops[0];
            expect(op.originalZeroIndex).to.equal(0);
            expect(op.batchType).to.equal(2);
            expect(op.operations.length).to.equal(1);
          });
        });
        describe('upsert().update', async() => {
          beforeEach(async() => {
            bulk = await collection[m]();
            for (let i = 0; i < 1000; i++) {
              await collection.insertOne({ x: i });
            }
            expect(await collection.countDocuments()).to.equal(1000);
            expect(await collection.countDocuments({ y: { $exists: true } })).to.equal(0);
            bulk.find({ y: 0 }).upsert().update({ $set: { y: 1 } });
            await bulk.execute();
          });
          afterEach(async() => {
            await collection.drop();
          });
          it('tojson returns correctly', async() => {
            expect(bulk.tojson()).to.deep.equal({ nInsertOps: 0, nUpdateOps: 1, nRemoveOps: 0, nBatches: 1 });
          });
          it('executes', async() => {
            expect(await collection.countDocuments()).to.equal(1001);
            expect(await collection.countDocuments({ y: { $exists: true } })).to.equal(1);
          });
          it('getOperations returns correctly', () => {
            const ops = bulk.getOperations();
            expect(ops.length).to.equal(1);
            const op = ops[0];
            expect(op.originalZeroIndex).to.equal(0);
            expect(op.batchType).to.equal(2);
            expect(op.operations.length).to.equal(1);
          });
        });
        describe('upsert().updateOne', async() => {
          beforeEach(async() => {
            bulk = await collection[m]();
            for (let i = 0; i < 1000; i++) {
              await collection.insertOne({ x: i });
            }
            expect(await collection.countDocuments()).to.equal(1000);
            expect(await collection.countDocuments({ y: { $exists: true } })).to.equal(0);
            bulk.find({ y: 0 }).upsert().updateOne({ $set: { y: 1 } });
            await bulk.execute();
          });
          it('tojson returns correctly', async() => {
            expect(bulk.tojson()).to.deep.equal({ nInsertOps: 0, nUpdateOps: 1, nRemoveOps: 0, nBatches: 1 });
          });
          it('executes', async() => {
            expect(await collection.countDocuments()).to.equal(1001);
            expect(await collection.countDocuments({ y: { $exists: true } })).to.equal(1);
          });
          it('getOperations returns correctly', () => {
            const ops = bulk.getOperations();
            expect(ops.length).to.equal(1);
            const op = ops[0];
            expect(op.originalZeroIndex).to.equal(0);
            expect(op.batchType).to.equal(2);
            expect(op.operations.length).to.equal(1);
          });
        });
        describe('update without upsert', async() => {
          beforeEach(async() => {
            bulk = await collection[m]();
            for (let i = 0; i < 1000; i++) {
              await collection.insertOne({ x: i });
            }
            expect(await collection.countDocuments()).to.equal(1000);
            expect(await collection.countDocuments({ y: { $exists: true } })).to.equal(0);
            bulk.find({ y: 0 }).update({ $set: { y: 1 } });
            await bulk.execute();
          });
          it('executes', async() => {
            expect(await collection.countDocuments()).to.equal(1000);
            expect(await collection.countDocuments({ y: { $exists: true } })).to.equal(0);
          });
        });
        describe('multiple batches', async() => {
          beforeEach(async() => {
            bulk = await collection[m]();
            for (let i = 0; i < 1000; i++) {
              bulk.insert({ x: 1 });
            }
            expect(bulk.tojson().nBatches).to.equal(1);
            bulk.find({ x: 1 }).remove();
            expect(bulk.tojson().nBatches).to.equal(2);
            bulk.find({ x: 2 }).update({ $inc: { x: 1 } });
            expect(bulk.tojson().nBatches).to.equal(3);
            for (let i = 0; i < 1000; i++) {
              bulk.insert({ x: 1 });
            }
          });
          it('updates count depending on ordered or not', () => {
            expect(bulk.tojson().nBatches).to.equal(m === 'initializeUnorderedBulkOp' ? 3 : 4);
          });
        });
        // NOTE: blocked by NODE-2751
        // describe('arrayFilters().update', async() => {
        //   beforeEach(async() => {
        //     bulk = await collection[m]();
        //     for (let i = 0; i < 10; i++) {
        //       await collection.insertOne({ x: i, array: [1, -1] });
        //     }
        //     expect(await collection.countDocuments({ x: { $exists: true } })).to.equal(10);
        //     bulk.find({ x: { $exists: true } }).arrayFilters([{ element: { $gte: 0 } }]).update({ $set: { 'arr.$[element]': 1 } });
        //     await bulk.execute();
        //   });
        //   afterEach(async() => {
        //     await collection.drop();
        //   });
        //   it('tojson returns correctly', async() => {
        //     expect(bulk.tojson()).to.deep.equal({ nInsertOps: 0, nUpdateOps: 1, nRemoveOps: 0, nBatches: 1 });
        //   });
        //   it('executes', async() => {
        //     expect(await collection.countDocuments()).to.equal(10);
        //     expect(await collection.countDocuments({ arr: [ -1, -1 ] })).to.equal(10);
        //     expect(await collection.countDocuments({ arr: [ 1, -1 ] })).to.equal(0);
        //   });
        //   it('getOperations returns correctly', () => {
        //     const ops = bulk.getOperations();
        //     expect(ops.length).to.equal(1);
        //     const op = ops[0];
        //     expect(op.originalZeroIndex).to.equal(0);
        //     expect(op.batchType).to.equal(2);
        //     expect(op.operations.length).to.equal(1);
        //   });
        // });
        describe('error states', () => {
          it('cannot be executed twice', async() => {
            bulk = await collection[m]();
            bulk.insert({ x: 1 });
            await bulk.execute();
            try {
              await bulk.execute();
            } catch (err) {
              expect(err.name).to.equal('BulkWriteError');
              return;
            }
            expect.fail('Error not thrown');
          });
          it('getOperations fails before execute', async() => {
            bulk = await collection[m]();
            bulk.insert({ x: 1 });
            try {
              bulk.getOperations();
            } catch (err) {
              expect(err.name).to.equal('MongoshInvalidInputError');
              return;
            }
            expect.fail('Error not thrown');
          });
          it('No ops', async() => {
            bulk = await collection[m]();
            try {
              await bulk.execute();
            } catch (err) {
              expect(err.name).to.equal('MongoError');
              return;
            }
            expect.fail('Error not thrown');
          });
          it('Driver error', async() => {
            bulk = await collection[m]();
            bulk.find({}).update({ x: 1 });
            try {
              await bulk.execute();
            } catch (err) {
              expect(err.name).to.equal('BulkWriteError');
              return;
            }
            expect.fail('Error not thrown');
          });
          it('Driver structure change', async() => {
            bulk = await collection[m]();
            bulk.insert({});
            await bulk.execute();
            bulk._serviceProviderBulkOp.s = undefined;
            try {
              bulk.getOperations();
            } catch (err) {
              expect(err.name).to.equal('MongoshInternalError');
              return;
            }
            expect.fail('Error not thrown');
          });
          it('collation', async() => {
            bulk = await collection[m]();
            try {
              await bulk.find({}).collation({});
            } catch (err) {
              expect(err.name).to.equal('MongoshUnimplementedError');
              return;
            }
            expect.fail('Error not thrown');
          });
          it('arrayFilters', async() => {
            bulk = await collection[m]();
            try {
              await bulk.find({}).arrayFilters([{}]);
            } catch (err) {
              expect(err.name).to.equal('MongoshUnimplementedError');
              return;
            }
            expect.fail('Error not thrown');
          });
        });
      });
    });
  });

  describe('mongo', () => {
    describe('setReadConcern', () => {
      it('reconnects', async() => {
        const oldMC = serviceProvider.mongoClient;
        expect(oldMC.isConnected()).to.equal(true);
        expect(mongo.getReadConcern()).to.equal(undefined);
        await mongo.setReadConcern('local');
        expect(mongo.getReadConcern()).to.equal('local');
        expect(oldMC.isConnected()).to.equal(false);
        expect(serviceProvider.mongoClient.isConnected()).to.equal(true);
      });
    });
    describe('setReadPref', () => {
      it('reconnects', async() => {
        const oldMC = serviceProvider.mongoClient;
        expect(oldMC.isConnected()).to.equal(true);
        expect((serviceProvider.mongoClient as any).s.options.readPreference.mode).to.deep.equal('primary');
        await mongo.setReadPref('secondaryPreferred');
        expect(oldMC.isConnected()).to.equal(false);
        expect(serviceProvider.mongoClient.isConnected()).to.equal(true);
        expect((serviceProvider.mongoClient as any).s.options.readPreference.mode).to.equal('secondaryPreferred');
      });
    });
  });
  describe('PlanCache', () => {
    describe('list', () => {
      skipIfServerVersion(testServer, '< 4.4');
      it('lists all without args', async() => {
        await loadQueryCache(collection);
        const planCache = collection.getPlanCache();
        const res = await planCache.list();
        expect(res.length).to.equal(4);
        expect(res[0].createdFromQuery).to.deep.equal({
          query: { quantity: { $gte: 5 }, type: 'apparel' },
          sort: {},
          projection: {}
        });
      });
      it('lists projection with args', async() => {
        await loadQueryCache(collection);
        const planCache = collection.getPlanCache();
        const res = await planCache.list([{ $project: { createdFromQuery: 1, queryHash: 1 } }]);
        expect(res).to.deep.equal([
          { createdFromQuery: { query: { quantity: { $gte: 5 }, type: 'apparel' }, sort: { }, projection: { } }, queryHash: '4D151C4C' },
          { createdFromQuery: { query: { quantity: { $gte: 20 } }, sort: { }, projection: { } }, queryHash: '23B19B75' },
          { createdFromQuery: { query: { item: 'abc', price: { $gte: 5 } }, sort: { }, projection: { } }, queryHash: '117A6B10' },
          { createdFromQuery: { query: { item: 'abc', price: { $gte: 10 } }, sort: { }, projection: { } }, queryHash: '117A6B10' }
        ]);
      });
    });
    describe('clear', () => {
      skipIfServerVersion(testServer, '< 4.4');
      it('clears list', async() => {
        await loadQueryCache(collection);
        const planCache = collection.getPlanCache();
        expect((await planCache.list()).length).to.equal(4);
        const clearRes = await planCache.clear();
        expect(clearRes.ok).to.equal(1);
        expect((await planCache.list()).length).to.equal(0);
      });
    });
    describe('clearPlansByQuery', () => {
      skipIfServerVersion(testServer, '< 4.4');
      it('only clears some queries', async() => {
        const query = { quantity: { $gte: 5 }, type: 'apparel' };
        await loadQueryCache(collection);
        const planCache = collection.getPlanCache();
        expect((await planCache.list()).length).to.equal(4);
        expect((await planCache.list())[0].createdFromQuery.query).to.deep.equal(query);
        const clearRes = await planCache.clearPlansByQuery(query);
        expect(clearRes.ok).to.equal(1);
        expect((await planCache.list()).length).to.equal(3);
        expect((await planCache.list())[0].createdFromQuery.query).to.not.deep.equal(query);
      });
    });
  });
  describe('mapReduce', () => {
    it('accepts function args and collection name as string', async() => {
      await loadMRExample(collection);
      const mapFn = `function() {
        emit(this.cust_id, this.price);
      };`;
      const reduceFn = compileExpr `function(keyCustId, valuesPrices) {
        return valuesPrices.reduce((s, t) => s + t);
      }`;
      const result = await collection.mapReduce(mapFn, reduceFn, 'map_reduce_example');
      expect(result.ok).to.equal(1);
      const outRes = await database.map_reduce_example.find().sort({ _id: 1 }).toArray();
      expect(outRes).to.deep.equal([
        { '_id': 'Ant O. Knee', 'value': 95 },
        { '_id': 'Busby Bee', 'value': 125 },
        { '_id': 'Cam Elot', 'value': 60 },
        { '_id': 'Don Quis', 'value': 155 }
      ]);
    });
    it('accepts string args and collection name as string', async() => {
      await loadMRExample(collection);
      const mapFn = `function() {
        emit(this.cust_id, this.price);
      };`;
      const reduceFn = compileExpr `function(keyCustId, valuesPrices) {
        return valuesPrices.reduce((s, t) => s + t);
      }`;
      const result = await collection.mapReduce(mapFn, reduceFn.toString(), 'map_reduce_example');
      expect(result.ok).to.equal(1);
      expect(result.result).to.equal('map_reduce_example');
      const outRes = await database.map_reduce_example.find().sort({ _id: 1 }).toArray();
      expect(outRes).to.deep.equal([
        { '_id': 'Ant O. Knee', 'value': 95 },
        { '_id': 'Busby Bee', 'value': 125 },
        { '_id': 'Cam Elot', 'value': 60 },
        { '_id': 'Don Quis', 'value': 155 }
      ]);
    });
    it('accepts inline as option', async() => {
      await loadMRExample(collection);
      const mapFn = `function() {
        emit(this.cust_id, this.price);
      };`;
      const reduceFn = compileExpr `function(keyCustId, valuesPrices) {
        return valuesPrices.reduce((s, t) => s + t);
      }`;
      const result = await collection.mapReduce(mapFn, reduceFn.toString(), {
        out: { inline: 1 }
      });
      expect(result.ok).to.equal(1);
      expect(result.results.map(k => k._id).sort()).to.deep.equal([
        'Ant O. Knee',
        'Busby Bee',
        'Cam Elot',
        'Don Quis'
      ]);
      expect(result.results.map(k => k.value).sort()).to.deep.equal([
        125,
        155,
        60,
        95
      ]);
    });
    it('accepts finalize as option', async() => {
      await loadMRExample(collection);
      const mapFn = `function() {
        emit(this.cust_id, this.price);
      };`;
      const reduceFn = compileExpr `function(keyCustId, valuesPrices) {
        return valuesPrices.reduce((s, t) => s + t);
      }`;
      const finalizeFn = compileExpr `function() {
        return 1;
      }`;
      const result = await collection.mapReduce(mapFn, reduceFn.toString(), {
        out: { inline: 1 },
        finalize: finalizeFn
      });
      expect(result.ok).to.equal(1);
      expect(result.results.map(k => k._id).sort()).to.deep.equal([
        'Ant O. Knee',
        'Busby Bee',
        'Cam Elot',
        'Don Quis'
      ]);
      expect(result.results.map(k => k.value)).to.deep.equal([1, 1, 1, 1]);
    });
  });
});
