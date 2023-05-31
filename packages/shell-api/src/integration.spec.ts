import { expect } from 'chai';
import { CliServiceProvider } from '../../service-provider-server'; // avoid cyclic dep just for test
import ShellInstanceState from './shell-instance-state';
import type Cursor from './cursor';
import Explainable from './explainable';
import type Database from './database';
import type Collection from './collection';
import type AggregationCursor from './aggregation-cursor';
import { startTestServer, skipIfServerVersion, skipIfApiStrict } from '../../../testing/integration-testing-hooks';
import { toShellResult, Topologies } from './index';
import type { Document } from '@mongosh/service-provider-core';
import { ShellUserConfig, ApiEvent } from '@mongosh/types';
import { EventEmitter, once } from 'events';
import { dummyOptions } from './helpers.spec';

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

  const loadQueryCache = async(collection: Collection): Promise<any> => {
    const res = await collection.insertMany([
      { '_id': 1, 'item': 'abc', 'price': 12, 'quantity': 2, 'type': 'apparel' },
      { '_id': 2, 'item': 'jkl', 'price': 20, 'quantity': 1, 'type': 'electronics' },
      { '_id': 3, 'item': 'abc', 'price': 10, 'quantity': 5, 'type': 'apparel' },
      { '_id': 4, 'item': 'abc', 'price': 8, 'quantity': 10, 'type': 'apparel' },
      { '_id': 5, 'item': 'jkl', 'price': 15, 'quantity': 15, 'type': 'electronics' }
    ]);
    expect(res.acknowledged).to.equal(true);
    expect(await collection.createIndex({ item: 1 })).to.equal('item_1');
    expect(await collection.createIndex({ item: 1, quantity: 1 })).to.not.be.undefined;
    expect(await collection.createIndex({ item: 1, price: 1 }, { partialFilterExpression: { price: { $gte: 10 } } })).to.not.be.undefined;
    expect(await collection.createIndex({ quantity: 1 })).to.not.be.undefined;
    expect(await collection.createIndex({ quantity: 1, type: 1 })).to.not.be.undefined;

    await (await collection.find( { item: 'abc', price: { $gte: 10 } } )).toArray();
    await (await collection.find( { item: 'abc', price: { $gte: 5 } } )).toArray();
    await (await collection.find( { quantity: { $gte: 20 } } )).toArray();
    await (await collection.find( { quantity: { $gte: 5 }, type: 'apparel' } )).toArray();
  };

  const loadMRExample = async(collection: Collection): Promise<any> => {
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
    serviceProvider = await CliServiceProvider.connect(await testServer.connectionString(), dummyOptions, {}, new EventEmitter());
  });

  after(() => {
    return serviceProvider.close(true);
  });

  let instanceState;
  let shellApi;
  let mongo;
  let dbName;
  let database: Database;
  let collection: Collection;
  let collectionName;

  beforeEach(async() => {
    dbName = `test-${Date.now()}`;
    collectionName = 'docs';

    instanceState = new ShellInstanceState(serviceProvider);
    shellApi = instanceState.shellApi;
    mongo = instanceState.currentDb.getMongo();
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
          await collection.find({}, { _id: 0 });
          await shellApi.it();
          expect({ ...await shellApi.it() }).to.deep.equal({
            cursorHasMore: false,
            documents: [{ doc: 21 }]
          });
        });
      });

      describe('when calling limit after skip', () => {
        let cursor: Cursor;

        beforeEach(async() => {
          cursor = (await collection.find({}, { _id: 0 }))
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
            const { printable: { documents } } = await toShellResult(cursor);
            expect(documents).to.have.property(
              'constructor',
              Array
            );
            expect(documents).to.deep.equal([{ doc: 2 }]);
          });
        });
      });
    });
  });

  describe('collection', () => {
    describe('isCapped', () => {
      it('returns false for a plain collection', async() => {
        await collection.insertOne({});
        const ret = await collection.isCapped();
        expect(ret).to.equal(false);
      });
    });
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

    describe('insertOne', () => {
      it('does not overwrite users object', async() => {
        const d: Document = { name: 'test', zipcode: '12345' };
        await collection.insertOne(d);
        expect(d._id).to.equal(undefined);
      });
    });

    describe('insert', () => {
      context('inserting one document', () => {
        it('does not overwrite users object', async() => {
          const d: Document = { name: 'test', zipcode: '12345' };
          await collection.insert(d);
          expect(d._id).to.equal(undefined);
        });
      });

      context('inserting a list of documents', () => {
        it('does not overwrite users object', async() => {
          const d: Document[] = [
            { name: 'first', zipcode: '12345' },
            { name: 'second', zipcode: '12345' }
          ];
          await collection.insert(d);
          expect(d[0]._id).to.equal(undefined);
          expect(d[1]._id).to.equal(undefined);
        });
      });
    });

    describe('insertMany', () => {
      it('does not overwrite users object', async() => {
        const d: Document[] = [
          { name: 'first', zipcode: '12345' },
          { name: 'second', zipcode: '12345' }
        ];
        await collection.insert(d);
        expect(d[0]._id).to.equal(undefined);
        expect(d[1]._id).to.equal(undefined);
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
            insertedId: 'new-doc',
            matchedCount: 0,
            modifiedCount: 0,
            upsertedCount: 1
          });
        });
      });
    });

    describe('convertToCapped', () => {
      skipIfApiStrict();
      let result;

      beforeEach(async() => {
        await serviceProvider.createCollection(dbName, collectionName);

        expect(await collection.isCapped()).to.be.false;

        result = await collection.convertToCapped(
          1000
        );
      });

      it('returns ok = 1', () => {
        expect(result.ok).to.equal(1);
      });

      it('converts the collection', async() => {
        expect(await collection.isCapped()).to.be.true;
      });
    });

    describe('createIndex', () => {
      let result;

      beforeEach(async() => {
        await serviceProvider.createCollection(dbName, collectionName);
        expect(await getIndexNames(dbName, collectionName)).not.to.contain('index-1');

        result = await collection.createIndex({ x: 1 }, {
          name: 'index-1'
        });
      });

      it('returns index name', () => {
        expect(result).to.equal('index-1');
      });

      it('creates the index', async() => {
        expect(await getIndexNames(dbName, collectionName)).to.contain('index-1');
      });
    });

    describe('createIndexes', () => {
      let result;

      beforeEach(async() => {
        await serviceProvider.createCollection(dbName, collectionName);
        expect(await getIndexNames(dbName, collectionName)).not.to.contain('index-1');

        result = await collection.createIndexes([{ x: 1 }], {
          name: 'index-1'
        });
      });

      it('returns index name list', () => {
        expect(result).to.deep.equal(['index-1']);
      });

      it('creates the index', async() => {
        expect(await getIndexNames(dbName, collectionName)).to.contain('index-1');
      });
    });

    describe('createIndexes with multiple indexes', () => {
      let result;

      beforeEach(async() => {
        await serviceProvider.createCollection(dbName, collectionName);
        expect(await getIndexNames(dbName, collectionName)).not.to.contain('index-1');

        result = await collection.createIndexes([{ x: 1 }, { y: 1 }]);
      });

      it('returns index name list', () => {
        expect(result).to.deep.equal(['x_1', 'y_1']);
      });

      it('creates the index', async() => {
        expect(await getIndexNames(dbName, collectionName)).to.contain('x_1');
        expect(await getIndexNames(dbName, collectionName)).to.contain('y_1');
      });
    });

    describe('getIndexes', () => {
      it('returns indexes for the collection', async() => {
        await serviceProvider.createCollection(dbName, collectionName);
        await serviceProvider.createIndexes(dbName, collectionName, [
          { key: { x: 1 } }
        ]);

        const indexes = await collection.getIndexes();

        expect(indexes.length).to.equal(2);
        expect(indexes[0]).to.deep.include(
          {
            key: {
              _id: 1
            },
            name: '_id_',
            v: 2
          });
        expect(indexes[1]).to.deep.include(
          {
            key: {
              x: 1
            },
            name: 'x_1',
            v: 2
          });
      });

      context('post-5.3', () => {
        skipIfServerVersion(testServer, '< 5.3');

        beforeEach(async() => {
          await serviceProvider.createCollection(
            dbName,
            collectionName,
            {
              clusteredIndex: {
                key: { _id: 1 },
                unique: true
              }
            }
          );
        });

        it('returns clustered indexes for the collection', async() => {
          const indexes = await collection.getIndexes();

          expect(indexes.length).to.equal(1);
          expect(indexes[0]).to.deep.include({
            key: {
              _id: 1
            },
            name: '_id_',
            v: 2,
            clustered: true,
            unique: true
          });
        });
      });
    });

    describe('dropIndexes', () => {
      beforeEach(async() => {
        await serviceProvider.createCollection(dbName, collectionName);
        await serviceProvider.createIndexes(dbName, collectionName, [
          { key: { x: 1 }, name: 'index-1' }
        ]);
      });

      it('removes indexes', async() => {
        expect(await getIndexNames(dbName, collectionName)).to.contain('index-1');

        await collection.dropIndexes('*');

        expect(await getIndexNames(dbName, collectionName)).not.to.contain('index-1');
      });

      it('removes all indexes by default', async() => {
        expect(await getIndexNames(dbName, collectionName)).to.contain('index-1');

        await collection.dropIndexes();

        expect(await getIndexNames(dbName, collectionName)).not.to.contain('index-1');
      });

      it('removes indexes with an array argument', async() => {
        expect(await getIndexNames(dbName, collectionName)).to.contain('index-1');

        await collection.dropIndexes(['index-1']);

        expect(await getIndexNames(dbName, collectionName)).not.to.contain('index-1');
      });
    });

    describe('#reIndex', () => {
      skipIfApiStrict();

      beforeEach(async() => {
        await serviceProvider.createCollection(dbName, collectionName);
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

    describe('#(un)hideIndex', () => {
      skipIfServerVersion(testServer, '< 4.4');

      beforeEach(async() => {
        await serviceProvider.createCollection(dbName, collectionName);
        await collection.insertOne({ a: 1 });
        await collection.createIndex({ a: 1 }, { name: 'a-1' });
      });

      for (const { description, index } of [
        { description: 'by name', index: 'a-1' },
        { description: 'by key pattern', index: { a: 1 } }
      ]) {
        // eslint-disable-next-line no-loop-func
        it(`hides/unhides indexes ${description}`, async() => {
          const indexesBefore = await collection.getIndexes();
          expect(indexesBefore).to.have.lengthOf(2);
          expect(indexesBefore.find(ix => ix.key.a).hidden).to.equal(undefined);

          const hideResult = await collection.hideIndex(index);
          expect(hideResult.hidden_old).to.equal(false);
          expect(hideResult.hidden_new).to.equal(true);

          const indexesWithHidden = await collection.getIndexes();
          expect(indexesWithHidden.find(ix => ix.key.a).hidden).to.equal(true);

          const unhideResult = await collection.unhideIndex(index);
          expect(unhideResult.hidden_old).to.equal(true);
          expect(unhideResult.hidden_new).to.equal(false);

          const indexesAfter = await collection.getIndexes();
          expect(indexesAfter.find(ix => ix.key.a).hidden).to.equal(undefined);
        });
      }
    });

    describe('totalIndexSize', () => {
      skipIfApiStrict();

      beforeEach(async() => {
        await serviceProvider.createCollection(dbName, collectionName);
      });

      it('returns total index size', async() => {
        expect(typeof await collection.totalIndexSize()).to.equal('number');
      });
    });

    // TODO(MONGOSH-1465): integration tests for search indexes

    describe('dataSize', () => {
      skipIfApiStrict();

      beforeEach(async() => {
        await serviceProvider.createCollection(dbName, collectionName);
      });

      it('returns total index size', async() => {
        expect(typeof await collection.dataSize()).to.equal('number');
      });
    });

    describe('storageSize', () => {
      skipIfApiStrict();

      beforeEach(async() => {
        await serviceProvider.createCollection(dbName, collectionName);
      });

      it('returns total index size', async() => {
        expect(typeof await collection.storageSize()).to.equal('number');
      });
    });

    describe('totalSize', () => {
      skipIfApiStrict();

      beforeEach(async() => {
        await serviceProvider.createCollection(dbName, collectionName);
      });

      it('returns total index size', async() => {
        expect(typeof await collection.totalSize()).to.equal('number');
      });
    });

    describe('stats', () => {
      skipIfApiStrict();

      context('with a default collection', () => {
        let hasTotalSize: boolean;

        beforeEach(async() => {
          await serviceProvider.createCollection(dbName, collectionName);
          await serviceProvider.insertOne(dbName, collectionName, { x: 1 });
          hasTotalSize = !(await database.version()).match(/^4\.[0123]\./);
        });

        it('returns the expected stats', async() => {
          const stats = await collection.stats();

          expect(stats.shard).to.equal(undefined);
          expect(stats.shards).to.equal(undefined);
          expect(stats.timeseries).to.equal(undefined);
          expect(stats.maxSize).to.equal(undefined);
          expect(stats.max).to.equal(undefined);
          expect(stats.capped).to.equal(false);
          expect(stats.count).to.equal(1);
          expect(stats.ns).to.equal(`${dbName}.${collectionName}`);
          expect(stats.ok).to.equal(1);
          expect(stats.nindexes).to.equal(1);
          expect(stats.avgObjSize).to.be.a('number');
          expect(stats.size).to.be.a('number');
          expect(stats.storageSize).to.be.a('number');
          expect(stats.totalIndexSize).to.be.a('number');
          expect(stats.indexSizes).to.contain.keys('_id_');
          expect(stats.indexSizes._id_).to.be.a('number');
          expect(stats).to.contain.keys('wiredTiger');
          if (hasTotalSize) {
            // Added in 4.4.
            expect(stats.totalSize).to.be.a('number');
          } else {
            expect(stats.totalSize).to.equal(undefined);
          }
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

      context('with a capped collection', () => {
        beforeEach(async() => {
          await serviceProvider.createCollection(
            dbName,
            collectionName,
            {
              capped: true,
              size: 8192,
              max: 5000
            }
          );
          await serviceProvider.insertOne(dbName, collectionName, { x: 1 });
        });

        it('returns the unscaled maxSize', async() => {
          const stats = await collection.stats();

          expect(stats.maxSize).to.equal(8192);
          expect(stats.max).to.equal(5000);
        });

        it('returns the scaled maxSize', async() => {
          const stats = await collection.stats({ scale: 1024 });

          expect(stats.capped).to.equal(true);
          expect(stats.timeseries).to.equal(undefined);
          expect(stats.shards).to.equal(undefined);
          expect(stats.count).to.equal(1);
          expect(stats.maxSize).to.equal(8);
          expect(stats.max).to.equal(5000);
        });
      });

      context('with a timeseries collection', () => {
        skipIfServerVersion(testServer, '< 5.0');

        beforeEach(async() => {
          await serviceProvider.createCollection(
            dbName,
            collectionName,
            {
              timeseries: {
                timeField: 'timestamp',
                metaField: 'metadata',
                granularity: 'hours'
              }
            }
          );
          await serviceProvider.insertOne(
            dbName,
            collectionName,
            {
              timestamp: new Date(),
              metadata: {
                test: true
              }
            }
          );
        });

        it('returns the timeseries stats', async() => {
          const stats = await collection.stats({ scale: 1024 });

          // Timeseries bucket collection does not provide 'count' or 'avgObjSize'.
          expect(stats.count).to.equal(undefined);
          expect(stats.maxSize).to.equal(undefined);
          expect(stats.capped).to.equal(false);
          expect(stats.timeseries.bucketsNs).to.equal(`${dbName}.system.buckets.${collectionName}`);
          expect(stats.timeseries.bucketCount).to.equal(1);
          expect(stats.timeseries.numBucketInserts).to.equal(1);
          expect(stats.timeseries.numBucketUpdates).to.equal(0);

          expect(stats.timeseries).to.contain.keys(
            'bucketsNs',
            'bucketCount',
            'avgBucketSize',
            'numBucketInserts',
            'numBucketUpdates',
            'numBucketsOpenedDueToMetadata',
            'numBucketsClosedDueToCount',
            'numBucketsClosedDueToSize',
            'numBucketsClosedDueToTimeForward',
            'numBucketsClosedDueToTimeBackward',
            'numBucketsClosedDueToMemoryThreshold',
            'numCommits',
            'numWaits',
            'numMeasurementsCommitted',
            'avgNumMeasurementsPerCommit'
          );
        });
      });
    });

    describe('drop', () => {
      context('when a collection exists', () => {
        let result;
        beforeEach(async() => {
          await serviceProvider.createCollection(dbName, collectionName);
          result = await collection.drop();
        });

        it('returns true', () => {
          expect(result).to.be.true;
        });

        it('deletes the collection', async() => {
          await expectCollectionNotToExist(dbName, collectionName);
        });
      });

      context('when a collection does not exist', () => {
        context('pre-7.0', () => {
          skipIfServerVersion(testServer, '>= 7.0');
          it('returns false', async() => {
            expect(await collection.drop()).to.be.false;
          });
        });

        context('post-7.0', () => {
          skipIfServerVersion(testServer, '< 7.0');
          it('returns true', async() => {
            expect(await collection.drop()).to.be.true;
          });
        });
      });
    });

    describe('exists', () => {
      context('when a collection exists', () => {
        beforeEach(async() => {
          await serviceProvider.createCollection(dbName, collectionName);
        });

        it('returns the collection object', async() => {
          expect((await collection.exists()).name).to.equal(collectionName);
        });
      });

      context('when a collection does not exist', () => {
        it('returns null', async() => {
          expect(await collection.exists()).to.be.null;
        });
      });
    });

    describe('runCommand', () => {
      skipIfApiStrict();

      beforeEach(async() => {
        await serviceProvider.createCollection(dbName, collectionName);
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

      context('on server 4.2+', () => {
        skipIfServerVersion(testServer, '< 4.2');
        it('allows update pipelines', async() => {
          await collection.findAndModify({
            query: { doc: 1 }, new: true, update: [ { $set: { foo: 'bar' } } ]
          });

          expect(
            await findAllWithoutId(dbName, collectionName)
          ).to.deep.include({ doc: 1, foo: 'bar' });
        });
      });
    });

    describe('renameCollection', () => {
      skipIfApiStrict();

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

        expect(await cursor.toArray()).to.deep.equal([{ count: 1 }]);
      });

      it('accepts multiple stages as individual arguments', async() => {
        await serviceProvider.insertOne(dbName, collectionName, { x: 1 });

        const cursor = await collection.aggregate(
          { $match: { x: 0 } },
          { $count: 'count' }
        );

        expect(await cursor.toArray()).to.have.length(0);
      });

      it('runs the aggregation immediately if it is $merge/$out', async() => {
        const x = 123456789;
        await collection.insertOne({ x });

        await collection.aggregate(
          { $match: {} },
          { $out: 'copy' }
        ); // ignore the result

        expect((await database.getCollection('copy').findOne()).x).to.equal(x);
      });

      [true, false, 'queryPlanner'].forEach(explain => {
        it(`runs an explain with explain: ${explain}`, async() => {
          await serviceProvider.insertOne(dbName, collectionName, { x: 1 });

          const cursor = await collection.aggregate([{
            $count: 'count'
          }], {
            explain
          });

          const result = await toShellResult(cursor);
          expect(result.printable).to.include.all.keys([
            'ok',
            'stages',
          ]);
        });
      });
    });

    describe('find', () => {
      it('uses default options for the driver (find)', async() => {
        const longOne = new serviceProvider.bsonLibrary.Long('1');
        await serviceProvider.insertOne(dbName, collectionName, { longOne, _id: 0 });

        const cursor = await collection.find({});

        expect(await cursor.toArray()).to.deep.equal([{ longOne, _id: 0 }]);
      });

      it('passes through options to the driver (find)', async() => {
        const longOne = new serviceProvider.bsonLibrary.Long('1');
        await serviceProvider.insertOne(dbName, collectionName, { longOne, _id: 0 });

        const cursor = await collection.find({}, {}, { promoteLongs: true });

        expect(await cursor.toArray()).to.deep.equal([{ longOne: 1, _id: 0 }]);
      });

      it('uses default options for the driver (findOne)', async() => {
        const longOne = new serviceProvider.bsonLibrary.Long('1');
        await serviceProvider.insertOne(dbName, collectionName, { longOne, _id: 0 });

        const doc = await collection.findOne({});

        expect(doc).to.deep.equal({ longOne, _id: 0 });
      });

      it('passes through options to the driver (findOne)', async() => {
        const longOne = new serviceProvider.bsonLibrary.Long('1');
        await serviceProvider.insertOne(dbName, collectionName, { longOne, _id: 0 });

        const doc = await collection.findOne({}, {}, { promoteLongs: true });

        expect(doc).to.deep.equal({ longOne: 1, _id: 0 });
      });
    });

    describe('dots and dollars in field names', () => {
      skipIfServerVersion(testServer, '<= 4.4');
      if (process.env.MONGOSH_TEST_FORCE_API_STRICT) {
        // https://jira.mongodb.org/browse/SERVER-58076
        skipIfServerVersion(testServer, '<= 6.0');
      }
      it('can insert, modify and retrieve fields with $-prefixed .-containing names', async() => {
        await collection.insertOne({ '$x.y': 1, _id: '_id' });
        expect(await collection.findOne()).to.deep.equal({ '$x.y': 1, _id: '_id' });
        try {
          await collection.updateOne({}, { $inc: { '$x.y': 1 } });
          expect.fail('missed exception');
        } catch (err: any) {
          expect(err.name).to.equal('MongoServerError');
        }
        await collection.updateOne({}, [
          {
            $replaceWith: {
              $setField: {
                field: {
                  $literal: '$x.y'
                },
                value: 2,
                input: '$$ROOT'
              }
            }
          }
        ]);
        expect(await collection.findOne()).to.deep.equal({ '$x.y': 2, _id: '_id' });
      });
    });

    describe('validate', () => {
      skipIfApiStrict();
      skipIfServerVersion(testServer, '< 5.0');

      beforeEach(async() => {
        await collection.insertOne({ foo: 'bar' });
      });

      it('validate can be used to validate a collection', async() => {
        expect((await collection.validate({ full: true })).valid).to.equal(true);
      });

      it('validate accepts a repair option', async() => {
        expect((await collection.validate({ full: true, repair: true })).valid).to.equal(true);
      });

      it('validate accepts a background option', async() => {
        expect((await collection.validate({ full: false, background: true })).valid).to.equal(true);
      });

      it('validate fails with background: true and full: true', async() => {
        try {
          await collection.validate({ full: true, background: true });
          expect.fail('missed exception');
        } catch (err: any) {
          expect(err.name).to.equal('MongoServerError');
        }
      });
    });
  });

  describe('db', () => {
    describe('printShardingStatus', () => {
      it('fails for non-sharded dbs', async() => {
        try {
          await database.printShardingStatus();
        } catch (err: any) {
          expect(err.name).to.equal('MongoshInvalidInputError');
          return;
        }
        expect.fail('Missed exception');
      });
    });

    describe('getCollectionInfos', () => {
      it('returns an array with collection infos', async() => {
        await serviceProvider.createCollection(dbName, collectionName);

        expect(await database.getCollectionInfos({}, { nameOnly: true })).to.deep.equal([{
          name: collectionName,
          type: 'collection'
        }]);
      });
    });

    describe('getCollectionNames', () => {
      it('returns an array with collection names', async() => {
        await serviceProvider.createCollection(dbName, collectionName);

        expect(
          await database.getCollectionNames()
        ).to.deep.equal([collectionName]);
      });
    });

    describe('adminCommand', () => {
      skipIfApiStrict();

      it('runs an adminCommand', async() => {
        const result = await database.adminCommand(
          { serverStatus: 1 }
        );
        expect(result.ok).to.equal(1);
        expect(result.process).to.match(/mongo/);
      });
    });

    describe('aggregate', () => {
      skipIfApiStrict();

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
        await serviceProvider.createCollection(dbName, collectionName);
        await serviceProvider.createCollection(otherDbName, collectionName);

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
      skipIfApiStrict();

      it('creates a collection without options', async() => {
        await database.createCollection('newcoll');
        const stats = (await (
          serviceProvider.aggregate(dbName, 'newcoll', [{ $collStats: { storageStats: {} } }])
        ).toArray())[0];
        expect(stats.storageStats.nindexes).to.equal(1);
      });

      it('creates a collection with options', async() => {
        await database.createCollection('newcoll', {
          capped: true,
          size: 1024,
          max: 5000
        });
        const stats = (await (
          serviceProvider.aggregate(dbName, 'newcoll', [{ $collStats: { storageStats: {} } }])
        ).toArray())[0];
        expect(stats.storageStats.nindexes).to.equal(1);
        expect(stats.storageStats.capped).to.equal(true);
        expect(stats.storageStats.maxSize).to.equal(1024);
        expect(stats.storageStats.max).to.equal(5000);
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
      context('features only available on mongodb 4.4+', () => {
        skipIfServerVersion(testServer, '< 4.4');
        it('creates a view that potentially contains JS functions in its pipeline', async() => {
          const pipeline = (body: any) => [{
            '$set': {
              'name_md5': { '$function': { 'lang': 'js', 'args': ['$name'], 'body': body } }
            }
          }];
          const fn = compileExpr `function (val) {
            return hex_md5(val);
          }`;
          expect(
            await database.createView(
              'view',
              'source',
              pipeline(fn)
            )
          ).to.deep.equal({ ok: 1 });
          const views = await serviceProvider.find(dbName, 'system.views', {}).toArray();
          expect(JSON.parse(JSON.stringify(views))).to.deep.equal([
            {
              _id: `${dbName}.view`,
              viewOn: 'source',
              pipeline: pipeline({ code: fn.toString() })
            }
          ]);
        });
      });
    });

    describe('listCommands', () => {
      skipIfApiStrict();

      it('includes an entry for ping', async() => {
        const { ping } = (await database.listCommands()).value as any;
        expect(ping.help).to.be.a('string');
        expect(ping.adminOnly).to.be.a('boolean');
        expect(ping.secondaryOk).to.be.a('boolean');
      });
    });
  });

  describe('explainable', () => {
    let explainable: Explainable;

    beforeEach(() => {
      explainable = new Explainable(
        mongo,
        collection,
        'queryPlanner'
      );
    });

    describe('find', () => {
      it('returns a cursor that has the explain as result of toShellResult', async() => {
        const cursor = (await explainable.find()).skip(1).limit(1);
        const result = await toShellResult(cursor);
        expect(result.printable).to.include.all.keys([
          'ok',
          'queryPlanner',
          'serverInfo'
        ]);
      });
    });

    describe('aggregate', () => {
      const stages = [
        { $match: {} }, { $skip: 1 }, { $limit: 1 }
      ];

      // we run the tests giving the stages either as a list of args or as an array
      [
        stages,
        [stages]
      ].forEach(args => {
        context(`with stages as ${args.length === 1 ? 'pipeline array' : 'individual args'}`, () => {
          describe('server before 4.2.2', () => {
            skipIfServerVersion(testServer, '>= 4.2.2');
            it('returns a cursor that has the explain as result of toShellResult', async() => {
              const cursor = await collection.explain().aggregate(...args);
              const result = await toShellResult(cursor);
              expect(result.printable).to.include.all.keys([
                'ok',
                'stages'
              ]);
              expect(result.printable.stages[0].$cursor).to.include.all.keys([
                'queryPlanner'
              ]);
              expect(result.printable.stages[0].$cursor).to.not.include.any.keys([
                'executionStats'
              ]);
            });

            it('includes executionStats when requested', async() => {
              const cursor = await collection.explain('executionStats').aggregate(...args);
              const result = await toShellResult(cursor);
              expect(result.printable).to.include.all.keys([
                'ok',
                'stages'
              ]);
              expect(result.printable.stages[0].$cursor).to.include.all.keys([
                'queryPlanner',
                'executionStats'
              ]);
            });
          });

          describe('server from 4.2.2 till 4.4', () => {
            skipIfServerVersion(testServer, '< 4.2.2');
            skipIfServerVersion(testServer, '>= 4.5');
            it('returns a cursor that has the explain as result of toShellResult', async() => {
              const cursor = await collection.explain().aggregate(...args);
              const result = await toShellResult(cursor);
              expect(result.printable).to.include.all.keys([
                'ok',
                'stages',
                'serverInfo'
              ]);
              expect(result.printable.stages[0].$cursor).to.include.all.keys([
                'queryPlanner'
              ]);
              expect(result.printable.stages[0].$cursor).to.not.include.any.keys([
                'executionStats'
              ]);
            });

            it('includes executionStats when requested', async() => {
              const cursor = await collection.explain('executionStats').aggregate(...args);
              const result = await toShellResult(cursor);
              expect(result.printable).to.include.all.keys([
                'ok',
                'stages',
                'serverInfo'
              ]);
              expect(result.printable.stages[0].$cursor).to.include.all.keys([
                'queryPlanner',
                'executionStats'
              ]);
            });
          });

          describe('after server 4.4', () => {
            skipIfServerVersion(testServer, '<= 4.4');
            it('returns a cursor that has the explain as result of toShellResult', async() => {
              const cursor = await collection.explain().aggregate(...args);
              const result = await toShellResult(cursor);
              expect(result.printable).to.include.all.keys([
                'ok',
                'serverInfo',
                'queryPlanner'
              ]);
              expect(result.printable).to.not.include.any.keys([
                'executionStats'
              ]);
            });

            it('includes executionStats when requested', async() => {
              const cursor = await collection.explain('executionStats').aggregate(...args);
              const result = await toShellResult(cursor);
              expect(result.printable).to.include.all.keys([
                'ok',
                'serverInfo',
                'queryPlanner',
                'executionStats'
              ]);
            });
          });
        });
      });
    });

    describe('count', () => {
      it('provides explain information', async() => {
        const explained = await collection.explain().count();
        expect(explained).to.include.all.keys(['ok', 'serverInfo', 'queryPlanner']);
        expect(explained).to.not.include.any.keys(['executionStats']);
        expect(explained.queryPlanner.namespace).to.equal(`${dbName}.${collectionName}`);
      });

      it('includes executionStats when requested', async() => {
        const explained = await collection.explain('executionStats').count();
        expect(explained).to.include.all.keys(['ok', 'serverInfo', 'queryPlanner', 'executionStats']);
      });
    });

    describe('distinct', () => {
      it('provides explain information', async() => {
        const explained = await collection.explain().distinct('_id');
        expect(explained).to.include.all.keys(['ok', 'serverInfo', 'queryPlanner']);
        expect(explained).to.not.include.any.keys(['executionStats']);
      });

      it('includes executionStats when requested', async() => {
        const explained = await collection.explain('executionStats').distinct('_id');
        expect(explained).to.include.all.keys(['ok', 'serverInfo', 'queryPlanner', 'executionStats']);
      });
    });

    describe('findAndModify', () => {
      it('provides explain information', async() => {
        await collection.insertOne({});
        const explained = await collection.explain()
          .findAndModify({ query: {}, update: {} });
        expect(explained).to.include.all.keys(['ok', 'serverInfo', 'queryPlanner']);
        expect(explained).to.not.include.any.keys(['executionStats']);
      });

      it('includes executionStats when requested', async() => {
        await collection.insertOne({});
        const explained = await collection.explain('executionStats')
          .findAndModify({ query: {}, update: {} });
        expect(explained).to.include.all.keys(['ok', 'serverInfo', 'queryPlanner', 'executionStats']);
      });
    });

    describe('findOneAndDelete', () => {
      it('provides explain information', async() => {
        await collection.insertOne({});
        const explained = await collection.explain()
          .findOneAndDelete({});
        expect(explained).to.include.all.keys(['ok', 'serverInfo', 'queryPlanner']);
        expect(explained).to.not.include.any.keys(['executionStats']);
      });

      it('includes executionStats when requested', async() => {
        await collection.insertOne({});
        const explained = await collection.explain('executionStats')
          .findOneAndDelete({});
        expect(explained).to.include.all.keys(['ok', 'serverInfo', 'queryPlanner', 'executionStats']);
      });
    });

    describe('findOneAndReplace', () => {
      it('provides explain information', async() => {
        await collection.insertOne({});
        const explained = await collection.explain()
          .findOneAndReplace({}, {});
        expect(explained).to.include.all.keys(['ok', 'serverInfo', 'queryPlanner']);
        expect(explained).to.not.include.any.keys(['executionStats']);
      });

      it('includes executionStats when requested', async() => {
        await collection.insertOne({});
        const explained = await collection.explain('executionStats')
          .findOneAndReplace({}, {});
        expect(explained).to.include.all.keys(['ok', 'serverInfo', 'queryPlanner', 'executionStats']);
      });
    });

    describe('findOneAndUpdate', () => {
      it('provides explain information', async() => {
        await collection.insertOne({});
        const explained = await collection.explain()
          .findOneAndUpdate({}, { $set: { a: 1 } });
        expect(explained).to.include.all.keys(['ok', 'serverInfo', 'queryPlanner']);
        expect(explained).to.not.include.any.keys(['executionStats']);
      });

      it('includes executionStats when requested', async() => {
        await collection.insertOne({});
        const explained = await collection.explain('executionStats')
          .findOneAndUpdate({}, { $set: { a: 1 } });
        expect(explained).to.include.all.keys(['ok', 'serverInfo', 'queryPlanner', 'executionStats']);
      });
    });

    describe('remove', () => {
      it('provides explain information', async() => {
        const explained = await collection.explain().remove({ notfound: 1 });
        expect(explained).to.include.all.keys(['ok', 'serverInfo', 'queryPlanner']);
        expect(explained).to.not.include.any.keys(['executionStats']);
      });

      it('includes executionStats when requested', async() => {
        const explained = await collection.explain('executionStats').remove({ notfound: 1 });
        expect(explained).to.include.all.keys(['ok', 'serverInfo', 'queryPlanner', 'executionStats']);
      });
    });

    describe('update', () => {
      it('provides explain information', async() => {
        const explained = await collection.explain()
          .update({ notfound: 1 }, { $unset: { laksjdhkgh: '' } });
        expect(explained).to.include.all.keys(['ok', 'serverInfo', 'queryPlanner']);
        expect(explained).to.not.include.any.keys(['executionStats']);
      });

      it('includes executionStats when requested', async() => {
        const explained = await collection.explain('executionStats')
          .update({ notfound: 1 }, { $unset: { laksjdhkgh: '' } });
        expect(explained).to.include.all.keys(['ok', 'serverInfo', 'queryPlanner', 'executionStats']);
      });
    });

    describe('mapReduce', () => {
      skipIfServerVersion(testServer, '< 4.4');

      let mapFn;
      let reduceFn;
      beforeEach(async() => {
        await loadMRExample(collection);
        mapFn = compileExpr `function() {
          emit(this.cust_id, this.price);
        }`;
        reduceFn = compileExpr `function(keyCustId, valuesPrices) {
          return valuesPrices.reduce((s, t) => s + t);
        }`;
      });
      it('provides explain information', async() => {
        const explained = await collection.explain().mapReduce(mapFn, reduceFn, 'map_reduce_example');
        expect(explained).to.include.all.keys(['ok', 'serverInfo', 'stages']);
        expect(explained.stages[0].$cursor).to.include.all.keys(['queryPlanner']);
      });

      it('includes executionStats when requested', async() => {
        const explained = await collection.explain('executionStats').mapReduce(mapFn, reduceFn, 'map_reduce_example');
        expect(explained).to.include.all.keys(['ok', 'serverInfo', 'stages']);
        expect(explained.stages[0].$cursor).to.include.all.keys(['queryPlanner', 'executionStats']);
      });
    });

    describe('invalid verbosity', () => {
      it('rejects with a server error', async() => {
        try {
          await (await collection.find()).explain('foo');
          expect.fail('missed exception');
        } catch (err: any) {
          expect(err.name).to.equal('MongoServerError');
        }
      });
    });
  });

  describe('Bulk API', () => {
    let bulk;
    const size = 100;
    ['initializeUnorderedBulkOp', 'initializeOrderedBulkOp'].forEach((m) => {
      describe(m, () => {
        describe('insert', () => {
          beforeEach(async() => {
            bulk = await collection[m]();
            for (let i = 0; i < size; i++) {
              bulk.insert({ x: i });
            }
            expect(await collection.countDocuments()).to.equal(0);
            await bulk.execute();
          });
          it('toJSON returns correctly', () => {
            expect(bulk.toJSON()).to.deep.equal({ nInsertOps: size, nUpdateOps: 0, nRemoveOps: 0, nBatches: 1 });
          });
          it('executes', async() => {
            expect(await collection.countDocuments()).to.equal(size);
          });
          it('getOperations returns correctly', () => {
            const ops = bulk.getOperations();
            expect(ops.length).to.equal(1);
            const op = ops[0];
            expect(op.originalZeroIndex).to.equal(0);
            expect(op.batchType).to.equal(1);
            expect(op.operations.length).to.equal(size);
            expect(op.operations[99].x).to.equal(99);
          });
        });
        describe('remove', () => {
          beforeEach(async() => {
            bulk = await collection[m]();
            for (let i = 0; i < size; i++) {
              await collection.insertOne({ x: i });
            }
            expect(await collection.countDocuments()).to.equal(size);
            bulk.find({ x: { $mod: [ 2, 0 ] } }).remove();
            await bulk.execute();
          });
          it('toJSON returns correctly', () => {
            expect(bulk.toJSON()).to.deep.equal({ nInsertOps: 0, nUpdateOps: 0, nRemoveOps: 1, nBatches: 1 });
          });
          it('executes', async() => {
            expect(await collection.countDocuments()).to.equal(size / 2);
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
        describe('removeOne', () => {
          beforeEach(async() => {
            bulk = await collection[m]();
            for (let i = 0; i < size; i++) {
              await collection.insertOne({ x: i });
            }
            expect(await collection.countDocuments()).to.equal(size);
            bulk.find({ x: { $mod: [ 2, 0 ] } }).removeOne();
            await bulk.execute();
          });
          it('toJSON returns correctly', () => {
            expect(bulk.toJSON()).to.deep.equal({ nInsertOps: 0, nUpdateOps: 0, nRemoveOps: 1, nBatches: 1 });
          });
          it('executes', async() => {
            expect(await collection.countDocuments()).to.equal(size - 1);
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
        describe('replaceOne', () => {
          beforeEach(async() => {
            bulk = await collection[m]();
            for (let i = 0; i < size; i++) {
              await collection.insertOne({ x: i });
            }
            expect(await collection.countDocuments()).to.equal(size);
            bulk.find({ x: 2 }).replaceOne({ x: 1 });
            await bulk.execute();
          });
          it('toJSON returns correctly', () => {
            expect(bulk.toJSON()).to.deep.equal({ nInsertOps: 0, nUpdateOps: 1, nRemoveOps: 0, nBatches: 1 });
          });
          it('executes', async() => {
            expect(await collection.countDocuments({ x: 1 })).to.equal(2);
            expect(await collection.countDocuments({ x: 2 })).to.equal(0);
            expect(await collection.countDocuments()).to.equal(size);
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
        describe('updateOne', () => {
          beforeEach(async() => {
            bulk = await collection[m]();
            for (let i = 0; i < size; i++) {
              await collection.insertOne({ x: i });
            }
            expect(await collection.countDocuments()).to.equal(size);
            bulk.find({ x: 2 }).updateOne({ $inc: { x: -1 } });
            await bulk.execute();
          });
          it('toJSON returns correctly', () => {
            expect(bulk.toJSON()).to.deep.equal({ nInsertOps: 0, nUpdateOps: 1, nRemoveOps: 0, nBatches: 1 });
          });
          it('executes', async() => {
            expect(await collection.countDocuments({ x: 1 })).to.equal(2);
            expect(await collection.countDocuments({ x: 2 })).to.equal(0);
            expect(await collection.countDocuments()).to.equal(size);
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
        describe('update', () => {
          beforeEach(async() => {
            bulk = await collection[m]();
            for (let i = 0; i < size; i++) {
              await collection.insertOne({ x: i });
            }
            expect(await collection.countDocuments()).to.equal(size);
            bulk.find({ x: { $mod: [ 2, 0 ] } }).update({ $inc: { x: 1 } });
            await bulk.execute();
          });
          it('toJSON returns correctly', () => {
            expect(bulk.toJSON()).to.deep.equal({ nInsertOps: 0, nUpdateOps: 1, nRemoveOps: 0, nBatches: 1 });
          });
          it('executes', async() => {
            expect(await collection.countDocuments()).to.equal(size);
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
        describe('upsert().update', () => {
          beforeEach(async() => {
            bulk = await collection[m]();
            for (let i = 0; i < size; i++) {
              await collection.insertOne({ x: i });
            }
            expect(await collection.countDocuments()).to.equal(size);
            expect(await collection.countDocuments({ y: { $exists: true } })).to.equal(0);
            bulk.find({ y: 0 }).upsert().update({ $set: { y: 1 } });
            await bulk.execute();
          });
          afterEach(async() => {
            await collection.drop();
          });
          it('toJSON returns correctly', () => {
            expect(bulk.toJSON()).to.deep.equal({ nInsertOps: 0, nUpdateOps: 1, nRemoveOps: 0, nBatches: 1 });
          });
          it('executes', async() => {
            expect(await collection.countDocuments()).to.equal(size + 1);
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
        describe('upsert().updateOne', () => {
          beforeEach(async() => {
            bulk = await collection[m]();
            for (let i = 0; i < size; i++) {
              await collection.insertOne({ x: i });
            }
            expect(await collection.countDocuments()).to.equal(size);
            expect(await collection.countDocuments({ y: { $exists: true } })).to.equal(0);
            bulk.find({ y: 0 }).upsert().updateOne({ $set: { y: 1 } });
            await bulk.execute();
          });
          it('toJSON returns correctly', () => {
            expect(bulk.toJSON()).to.deep.equal({ nInsertOps: 0, nUpdateOps: 1, nRemoveOps: 0, nBatches: 1 });
          });
          it('executes', async() => {
            expect(await collection.countDocuments()).to.equal(size + 1);
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
        describe('update without upsert', () => {
          beforeEach(async() => {
            bulk = await collection[m]();
            for (let i = 0; i < size; i++) {
              await collection.insertOne({ x: i });
            }
            expect(await collection.countDocuments()).to.equal(size);
            expect(await collection.countDocuments({ y: { $exists: true } })).to.equal(0);
            bulk.find({ y: 0 }).update({ $set: { y: 1 } });
            await bulk.execute();
          });
          it('executes', async() => {
            expect(await collection.countDocuments()).to.equal(size);
            expect(await collection.countDocuments({ y: { $exists: true } })).to.equal(0);
          });
        });
        describe('multiple batches', () => {
          beforeEach(async() => {
            bulk = await collection[m]();
            for (let i = 0; i < size; i++) {
              bulk.insert({ x: 1 });
            }
            expect(bulk.toJSON().nBatches).to.equal(1);
            bulk.find({ x: 1 }).remove();
            expect(bulk.toJSON().nBatches).to.equal(2);
            bulk.find({ x: 2 }).update({ $inc: { x: 1 } });
            expect(bulk.toJSON().nBatches).to.equal(3);
            for (let i = 0; i < size; i++) {
              bulk.insert({ x: 1 });
            }
          });
          it('updates count depending on ordered or not', () => {
            expect(bulk.toJSON().nBatches).to.equal(m === 'initializeUnorderedBulkOp' ? 3 : 4);
          });
        });
        describe('collation', () => {
          it('respects collation settings', async() => {
            await collection.insertOne({ name: 'cafe', customers: 10 });
            const bulk = await collection[m]();
            await bulk
              .find({ name: 'café' })
              .collation({ locale: 'fr', strength: 1 })
              .update({ $set: { customers: 20 } })
              .execute();
            expect(await (await collection.find({ name: 'cafe' }, { _id: 0 })).toArray()).to.deep.equal([{
              name: 'cafe', customers: 20
            }]);
          });
        });
        describe('arrayFilters().update', () => {
          beforeEach(async() => {
            bulk = await collection[m]();
            for (let i = 0; i < 10; i++) {
              await collection.insertOne({ x: i, arr: [1, -1] });
            }
            expect(await collection.countDocuments({ x: { $exists: true } })).to.equal(10);
            bulk.find({ x: { $exists: true } }).arrayFilters([{ element: { $gte: 0 } }]).update({ $set: { 'arr.$[element]': -1 } });
            await bulk.execute();
          });
          afterEach(async() => {
            await collection.drop();
          });
          it('toJSON returns correctly', () => {
            expect(bulk.toJSON()).to.deep.equal({ nInsertOps: 0, nUpdateOps: 1, nRemoveOps: 0, nBatches: 1 });
          });
          it('executes', async() => {
            expect(await collection.countDocuments()).to.equal(10);
            expect(await collection.countDocuments({ arr: [ -1, -1 ] })).to.equal(10);
            expect(await collection.countDocuments({ arr: [ 1, -1 ] })).to.equal(0);
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
        context('with >= 4.2 server', () => {
          skipIfServerVersion(testServer, '< 4.2');
          describe('update() with pipeline update', () => {
            beforeEach(async() => {
              bulk = await collection[m]();
              for (let i = 0; i < size; i++) {
                await collection.insertOne({ x: i });
              }
              expect(await collection.countDocuments()).to.equal(size);
              expect(await collection.countDocuments({ y: { $exists: true } })).to.equal(0);
              bulk.find({ y: 0 }).upsert().update([{ $set: { y: 1 } }]);
              await bulk.execute();
            });
            afterEach(async() => {
              await collection.drop();
            });
            it('toJSON returns correctly', () => {
              expect(bulk.toJSON()).to.deep.equal({ nInsertOps: 0, nUpdateOps: 1, nRemoveOps: 0, nBatches: 1 });
            });
            it('executes', async() => {
              expect(await collection.countDocuments()).to.equal(size + 1);
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
          describe('updateOne() with pipeline update', () => {
            beforeEach(async() => {
              bulk = await collection[m]();
              for (let i = 0; i < size; i++) {
                await collection.insertOne({ x: i });
              }
              expect(await collection.countDocuments()).to.equal(size);
              expect(await collection.countDocuments({ y: { $exists: true } })).to.equal(0);
              bulk.find({ y: 0 }).upsert().updateOne([{ $set: { y: 1 } }]);
              await bulk.execute();
            });
            it('toJSON returns correctly', () => {
              expect(bulk.toJSON()).to.deep.equal({ nInsertOps: 0, nUpdateOps: 1, nRemoveOps: 0, nBatches: 1 });
            });
            it('executes', async() => {
              expect(await collection.countDocuments()).to.equal(size + 1);
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
        });
        describe('error states', () => {
          it('cannot be executed twice', async() => {
            bulk = await collection[m]();
            bulk.insert({ x: 1 });
            await bulk.execute();
            try {
              await bulk.execute();
            } catch (err: any) {
              expect(err.name).to.equal('MongoBatchReExecutionError');
              return;
            }
            expect.fail('Error not thrown');
          });
          it('getOperations fails before execute', async() => {
            bulk = await collection[m]();
            bulk.insert({ x: 1 });
            try {
              bulk.getOperations();
            } catch (err: any) {
              expect(err.name).to.equal('MongoshInvalidInputError');
              return;
            }
            expect.fail('Error not thrown');
          });
          it('No ops', async() => {
            bulk = await collection[m]();
            try {
              await bulk.execute();
            } catch (err: any) {
              expect(err.name).to.include('Error');
              return;
            }
            expect.fail('Error not thrown');
          });
          it('Driver error', async() => {
            bulk = await collection[m]();
            bulk.find({}).update({ x: 1 });
            try {
              await bulk.execute();
            } catch (err: any) {
              expect(err.name).to.include('BulkWriteError');
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
        expect(mongo.getReadConcern()).to.equal(undefined);
        await mongo.setReadConcern('local');
        expect(mongo.getReadConcern()).to.equal('local');
        expect(serviceProvider.mongoClient).to.not.equal(oldMC);
      });
    });
    describe('setReadPref', () => {
      it('reconnects', async() => {
        const oldMC = serviceProvider.mongoClient;
        expect((serviceProvider.mongoClient as any).s.options.readPreference.mode).to.deep.equal('primary');
        await mongo.setReadPref('secondaryPreferred');
        expect((serviceProvider.mongoClient as any).s.options.readPreference.mode).to.equal('secondaryPreferred');
        expect(serviceProvider.mongoClient).to.not.equal(oldMC);
      });
    });
    describe('setWriteConcern', () => {
      it('reconnects', async() => {
        const oldMC = serviceProvider.mongoClient;
        expect(mongo.getWriteConcern()).to.equal(undefined);
        await mongo.setWriteConcern('majority', 200);
        expect(mongo.getWriteConcern()).to.deep.equal({
          w: 'majority',
          wtimeout: 200
        });
        expect(serviceProvider.mongoClient).to.not.equal(oldMC);
      });
    });
    describe('close', () => {
      it('removes the connection from the set of connections', async() => {
        // eslint-disable-next-line new-cap
        const newMongo = await shellApi.Mongo(mongo._uri);
        expect(instanceState.mongos).to.deep.equal([mongo, newMongo]);
        await newMongo.close();
        expect(instanceState.mongos).to.deep.equal([mongo]);
      });
    });
    describe('getDBs', () => {
      it('lists all databases', async() => {
        const result = await mongo.getDBs();
        expect(result.ok).to.equal(1);
        const admin = result.databases.find(db => db.name === 'admin');
        // The 5.0+ server responds with a Long.
        expect(typeof admin.sizeOnDisk === 'number' || admin.sizeOnDisk.constructor.name === 'Long').to.equal(true);
      });
    });
    describe('getDBNames', () => {
      it('lists all database names', async() => {
        expect(await mongo.getDBNames()).to.include('admin');
      });
    });
    describe('connect with --tls but not tls=...', () => {
      beforeEach(() => {
        (serviceProvider as any).getRawClient = () => {
          return { options: { tls: true } };
        };
      });
      afterEach(() => {
        delete serviceProvider.getRawClient;
      });

      it('adds a notice to the error message', async() => {
        try {
          // eslint-disable-next-line new-cap
          await shellApi.Mongo(`${await testServer.connectionString()}/?replicaSet=notexist&serverSelectionTimeoutMS=100`);
        } catch (e: any) {
          expect(e.message).to.match(/Server selection timed out.+\(is \?tls=true missing from the connection string\?\)$/);
        }
      });

      it('does not add a notice to the error message if tls= is already specified', async() => {
        try {
          // eslint-disable-next-line new-cap
          await shellApi.Mongo(`${await testServer.connectionString()}/?replicaSet=notexist&serverSelectionTimeoutMS=100&tls=false`);
        } catch (e: any) {
          expect(e.message).to.match(/Server selection timed out[^()]+$/);
        }
      });
    });
    describe('convertShardKeyToHashed', () => {
      skipIfServerVersion(testServer, '< 4.4');

      it('converts a shard key to its hashed representation', async() => {
        const result = await mongo.convertShardKeyToHashed({ foo: 'bar' });
        expect(result.constructor.name).to.equal('Long');
        expect(result.toString()).to.equal('4975617422686807705');
      });
    });
  });
  describe('PlanCache', () => {
    skipIfApiStrict();

    describe('list', () => {
      skipIfServerVersion(testServer, '< 4.4');
      it('lists all without args', async() => {
        await loadQueryCache(collection);
        const planCache = collection.getPlanCache();
        const res = await planCache.list();
        expect(res.length).to.equal(4);
      });
      it('lists projection with args', async() => {
        await loadQueryCache(collection);
        const planCache = collection.getPlanCache();
        const res = await planCache.list([{ $project: { queryHash: 1 } }]);
        // The 6.0 server greatly reduces the expectations we can make here,
        // so just assert that query hashes are returned.
        expect(res).to.have.lengthOf(4);
        expect(res.map(doc => Object.keys(doc))).to.deep.equal([
          ['queryHash'], ['queryHash'], ['queryHash'], ['queryHash']
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
        const clearRes = await planCache.clearPlansByQuery(query);
        expect(clearRes.ok).to.equal(1);
        expect((await planCache.list()).length).to.equal(3);
      });
    });
  });
  describe('mapReduce', () => {
    skipIfApiStrict();

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
      const outRes = await (await database.getCollection('map_reduce_example').find()).sort({ _id: 1 }).toArray();
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
      const outRes = await (await database.getCollection('map_reduce_example').find()).sort({ _id: 1 }).toArray();
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

  describe('ShellInstanceState', () => {
    beforeEach(async() => {
      await instanceState.fetchConnectionInfo();
    });

    describe('fetchConnectionInfo', () => {
      skipIfApiStrict();

      it('returns information about the connection', async() => {
        expect(instanceState.connectionInfo.buildInfo.version).to.equal(await database.version());
      });
    });

    describe('getAutocompleteParameters', () => {
      let connectionString: string;
      beforeEach(async() => {
        // Make sure the collection is present so it is included in autocompletion.
        await collection.insertOne({});
        // Make sure 'database' is the current db in the eyes of the instance state object.
        instanceState.setDbFunc(database);
        connectionString = await testServer.connectionString();
        if (!connectionString.endsWith('/')) {
          connectionString += '/';
        }
      });

      it('returns information that is meaningful for autocompletion', async() => {
        const params = await instanceState.getAutocompleteParameters();
        expect(params.topology()).to.equal(Topologies.Standalone);
        expect(params.connectionInfo().uri).to.equal(connectionString);
        expect(params.connectionInfo().is_atlas).to.equal(false);
        expect(params.connectionInfo().is_localhost).to.equal(true);
        expect(await database._getCollectionNames()).to.deep.equal(['docs']);
        expect(await params.getCollectionCompletionsForCurrentDb('d')).to.deep.equal(['docs']);
        expect(await params.getCollectionCompletionsForCurrentDb('D')).to.deep.equal(['docs']);
        expect(await params.getCollectionCompletionsForCurrentDb('e')).to.deep.equal([]);
        expect(await params.getDatabaseCompletions('test-')).to.deep.equal([database.getName()]);
        expect(await params.getDatabaseCompletions('TEST-')).to.deep.equal([database.getName()]);
      });
    });
  });

  describe('database commands', () => {
    context('hello as isMaster', () => {
      skipIfApiStrict();
      it('db.isMaster() works', async() => {
        expect((await database.isMaster()).ismaster).to.equal(true);
        expect((await database.isMaster()).isWritablePrimary).to.equal(true);
      });
    });

    context('hello as hello', () => {
      it('db.hello() works', async() => {
        const result = await database.hello();
        expect(result.ismaster).to.equal(undefined);
        expect(result.isWritablePrimary).to.equal(true);
      });
    });

    context('with 5.0+ server', () => {
      skipIfApiStrict();
      skipIfServerVersion(testServer, '<= 4.4');

      it('db.rotateCertificates() works', async() => {
        expect((await database.rotateCertificates()).ok).to.equal(1);
        expect((await database.rotateCertificates('message')).ok).to.equal(1);
      });
    });
  });

  describe('displayBatchSize precedence', () => {
    beforeEach(async() => {
      await collection.insertMany([...Array(100).keys()].map(i => ({ i })));
      const cfg = new ShellUserConfig();
      instanceState.setEvaluationListener({
        getConfig(key: string) { return cfg[key]; },
        setConfig(key: string, value: any) { cfg[key] = value; return 'success'; },
        resetConfig(key: string) { cfg[key] = (new ShellUserConfig())[key]; return 'success'; },
        listConfigOptions() { return Object.keys(cfg); }
      });
      expect((await (await collection.find())._it()).documents).to.have.lengthOf(20);
    });

    it('config changes affect displayBatchSize', async() => {
      await shellApi.config.set('displayBatchSize', 10);
      expect((await (await collection.find())._it()).documents).to.have.lengthOf(10);
    });

    it('DBQuery.shellBatchSize takes precedence over config', async() => {
      await shellApi.config.set('displayBatchSize', 10);
      shellApi.DBQuery.shellBatchSize = 30;
      expect(shellApi.DBQuery.shellBatchSize).to.equal(30);
      expect((await (await collection.find())._it()).documents).to.have.lengthOf(30);
    });

    it('cursor.batchSize does not override config displayBatchSize', async() => {
      await shellApi.config.set('displayBatchSize', 10);
      expect((await (await collection.find()).batchSize(50)._it()).documents).to.have.lengthOf(10);
    });

    it('cursor.batchSize does not override DBQuery.shellBatchSize', async() => {
      shellApi.DBQuery.shellBatchSize = 5;
      expect(shellApi.DBQuery.shellBatchSize).to.equal(5);
      expect((await (await collection.find()).batchSize(50)._it()).documents).to.have.lengthOf(5);
    });
  });

  describe('maxTimeMS support', () => {
    skipIfServerVersion(testServer, '< 4.2');

    beforeEach(async() => {
      await collection.insertMany([...Array(10).keys()].map(i => ({ i })));
      const cfg = new ShellUserConfig();
      instanceState.setEvaluationListener({
        getConfig(key: string) { return cfg[key]; },
        setConfig(key: string, value: any) { cfg[key] = value; return 'success'; },
        listConfigOptions() { return Object.keys(cfg); }
      });
    });

    it('config changes affect maxTimeMS', async() => {
      await shellApi.config.set('maxTimeMS', 100);
      try {
        // eslint-disable-next-line no-constant-condition
        await (await collection.find({ $where: function() { while (true); } })).next();
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.codeName).to.equal('MaxTimeMSExpired');
      }
    });

    it('maxTimeMS can be passed explicitly', async() => {
      await shellApi.config.set('maxTimeMS', null);
      try {
        // eslint-disable-next-line no-constant-condition
        await (await collection.find({ $where: function() { while (true); } }, {}, { maxTimeMS: 100 })).next();
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.codeName).to.equal('MaxTimeMSExpired');
      }
    });
  });

  describe('cursor map/forEach', () => {
    beforeEach(async() => {
      await collection.insertMany([...Array(10).keys()].map(i => ({ i })));
    });

    it('forEach() iterates over input but does not return anything', async() => {
      let value = 0;
      const result = await (await collection.find()).forEach(({ i }) => { value += i; });
      expect(result).to.equal(undefined);
      expect(value).to.equal(45);
    });

    it('map() iterates over input and changes documents in-place', async() => {
      const cursor = await collection.find();
      cursor.map(({ i }) => ({ j: i }));
      expect((await cursor._it()).documents[0]).to.deep.equal({ j: 0 });
    });

    it('forEach() errors lead to a rejected promise', async() => {
      const error = new Error();
      let calls = 0;
      try {
        await (await collection.find()).forEach(() => { calls++; throw error; });
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err).to.equal(error);
      }
      expect(calls).to.equal(1);
    });

    it('map() errors show up when reading the cursor', async() => {
      const error = new Error();
      const cursor = await collection.find();
      let calls = 0;
      cursor.map(() => { calls++; throw error; });
      for (let i = 0; i < 2; i++) {
        // Try reading twice to make sure .map() is called again for the second attempt.
        try {
          await cursor.tryNext();
          expect.fail('missed exception');
        } catch (err: any) {
          expect(err).to.equal(error);
        }
      }
      expect(calls).to.equal(2);
    });
  });

  describe('method tracking', () => {
    it('emits an event when a deprecated method is called', async() => {
      const deprecatedCall = once(instanceState.messageBus, 'mongosh:api-call');
      try {
        mongo.setSlaveOk();
        expect.fail('Expected error');
      } catch (e: any) {
        expect(e.message).to.contain('slaveOk is deprecated');
      }
      const events = await deprecatedCall;
      expect(events).to.have.length(1);
      expect(events[0]).to.deep.equal({
        method: 'setSlaveOk',
        class: 'Mongo',
        deprecated: true,
        callDepth: 0,
        isAsync: false
      });
    });

    it('keeps track of whether a call is a top-level call or not', async() => {
      const events: ApiEvent[] = [];
      instanceState.messageBus.on('mongosh:api-call', (ev: ApiEvent) => events.push(ev));
      try {
        await database.printShardingStatus();
        expect.fail('Expected error');
      } catch (e: any) {
        expect(e.message).to.contain('This db does not have sharding enabled');
      }
      expect(events.length).to.be.greaterThan(1);
      expect(events[0]).to.deep.equal({
        method: 'printShardingStatus',
        class: 'Database',
        deprecated: false,
        callDepth: 0,
        isAsync: true
      });
      expect(events.filter(ev => ev.method === 'find').length).to.be.greaterThan(1);
      expect(events.filter(ev => ev.method === 'print').length).to.equal(1);
      expect(events.filter(ev => ev.callDepth === 0).length).to.equal(1);
    });
  });

  describe('interruption', () => {
    it('allows interrupting and resuming Mongo instances', async() => {
      expect(instanceState.interrupted.isSet()).to.equal(false);
      expect(await database.runCommand({ ping: 1 })).to.deep.equal({ ok: 1 });
      await instanceState.onInterruptExecution();
      expect(instanceState.interrupted.isSet()).to.equal(true);
      try {
        await database.runCommand({ ping: 1 });
        expect.fail('missed exceptino');
      } catch (e: any) {
        expect(e.name).to.equal('MongoshInterruptedError');
      }
      await instanceState.onResumeExecution();
      expect(instanceState.interrupted.isSet()).to.equal(false);
      expect(await database.runCommand({ ping: 1 })).to.deep.equal({ ok: 1 });
    });
  });
});
