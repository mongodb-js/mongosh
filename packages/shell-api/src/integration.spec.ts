import { expect } from 'chai';
import { NodeDriverServiceProvider } from '../../service-provider-node-driver'; // avoid cyclic dep just for test
import ShellInstanceState from './shell-instance-state';
import type Cursor from './cursor';
import Explainable from './explainable';
import type Database from './database';
import type Collection from './collection';
import {
  skipIfServerVersion,
  skipIfApiStrict,
  startSharedTestServer,
} from '../../../testing/integration-testing-hooks';
import type { ShellApi, Mongo } from './index';
import { toShellResult, Topologies } from './index';
import type {
  AnyBulkWriteOperation,
  Document,
} from '@mongosh/service-provider-core';
import type { ApiEvent } from '@mongosh/types';
import { ShellUserConfig } from '@mongosh/types';
import { EventEmitter, once } from 'events';
import { dummyOptions } from './helpers.spec';
import type { ShellBson } from './shell-bson';
import type Bulk from './bulk';

// Compile JS code as an expression. We use this to generate some JS functions
// whose code is stringified and compiled elsewhere, to make sure that the code
// does not contain coverage instrumentation.
const compileExpr = (templ: TemplateStringsArray, ...subs: string[]): any => {
  return eval(`(${String.raw(templ, ...subs)})`);
};

describe('Shell API (integration)', function () {
  const testServer = startSharedTestServer();
  this.timeout(60000);
  let serviceProvider: NodeDriverServiceProvider;

  const getIndexNames = async (
    dbName: string,
    collectionName: string
  ): Promise<any> => {
    const specs = await serviceProvider.getIndexes(dbName, collectionName);

    return specs.map((spec) => spec.name);
  };

  const findAllWithoutId = (dbName: string, collectionName: string): any =>
    serviceProvider
      .find(dbName, collectionName, {}, { projection: { _id: 0 } })
      .toArray();

  const expectCollectionToExist = async (
    dbName: any,
    collectionName: any
  ): Promise<void> => {
    const collectionNames = (await serviceProvider.listCollections(dbName)).map(
      ({ name }) => name
    );
    expect(collectionNames).to.include(collectionName);
  };

  const expectCollectionNotToExist = async (
    dbName: any,
    collectionName: any
  ): Promise<void> => {
    const collectionNames = (await serviceProvider.listCollections(dbName)).map(
      ({ name }) => name
    );
    expect(collectionNames).to.not.include(collectionName);
  };

  const loadQueryCache = async (collection: Collection): Promise<any> => {
    const res = await collection.insertMany([
      { _id: 1, item: 'abc', price: 12, quantity: 2, type: 'apparel' },
      { _id: 2, item: 'jkl', price: 20, quantity: 1, type: 'electronics' },
      { _id: 3, item: 'abc', price: 10, quantity: 5, type: 'apparel' },
      { _id: 4, item: 'abc', price: 8, quantity: 10, type: 'apparel' },
      { _id: 5, item: 'jkl', price: 15, quantity: 15, type: 'electronics' },
    ]);
    expect(res.acknowledged).to.equal(true);
    expect(await collection.createIndex({ item: 1 })).to.equal('item_1');
    expect(await collection.createIndex({ item: 1, quantity: 1 })).to.not.be
      .undefined;
    expect(
      await collection.createIndex(
        { item: 1, price: 1 },
        { partialFilterExpression: { price: { $gte: 10 } } }
      )
    ).to.not.be.undefined;
    expect(await collection.createIndex({ quantity: 1 })).to.not.be.undefined;
    expect(await collection.createIndex({ quantity: 1, type: 1 })).to.not.be
      .undefined;

    await (
      await collection.find({ item: 'abc', price: { $gte: 10 } })
    ).toArray();
    await (
      await collection.find({ item: 'abc', price: { $gte: 5 } })
    ).toArray();
    await (await collection.find({ quantity: { $gte: 20 } })).toArray();
    await (
      await collection.find({ quantity: { $gte: 5 }, type: 'apparel' })
    ).toArray();
  };

  const loadMRExample = async (collection: Collection): Promise<any> => {
    const res = await collection.insertMany([
      {
        _id: 1,
        cust_id: 'Ant O. Knee',
        ord_date: new Date('2020-03-01'),
        price: 25,
        items: [
          { sku: 'oranges', qty: 5, price: 2.5 },
          { sku: 'apples', qty: 5, price: 2.5 },
        ],
        status: 'A',
      },
      {
        _id: 2,
        cust_id: 'Ant O. Knee',
        ord_date: new Date('2020-03-08'),
        price: 70,
        items: [
          { sku: 'oranges', qty: 8, price: 2.5 },
          { sku: 'chocolates', qty: 5, price: 10 },
        ],
        status: 'A',
      },
      {
        _id: 3,
        cust_id: 'Busby Bee',
        ord_date: new Date('2020-03-08'),
        price: 50,
        items: [
          { sku: 'oranges', qty: 10, price: 2.5 },
          { sku: 'pears', qty: 10, price: 2.5 },
        ],
        status: 'A',
      },
      {
        _id: 4,
        cust_id: 'Busby Bee',
        ord_date: new Date('2020-03-18'),
        price: 25,
        items: [{ sku: 'oranges', qty: 10, price: 2.5 }],
        status: 'A',
      },
      {
        _id: 5,
        cust_id: 'Busby Bee',
        ord_date: new Date('2020-03-19'),
        price: 50,
        items: [{ sku: 'chocolates', qty: 5, price: 10 }],
        status: 'A',
      },
      {
        _id: 6,
        cust_id: 'Cam Elot',
        ord_date: new Date('2020-03-19'),
        price: 35,
        items: [
          { sku: 'carrots', qty: 10, price: 1.0 },
          { sku: 'apples', qty: 10, price: 2.5 },
        ],
        status: 'A',
      },
      {
        _id: 7,
        cust_id: 'Cam Elot',
        ord_date: new Date('2020-03-20'),
        price: 25,
        items: [{ sku: 'oranges', qty: 10, price: 2.5 }],
        status: 'A',
      },
      {
        _id: 8,
        cust_id: 'Don Quis',
        ord_date: new Date('2020-03-20'),
        price: 75,
        items: [
          { sku: 'chocolates', qty: 5, price: 10 },
          { sku: 'apples', qty: 10, price: 2.5 },
        ],
        status: 'A',
      },
      {
        _id: 9,
        cust_id: 'Don Quis',
        ord_date: new Date('2020-03-20'),
        price: 55,
        items: [
          { sku: 'carrots', qty: 5, price: 1.0 },
          { sku: 'apples', qty: 10, price: 2.5 },
          { sku: 'oranges', qty: 10, price: 2.5 },
        ],
        status: 'A',
      },
      {
        _id: 10,
        cust_id: 'Don Quis',
        ord_date: new Date('2020-03-23'),
        price: 25,
        items: [{ sku: 'oranges', qty: 10, price: 2.5 }],
        status: 'A',
      },
    ]);
    expect(res.acknowledged).to.equal(true);
  };

  before(async function () {
    serviceProvider = await NodeDriverServiceProvider.connect(
      await testServer.connectionString(),
      dummyOptions,
      {},
      new EventEmitter()
    );
  });

  after(function () {
    return serviceProvider.close(true);
  });

  let instanceState: ShellInstanceState;
  let shellApi: ShellApi;
  let mongo: Mongo;
  let dbName: string;
  let database: Database;
  let collection: Collection;
  let collectionName: string;

  beforeEach(async function () {
    dbName = `test-${Date.now()}`;
    collectionName = 'docs';

    instanceState = new ShellInstanceState(serviceProvider);
    shellApi = instanceState.shellApi;
    mongo = instanceState.currentDb.getMongo();
    database = mongo.getDB(dbName);
    collection = database.getCollection(collectionName);
    await database.dropDatabase();
  });

  afterEach(async function () {
    await serviceProvider.dropDatabase(dbName);
  });

  describe('commands', function () {
    describe('it', function () {
      beforeEach(async function () {
        const docs: Document[] = [];

        let i = 1;
        while (i <= 21) {
          docs.push({ doc: i });
          i++;
        }

        await serviceProvider.insertMany(dbName, collectionName, docs);
      });

      describe('when calling it after find', function () {
        it('returns next batch of docs', async function () {
          await collection.find({}, { _id: 0 });
          await shellApi.it();
          expect({ ...(await shellApi.it()) }).to.deep.equal({
            cursorHasMore: false,
            documents: [{ doc: 21 }],
          });
        });
      });

      describe('when calling limit after skip', function () {
        let cursor: Cursor;

        beforeEach(async function () {
          cursor = (await collection.find({}, { _id: 0 })).skip(1).limit(1);
        });

        describe('when calling toArray on the cursor', function () {
          it('returns the right documents', async function () {
            expect(await cursor.toArray()).to.deep.equal([{ doc: 2 }]);
          });
        });

        describe('when calling toShellResult on the cursor', function () {
          it('returns the right documents', async function () {
            const {
              printable: { documents },
            } = await toShellResult(cursor);
            expect(documents).to.have.property('constructor', Array);
            expect(documents).to.deep.equal([{ doc: 2 }]);
          });
        });
      });
    });
  });

  describe('collection', function () {
    describe('isCapped', function () {
      it('returns false for a plain collection', async function () {
        await collection.insertOne({});
        const ret = await collection.isCapped();
        expect(ret).to.equal(false);
      });
    });
    describe('bulkWrite', function () {
      context('with an insertOne request', function () {
        let requests: AnyBulkWriteOperation[];
        let result: Document;

        beforeEach(async function () {
          requests = [
            {
              insertOne: {
                document: {
                  doc: 1,
                },
              },
            },
          ];

          result = await collection.bulkWrite(requests);
        });

        it('returns acknowledged = true', function () {
          expect(result.acknowledged).to.be.true;
        });

        it('returns insertedCount = 1', function () {
          expect(result.insertedCount).to.equal(1);
        });

        it('returns insertedIds', function () {
          expect(Object.keys(result.insertedIds)).to.have.lengthOf(1);
        });

        it('performs insert', async function () {
          const docs = await serviceProvider
            .find(dbName, collectionName, {}, { projection: { _id: 0 } })
            .toArray();

          expect(docs).to.deep.equal([{ doc: 1 }]);
        });
      });
    });

    describe('insertOne', function () {
      it('does not overwrite users object', async function () {
        const d: Document = { name: 'test', zipcode: '12345' };
        await collection.insertOne(d);
        expect(d._id).to.equal(undefined);
      });
    });

    describe('insert', function () {
      context('inserting one document', function () {
        it('does not overwrite users object', async function () {
          const d: Document = { name: 'test', zipcode: '12345' };
          await collection.insert(d);
          expect(d._id).to.equal(undefined);
        });
      });

      context('inserting a list of documents', function () {
        it('does not overwrite users object', async function () {
          const d: Document[] = [
            { name: 'first', zipcode: '12345' },
            { name: 'second', zipcode: '12345' },
          ];
          await collection.insert(d);
          expect(d[0]._id).to.equal(undefined);
          expect(d[1]._id).to.equal(undefined);
        });
      });
    });

    describe('insertMany', function () {
      it('does not overwrite users object', async function () {
        const d: Document[] = [
          { name: 'first', zipcode: '12345' },
          { name: 'second', zipcode: '12345' },
        ];
        await collection.insert(d);
        expect(d[0]._id).to.equal(undefined);
        expect(d[1]._id).to.equal(undefined);
      });
    });

    describe('updateOne', function () {
      beforeEach(async function () {
        await serviceProvider.insertMany(dbName, collectionName, [
          { doc: 1 },
          { doc: 1 },
          { doc: 2 },
        ]);
      });

      context('without upsert', function () {
        let result: Document;

        beforeEach(async function () {
          result = await collection.updateOne({ doc: 1 }, { $inc: { x: 1 } });
        });

        it('updates only one existing document matching filter', async function () {
          const docs = await findAllWithoutId(dbName, collectionName);

          expect(docs).to.deep.equal([
            { doc: 1, x: 1 },
            { doc: 1 },
            { doc: 2 },
          ]);
        });

        it('returns update result correctly', function () {
          const {
            acknowledged,
            insertedId,
            matchedCount,
            modifiedCount,
            upsertedCount,
          } = result;

          expect({
            acknowledged,
            insertedId,
            matchedCount,
            modifiedCount,
            upsertedCount,
          }).to.deep.equal({
            acknowledged: true,
            insertedId: null,
            matchedCount: 1,
            modifiedCount: 1,
            upsertedCount: 0,
          });
        });
      });

      context('with upsert', function () {
        let result: Document;

        beforeEach(async function () {
          result = await collection.updateOne(
            { _id: 'new-doc' },
            { $set: { _id: 'new-doc', doc: 3 } },
            { upsert: true }
          );
        });

        it('inserts a document', async function () {
          const docs = await findAllWithoutId(dbName, collectionName);

          expect(docs).to.deep.equal([
            { doc: 1 },
            { doc: 1 },
            { doc: 2 },
            { doc: 3 },
          ]);
        });

        it('returns update result correctly', function () {
          const {
            acknowledged,
            insertedId,
            matchedCount,
            modifiedCount,
            upsertedCount,
          } = result;

          expect({
            acknowledged,
            insertedId,
            matchedCount,
            modifiedCount,
            upsertedCount,
          }).to.deep.equal({
            acknowledged: true,
            insertedId: 'new-doc',
            matchedCount: 0,
            modifiedCount: 0,
            upsertedCount: 1,
          });
        });
      });
    });

    describe('convertToCapped', function () {
      skipIfApiStrict();
      let result: Document;

      beforeEach(async function () {
        await serviceProvider.createCollection(dbName, collectionName);

        expect(await collection.isCapped()).to.be.false;

        result = await collection.convertToCapped(1000);
      });

      it('returns ok = 1', function () {
        expect(result.ok).to.equal(1);
      });

      it('converts the collection', async function () {
        expect(await collection.isCapped()).to.be.true;
      });
    });

    describe('createIndex', function () {
      let result: string;

      beforeEach(async function () {
        await serviceProvider.createCollection(dbName, collectionName);
        expect(await getIndexNames(dbName, collectionName)).not.to.contain(
          'index-1'
        );

        result = await collection.createIndex(
          { x: 1 },
          {
            name: 'index-1',
          }
        );
      });

      it('returns index name', function () {
        expect(result).to.equal('index-1');
      });

      it('creates the index', async function () {
        expect(await getIndexNames(dbName, collectionName)).to.contain(
          'index-1'
        );
      });
    });

    describe('createIndexes', function () {
      let result: Document;

      beforeEach(async function () {
        await serviceProvider.createCollection(dbName, collectionName);
        expect(await getIndexNames(dbName, collectionName)).not.to.contain(
          'index-1'
        );

        result = await collection.createIndexes([{ x: 1 }], {
          name: 'index-1',
        });
      });

      it('returns index name list', function () {
        expect(result).to.deep.equal(['index-1']);
      });

      it('creates the index', async function () {
        expect(await getIndexNames(dbName, collectionName)).to.contain(
          'index-1'
        );
      });
    });

    describe('createIndexes with multiple indexes', function () {
      let result: Document;

      beforeEach(async function () {
        await serviceProvider.createCollection(dbName, collectionName);
        expect(await getIndexNames(dbName, collectionName)).not.to.contain(
          'index-1'
        );

        result = await collection.createIndexes([{ x: 1 }, { y: 1 }]);
      });

      it('returns index name list', function () {
        expect(result).to.deep.equal(['x_1', 'y_1']);
      });

      it('creates the index', async function () {
        expect(await getIndexNames(dbName, collectionName)).to.contain('x_1');
        expect(await getIndexNames(dbName, collectionName)).to.contain('y_1');
      });
    });

    describe('getIndexes', function () {
      it('returns indexes for the collection', async function () {
        await serviceProvider.createCollection(dbName, collectionName);
        await serviceProvider.createIndexes(dbName, collectionName, [
          { key: { x: 1 } },
        ]);

        const indexes = await collection.getIndexes();

        expect(indexes.length).to.equal(2);
        expect(indexes[0]).to.deep.include({
          key: {
            _id: 1,
          },
          name: '_id_',
          v: 2,
        });
        expect(indexes[1]).to.deep.include({
          key: {
            x: 1,
          },
          name: 'x_1',
          v: 2,
        });
      });

      context('post-5.3', function () {
        skipIfServerVersion(testServer, '< 5.3');

        beforeEach(async function () {
          await serviceProvider.createCollection(dbName, collectionName, {
            clusteredIndex: {
              key: { _id: 1 },
              unique: true,
            },
          });
        });

        it('returns clustered indexes for the collection', async function () {
          const indexes = await collection.getIndexes();

          expect(indexes.length).to.equal(1);
          expect(indexes[0]).to.deep.include({
            key: {
              _id: 1,
            },
            name: '_id_',
            v: 2,
            clustered: true,
            unique: true,
          });
        });
      });
    });

    describe('dropIndexes', function () {
      beforeEach(async function () {
        await serviceProvider.createCollection(dbName, collectionName);
        await serviceProvider.createIndexes(dbName, collectionName, [
          { key: { x: 1 }, name: 'index-1' },
        ]);
      });

      it('removes indexes', async function () {
        expect(await getIndexNames(dbName, collectionName)).to.contain(
          'index-1'
        );

        await collection.dropIndexes('*');

        expect(await getIndexNames(dbName, collectionName)).not.to.contain(
          'index-1'
        );
      });

      it('removes all indexes by default', async function () {
        expect(await getIndexNames(dbName, collectionName)).to.contain(
          'index-1'
        );

        await collection.dropIndexes();

        expect(await getIndexNames(dbName, collectionName)).not.to.contain(
          'index-1'
        );
      });

      it('removes indexes with an array argument', async function () {
        expect(await getIndexNames(dbName, collectionName)).to.contain(
          'index-1'
        );

        await collection.dropIndexes(['index-1']);

        expect(await getIndexNames(dbName, collectionName)).not.to.contain(
          'index-1'
        );
      });
    });

    describe('#reIndex', function () {
      skipIfApiStrict();

      beforeEach(async function () {
        await serviceProvider.createCollection(dbName, collectionName);
      });

      it('runs against the db', async function () {
        const result = await collection.reIndex();

        expect(result).to.deep.include({
          nIndexesWas: 1,
          nIndexes: 1,
          ok: 1,
        });
        expect(result.indexes.length).to.equal(1);
        expect(result.indexes[0]).to.deep.include({
          v: 2,
          key: {
            _id: 1,
          },
          name: '_id_',
        });
      });
    });

    describe('#(un)hideIndex', function () {
      skipIfServerVersion(testServer, '< 4.4');

      beforeEach(async function () {
        await serviceProvider.createCollection(dbName, collectionName);
        await collection.insertOne({ a: 1 });
        await collection.createIndex({ a: 1 }, { name: 'a-1' });
      });

      for (const { description, index } of [
        { description: 'by name', index: 'a-1' },
        { description: 'by key pattern', index: { a: 1 } },
      ]) {
        it(`hides/unhides indexes ${description}`, async function () {
          const indexesBefore = await collection.getIndexes();
          expect(indexesBefore).to.have.lengthOf(2);
          expect(indexesBefore.find((ix) => ix.key.a)?.hidden).to.equal(
            undefined
          );

          const hideResult = await collection.hideIndex(index);
          expect(hideResult.hidden_old).to.equal(false);
          expect(hideResult.hidden_new).to.equal(true);

          const indexesWithHidden = await collection.getIndexes();
          expect(indexesWithHidden.find((ix) => ix.key.a)?.hidden).to.equal(
            true
          );

          const unhideResult = await collection.unhideIndex(index);
          expect(unhideResult.hidden_old).to.equal(true);
          expect(unhideResult.hidden_new).to.equal(false);

          const indexesAfter = await collection.getIndexes();
          expect(indexesAfter.find((ix) => ix.key.a)?.hidden).to.equal(
            undefined
          );
        });
      }
    });

    describe('totalIndexSize', function () {
      skipIfApiStrict();

      beforeEach(async function () {
        await serviceProvider.createCollection(dbName, collectionName);
      });

      it('returns total index size', async function () {
        expect(typeof (await collection.totalIndexSize())).to.equal('number');
      });
    });

    // TODO(MONGOSH-1465): integration tests for search indexes

    describe('dataSize', function () {
      skipIfApiStrict();

      beforeEach(async function () {
        await serviceProvider.createCollection(dbName, collectionName);
      });

      it('returns total index size', async function () {
        expect(typeof (await collection.dataSize())).to.equal('number');
      });
    });

    describe('storageSize', function () {
      skipIfApiStrict();

      beforeEach(async function () {
        await serviceProvider.createCollection(dbName, collectionName);
      });

      it('returns total index size', async function () {
        expect(typeof (await collection.storageSize())).to.equal('number');
      });
    });

    describe('totalSize', function () {
      skipIfApiStrict();

      beforeEach(async function () {
        await serviceProvider.createCollection(dbName, collectionName);
      });

      it('returns total index size', async function () {
        expect(typeof (await collection.totalSize())).to.equal('number');
      });
    });

    describe('stats', function () {
      skipIfApiStrict();

      context('with a default collection', function () {
        let hasTotalSize: boolean;

        beforeEach(async function () {
          await serviceProvider.createCollection(dbName, collectionName);
          await serviceProvider.insertOne(dbName, collectionName, { x: 1 });
          hasTotalSize = !/^4\.[0123]\./.exec(await database.version());
        });

        it('returns the expected stats', async function () {
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

        it('returns stats without indexDetails', async function () {
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
        it('returns stats with indexDetails', async function () {
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

      context('with a capped collection', function () {
        beforeEach(async function () {
          await serviceProvider.createCollection(dbName, collectionName, {
            capped: true,
            size: 8192,
            max: 5000,
          });
          await serviceProvider.insertOne(dbName, collectionName, { x: 1 });
        });

        it('returns the unscaled maxSize', async function () {
          const stats = await collection.stats();

          expect(stats.maxSize).to.equal(8192);
          expect(stats.max).to.equal(5000);
        });

        it('returns the scaled maxSize', async function () {
          const stats = await collection.stats({ scale: 1024 });

          expect(stats.capped).to.equal(true);
          expect(stats.timeseries).to.equal(undefined);
          expect(stats.shards).to.equal(undefined);
          expect(stats.count).to.equal(1);
          expect(stats.maxSize).to.equal(8);
          expect(stats.max).to.equal(5000);
        });
      });

      context('with a timeseries collection', function () {
        skipIfServerVersion(testServer, '< 5.0');

        beforeEach(async function () {
          await serviceProvider.createCollection(dbName, collectionName, {
            timeseries: {
              timeField: 'timestamp',
              metaField: 'metadata',
              granularity: 'hours',
            },
          });
          await serviceProvider.insertOne(dbName, collectionName, {
            timestamp: new Date(),
            metadata: {
              test: true,
            },
          });
        });

        it('returns the timeseries stats', async function () {
          const stats = await collection.stats({ scale: 1024 });

          // Timeseries bucket collection does not provide 'count' or 'avgObjSize'.
          expect(stats.count).to.equal(undefined);
          expect(stats.maxSize).to.equal(undefined);
          expect(stats.capped).to.equal(false);
          expect(stats.timeseries.bucketsNs).to.equal(
            `${dbName}.system.buckets.${collectionName}`
          );
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
            'numBucketsClosedDueToMemoryThreshold',
            'numCommits',
            'numWaits',
            'numMeasurementsCommitted',
            'avgNumMeasurementsPerCommit'
          );
        });
      });
    });

    describe('drop', function () {
      context('when a collection exists', function () {
        let result: boolean;
        beforeEach(async function () {
          await serviceProvider.createCollection(dbName, collectionName);
          result = await collection.drop();
        });

        it('returns true', function () {
          expect(result).to.be.true;
        });

        it('deletes the collection', async function () {
          await expectCollectionNotToExist(dbName, collectionName);
        });
      });

      context('when a collection does not exist', function () {
        context('pre-7.0', function () {
          skipIfServerVersion(testServer, '>= 7.0');
          it('returns false', async function () {
            expect(await collection.drop()).to.be.false;
          });
        });

        context('post-7.0', function () {
          skipIfServerVersion(testServer, '< 7.0');
          it('returns true', async function () {
            expect(await collection.drop()).to.be.true;
          });
        });
      });
    });

    describe('exists', function () {
      context('when a collection exists', function () {
        beforeEach(async function () {
          await serviceProvider.createCollection(dbName, collectionName);
        });

        it('returns the collection object', async function () {
          expect((await collection.exists()).name).to.equal(collectionName);
        });
      });

      context('when a collection does not exist', function () {
        it('returns null', async function () {
          expect(await collection.exists()).to.be.null;
        });
      });
    });

    describe('runCommand', function () {
      skipIfApiStrict();

      beforeEach(async function () {
        await serviceProvider.createCollection(dbName, collectionName);
      });

      it('runs a command with the collection as parameter and returns the result', async function () {
        expect(await collection.runCommand('collStats')).to.include({
          ok: 1,
          ns: `${dbName}.${collectionName}`,
        });
      });
    });

    describe('findAndModify', function () {
      beforeEach(async function () {
        await serviceProvider.insertMany(dbName, collectionName, [
          { doc: 1, foo: 1 },
          { doc: 2, foo: 1 },
        ]);
      });

      it('changes only a matching document', async function () {
        await collection.findAndModify({
          query: { doc: 1 },
          update: { foo: 'bar' },
        });

        expect(await findAllWithoutId(dbName, collectionName)).to.deep.equal([
          { foo: 'bar' },
          { doc: 2, foo: 1 },
        ]);
      });

      it('removes only a matching document', async function () {
        await collection.findAndModify({
          query: { doc: 1 },
          remove: true,
        });

        expect(await findAllWithoutId(dbName, collectionName)).to.deep.equal([
          { doc: 2, foo: 1 },
        ]);
      });

      it('changes the first matching document with sort', async function () {
        await collection.findAndModify({
          query: { foo: 1 },
          sort: { doc: -1 },
          update: { changed: true },
        });

        expect(await findAllWithoutId(dbName, collectionName)).to.deep.equal([
          { doc: 1, foo: 1 },
          { changed: true },
        ]);
      });

      it('returns the old document if new is not passed', async function () {
        expect(
          await collection.findAndModify({
            query: { doc: 1 },
            update: { changed: true },
          })
        ).to.deep.include({ doc: 1 });

        expect(
          await collection.findAndModify({ query: { doc: 2 }, remove: true })
        ).to.deep.include({ doc: 2 });
      });

      it('returns the new document if new is passed', async function () {
        expect(
          await collection.findAndModify({
            query: { doc: 1 },
            new: true,
            update: { changed: true },
          })
        ).to.deep.include({ changed: true });
      });

      it('allows upserts', async function () {
        await collection.findAndModify({
          query: { doc: 3 },
          new: true,
          update: { doc: 3 },
          upsert: true,
        });

        expect(await findAllWithoutId(dbName, collectionName)).to.deep.include({
          doc: 3,
        });
      });

      it('projects according to `fields`', async function () {
        const result = await collection.findAndModify({
          query: { doc: 4 },
          new: true,
          update: { doc: 4, asdf: true },
          upsert: true,
          fields: { asdf: 1, _id: 1 },
        });
        expect(Object.keys(result!)).to.deep.equal(['_id', 'asdf']);
        expect(result!._id.constructor.name).to.equal('ObjectId');
        expect(result!.asdf).to.equal(true);

        expect(await findAllWithoutId(dbName, collectionName)).to.deep.include({
          doc: 4,
          asdf: true,
        });
      });

      context('on server 4.2+', function () {
        skipIfServerVersion(testServer, '< 4.2');
        it('allows update pipelines', async function () {
          await collection.findAndModify({
            query: { doc: 1 },
            new: true,
            update: [{ $set: { foo: 'bar' } }],
          });

          expect(
            await findAllWithoutId(dbName, collectionName)
          ).to.deep.include({ doc: 1, foo: 'bar' });
        });
      });
    });

    describe('renameCollection', function () {
      skipIfApiStrict();

      context('without dropTarget', function () {
        beforeEach(async function () {
          await serviceProvider.insertOne(dbName, collectionName, { doc: 1 });
          await collection.renameCollection('newName');
        });

        it('renames a collection', async function () {
          await expectCollectionToExist(dbName, 'newName');
          await new Promise((resolve) => {
            setTimeout(resolve, 2000);
          });
          await expectCollectionNotToExist(dbName, collectionName);
        });

        it('does not drop documents', async function () {
          expect(await findAllWithoutId(dbName, 'newName')).to.deep.include({
            doc: 1,
          });
        });
      });

      context('with dropTarget = true', function () {
        beforeEach(async function () {
          await serviceProvider.insertOne(dbName, collectionName, { doc: 1 });
          await collection.renameCollection('newName', true);
        });

        it('renames a collection', async function () {
          await expectCollectionToExist(dbName, 'newName');
          await new Promise((resolve) => {
            setTimeout(resolve, 2000);
          });
          await expectCollectionNotToExist(dbName, collectionName);
        });

        it('drops documents', async function () {
          expect(await findAllWithoutId(dbName, 'newName')).to.deep.include({
            doc: 1,
          });
        });
      });
    });

    describe('aggregate', function () {
      it('runs an aggregate pipeline on the database', async function () {
        await serviceProvider.insertOne(dbName, collectionName, { x: 1 });

        const cursor = await collection.aggregate([
          {
            $count: 'count',
          },
        ]);

        expect(await cursor.toArray()).to.deep.equal([{ count: 1 }]);
      });

      it('accepts multiple stages as individual arguments', async function () {
        await serviceProvider.insertOne(dbName, collectionName, { x: 1 });

        const cursor = await collection.aggregate(
          { $match: { x: 0 } },
          { $count: 'count' }
        );

        expect(await cursor.toArray()).to.have.length(0);
      });

      it('runs the aggregation immediately if it is $merge/$out', async function () {
        const x = 123456789;
        await collection.insertOne({ x });

        await collection.aggregate({ $match: {} }, { $out: 'copy' }); // ignore the result

        expect((await database.getCollection('copy').findOne())?.x).to.equal(x);
      });

      [true, false, 'queryPlanner'].forEach((explain) => {
        it(`runs an explain with explain: ${explain}`, async function () {
          await serviceProvider.insertOne(dbName, collectionName, { x: 1 });

          const cursor = await collection.aggregate(
            [
              { $collStats: {} },
              {
                $count: 'count',
              },
            ],
            {
              explain,
            }
          );

          const result = await toShellResult(cursor);
          expect(result.printable).to.include.all.keys(['ok', 'stages']);
        });
      });
    });

    describe('find', function () {
      it('uses default options for the driver (find)', async function () {
        const longOne = new serviceProvider.bsonLibrary.Long('1');
        await serviceProvider.insertOne(dbName, collectionName, {
          longOne,
          _id: 0,
        });

        const cursor = await collection.find({});

        expect(await cursor.toArray()).to.deep.equal([{ longOne, _id: 0 }]);
      });

      it('passes through options to the driver (find)', async function () {
        const longOne = new serviceProvider.bsonLibrary.Long('1');
        await serviceProvider.insertOne(dbName, collectionName, {
          longOne,
          _id: 0,
        });

        const cursor = await collection.find({}, {}, { promoteLongs: true });

        expect(await cursor.toArray()).to.deep.equal([{ longOne: 1, _id: 0 }]);
      });

      it('uses default options for the driver (findOne)', async function () {
        const longOne = new serviceProvider.bsonLibrary.Long('1');
        await serviceProvider.insertOne(dbName, collectionName, {
          longOne,
          _id: 0,
        });

        const doc = await collection.findOne({});

        expect(doc).to.deep.equal({ longOne, _id: 0 });
      });

      it('passes through options to the driver (findOne)', async function () {
        const longOne = new serviceProvider.bsonLibrary.Long('1');
        await serviceProvider.insertOne(dbName, collectionName, {
          longOne,
          _id: 0,
        });

        const doc = await collection.findOne({}, {}, { promoteLongs: true });

        expect(doc).to.deep.equal({ longOne: 1, _id: 0 });
      });
    });

    describe('dots and dollars in field names', function () {
      skipIfServerVersion(testServer, '<= 4.4');
      if (process.env.MONGOSH_TEST_FORCE_API_STRICT) {
        // https://jira.mongodb.org/browse/SERVER-58076
        skipIfServerVersion(testServer, '<= 6.0');
      }
      it('can insert, modify and retrieve fields with $-prefixed .-containing names', async function () {
        await collection.insertOne({ '$x.y': 1, _id: '_id' });
        expect(await collection.findOne()).to.deep.equal({
          '$x.y': 1,
          _id: '_id',
        });
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
                  $literal: '$x.y',
                },
                value: 2,
                input: '$$ROOT',
              },
            },
          },
        ]);
        expect(await collection.findOne()).to.deep.equal({
          '$x.y': 2,
          _id: '_id',
        });
      });
    });

    describe('validate', function () {
      skipIfApiStrict();
      skipIfServerVersion(testServer, '< 5.0');

      beforeEach(async function () {
        await collection.insertOne({ foo: 'bar' });
      });

      it('validate can be used to validate a collection', async function () {
        expect((await collection.validate({ full: true })).valid).to.equal(
          true
        );
      });

      it('validate accepts a repair option', async function () {
        expect(
          (await collection.validate({ full: true, repair: true })).valid
        ).to.equal(true);
      });

      // We cannot positively test background: true since it may take a while for
      // the collection can be 'ready' to be validated on recent (7.3+) server versions,
      // but we can test that specific argument combinations will be rejected.
      it('validate fails with background: true and full: true', async function () {
        try {
          await collection.validate({ full: true, background: true });
          expect.fail('missed exception');
        } catch (err: any) {
          expect(err.name).to.equal('MongoServerError');
          expect(err.codeName).to.match(
            /^(CommandNotSupported|InvalidOptions)$/
          );
        }
      });
    });
  });

  describe('db', function () {
    describe('printShardingStatus', function () {
      it('fails for non-sharded dbs', async function () {
        try {
          await database.printShardingStatus();
        } catch (err: any) {
          expect(err.name).to.equal('MongoshInvalidInputError');
          return;
        }
        expect.fail('Missed exception');
      });
    });

    describe('getCollectionInfos', function () {
      it('returns an array with collection infos', async function () {
        await serviceProvider.createCollection(dbName, collectionName);

        expect(
          await database.getCollectionInfos({}, { nameOnly: true })
        ).to.deep.equal([
          {
            name: collectionName,
            type: 'collection',
          },
        ]);
      });
    });

    describe('getCollectionNames', function () {
      it('returns an array with collection names', async function () {
        await serviceProvider.createCollection(dbName, collectionName);

        expect(await database.getCollectionNames()).to.deep.equal([
          collectionName,
        ]);
      });
    });

    describe('adminCommand', function () {
      skipIfApiStrict();

      it('runs an adminCommand', async function () {
        const result = await database.adminCommand({ serverStatus: 1 });
        expect(result.ok).to.equal(1);
        expect(result.process).to.match(/mongo/);
      });
    });

    describe('aggregate', function () {
      skipIfApiStrict();

      it('runs an aggregate pipeline on the database', async function () {
        const cursor = await database.aggregate([
          {
            $listLocalSessions: {},
          },
        ]);

        expect((await (cursor as any).toArray())[0]).to.have.keys(
          '_id',
          'lastUse'
        );
      });
    });

    describe('dropDatabase', function () {
      let otherDbName: string;
      beforeEach(function () {
        otherDbName = `${dbName}-2`;
      });

      afterEach(async function () {
        await serviceProvider.dropDatabase(otherDbName);
      });

      const listDatabases = async (): Promise<string[]> => {
        const { databases } = await serviceProvider.listDatabases('admin');
        return databases.map((db: { name: string }) => db.name);
      };

      it('drops only the target database', async function () {
        await serviceProvider.createCollection(dbName, collectionName);
        await serviceProvider.createCollection(otherDbName, collectionName);

        expect(await listDatabases()).to.contain(dbName);

        await database.dropDatabase();

        expect(await listDatabases()).not.to.contain(dbName);

        expect(await listDatabases()).to.contain(otherDbName);
      });

      it('returns the drop database result', async function () {
        expect(await database.dropDatabase()).to.deep.equal({
          dropped: dbName,
          ok: 1,
        });
      });
    });

    describe('createCollection', function () {
      skipIfApiStrict();

      it('creates a collection without options', async function () {
        await database.createCollection('newcoll');
        const stats = (
          await serviceProvider
            .aggregate(dbName, 'newcoll', [
              { $collStats: { storageStats: {} } },
            ])
            .toArray()
        )[0];
        expect(stats.storageStats.nindexes).to.equal(1);
      });

      it('creates a collection with options', async function () {
        await database.createCollection('newcoll', {
          capped: true,
          size: 1024,
          max: 5000,
        });
        const stats = (
          await serviceProvider
            .aggregate(dbName, 'newcoll', [
              { $collStats: { storageStats: {} } },
            ])
            .toArray()
        )[0];
        expect(stats.storageStats.nindexes).to.equal(1);
        expect(stats.storageStats.capped).to.equal(true);
        expect(stats.storageStats.maxSize).to.equal(1024);
        expect(stats.storageStats.max).to.equal(5000);
      });
    });
    describe('createView', function () {
      it('creates a view without options', async function () {
        expect(
          await database.createView('view', 'source', [{ $match: { x: 1 } }])
        ).to.deep.equal({ ok: 1 });
        const views = await serviceProvider
          .find(dbName, 'system.views', {})
          .toArray();
        expect(views).to.deep.equal([
          {
            _id: `${dbName}.view`,
            viewOn: 'source',
            pipeline: [{ $match: { x: 1 } }],
          },
        ]);
      });
      it('creates a view with options', async function () {
        expect(
          await database.createView('view', 'source', [{ $match: { x: 1 } }], {
            collation: { locale: 'simple' },
          })
        ).to.deep.equal({ ok: 1 });
        const views = await serviceProvider
          .find(dbName, 'system.views', {})
          .toArray();
        expect(views).to.deep.equal([
          {
            _id: `${dbName}.view`,
            viewOn: 'source',
            pipeline: [{ $match: { x: 1 } }],
          },
        ]);
      });
      context('features only available on mongodb 4.4+', function () {
        skipIfServerVersion(testServer, '< 4.4');
        it('creates a view that potentially contains JS functions in its pipeline', async function () {
          const pipeline = (body: any) => [
            {
              $set: {
                name_md5: {
                  $function: { lang: 'js', args: ['$name'], body: body },
                },
              },
            },
          ];
          const fn = compileExpr`function (val) {
            return hex_md5(val);
          }`;
          expect(
            await database.createView('view', 'source', pipeline(fn))
          ).to.deep.equal({ ok: 1 });
          const views = await serviceProvider
            .find(dbName, 'system.views', {})
            .toArray();
          expect(JSON.parse(JSON.stringify(views))).to.deep.equal([
            {
              _id: `${dbName}.view`,
              viewOn: 'source',
              pipeline: pipeline({ code: fn.toString() }),
            },
          ]);
        });
      });
    });

    describe('listCommands', function () {
      skipIfApiStrict();

      it('includes an entry for ping', async function () {
        const { ping } = (await database.listCommands()).value as any;
        expect(ping.help).to.be.a('string');
        expect(ping.adminOnly).to.be.a('boolean');
        expect(ping.secondaryOk).to.be.a('boolean');
      });
    });
  });

  describe('explainable', function () {
    let explainable: Explainable;

    beforeEach(function () {
      explainable = new Explainable(mongo, collection, 'queryPlanner');
    });

    describe('find', function () {
      it('returns a cursor that has the explain as result of toShellResult', async function () {
        const cursor = (await explainable.find()).skip(1).limit(1);
        const result = await toShellResult(cursor);
        expect(result.printable).to.include.all.keys([
          'ok',
          'queryPlanner',
          'serverInfo',
        ]);
      });

      describe('after server 4.4', function () {
        skipIfServerVersion(testServer, '<= 4.4');
        it('the explainable cursor reflects collation', async function () {
          const cursor = await explainable.find({}, undefined, {
            collation: { locale: 'simple' },
          });
          const result = await toShellResult(cursor);
          expect(result.printable.command.collation.locale).to.be.equal(
            'simple'
          );
        });
      });
    });

    describe('aggregate', function () {
      const stages = [{ $match: {} }, { $skip: 1 }, { $limit: 1 }];

      // we run the tests giving the stages either as a list of args or as an array
      [stages, [stages]].forEach((args) => {
        context(
          `with stages as ${
            args.length === 1 ? 'pipeline array' : 'individual args'
          }`,
          function () {
            describe('server before 4.2.2', function () {
              skipIfServerVersion(testServer, '>= 4.2.2');
              it('returns a cursor that has the explain as result of toShellResult', async function () {
                const cursor = await collection.explain().aggregate(...args);
                const result = await toShellResult(cursor);
                expect(result.printable).to.include.all.keys(['ok', 'stages']);
                expect(result.printable.stages[0].$cursor).to.include.all.keys([
                  'queryPlanner',
                ]);
                expect(
                  result.printable.stages[0].$cursor
                ).to.not.include.any.keys(['executionStats']);
              });

              it('includes executionStats when requested', async function () {
                const cursor = await collection
                  .explain('executionStats')
                  .aggregate(...args);
                const result = await toShellResult(cursor);
                expect(result.printable).to.include.all.keys(['ok', 'stages']);
                expect(result.printable.stages[0].$cursor).to.include.all.keys([
                  'queryPlanner',
                  'executionStats',
                ]);
              });
            });

            describe('server from 4.2.2 till 4.4', function () {
              skipIfServerVersion(testServer, '< 4.2.2');
              skipIfServerVersion(testServer, '>= 4.5');
              it('returns a cursor that has the explain as result of toShellResult', async function () {
                const cursor = await collection.explain().aggregate(...args);
                const result = await toShellResult(cursor);
                expect(result.printable).to.include.all.keys([
                  'ok',
                  'stages',
                  'serverInfo',
                ]);
                expect(result.printable.stages[0].$cursor).to.include.all.keys([
                  'queryPlanner',
                ]);
                expect(
                  result.printable.stages[0].$cursor
                ).to.not.include.any.keys(['executionStats']);
              });

              it('includes executionStats when requested', async function () {
                const cursor = await collection
                  .explain('executionStats')
                  .aggregate(...args);
                const result = await toShellResult(cursor);
                expect(result.printable).to.include.all.keys([
                  'ok',
                  'stages',
                  'serverInfo',
                ]);
                expect(result.printable.stages[0].$cursor).to.include.all.keys([
                  'queryPlanner',
                  'executionStats',
                ]);
              });
            });

            describe('after server 4.4', function () {
              skipIfServerVersion(testServer, '<= 4.4');
              it('returns a cursor that has the explain as result of toShellResult', async function () {
                const cursor = await collection.explain().aggregate(...args);
                const result = await toShellResult(cursor);
                expect(result.printable).to.include.all.keys([
                  'ok',
                  'serverInfo',
                  'queryPlanner',
                ]);
                expect(result.printable).to.not.include.any.keys([
                  'executionStats',
                ]);
              });

              it('includes executionStats when requested', async function () {
                const cursor = await collection
                  .explain('executionStats')
                  .aggregate(...args);
                const result = await toShellResult(cursor);
                expect(result.printable).to.include.all.keys([
                  'ok',
                  'serverInfo',
                  'queryPlanner',
                  'executionStats',
                ]);
              });
            });
          }
        );
      });
    });

    describe('count', function () {
      it('provides explain information', async function () {
        const explained = await collection.explain().count();
        expect(explained).to.include.all.keys([
          'ok',
          'serverInfo',
          'queryPlanner',
        ]);
        expect(explained).to.not.include.any.keys(['executionStats']);
        expect(explained.queryPlanner.namespace).to.equal(
          `${dbName}.${collectionName}`
        );
      });

      it('includes executionStats when requested', async function () {
        const explained = await collection.explain('executionStats').count();
        expect(explained).to.include.all.keys([
          'ok',
          'serverInfo',
          'queryPlanner',
          'executionStats',
        ]);
      });
    });

    describe('distinct', function () {
      it('provides explain information', async function () {
        const explained = await collection.explain().distinct('_id');
        expect(explained).to.include.all.keys([
          'ok',
          'serverInfo',
          'queryPlanner',
        ]);
        expect(explained).to.not.include.any.keys(['executionStats']);
      });

      it('includes executionStats when requested', async function () {
        const explained = await collection
          .explain('executionStats')
          .distinct('_id');
        expect(explained).to.include.all.keys([
          'ok',
          'serverInfo',
          'queryPlanner',
          'executionStats',
        ]);
      });
    });

    describe('findAndModify', function () {
      it('provides explain information', async function () {
        await collection.insertOne({});
        const explained = await collection
          .explain()
          .findAndModify({ query: {}, update: {} });
        expect(explained).to.include.all.keys([
          'ok',
          'serverInfo',
          'queryPlanner',
        ]);
        expect(explained).to.not.include.any.keys(['executionStats']);
      });

      it('includes executionStats when requested', async function () {
        await collection.insertOne({});
        const explained = await collection
          .explain('executionStats')
          .findAndModify({ query: {}, update: {} });
        expect(explained).to.include.all.keys([
          'ok',
          'serverInfo',
          'queryPlanner',
          'executionStats',
        ]);
      });
    });

    describe('findOneAndDelete', function () {
      it('provides explain information', async function () {
        await collection.insertOne({});
        const explained = await collection.explain().findOneAndDelete({});
        expect(explained).to.include.all.keys([
          'ok',
          'serverInfo',
          'queryPlanner',
        ]);
        expect(explained).to.not.include.any.keys(['executionStats']);
      });

      it('includes executionStats when requested', async function () {
        await collection.insertOne({});
        const explained = await collection
          .explain('executionStats')
          .findOneAndDelete({});
        expect(explained).to.include.all.keys([
          'ok',
          'serverInfo',
          'queryPlanner',
          'executionStats',
        ]);
      });
    });

    describe('findOneAndReplace', function () {
      it('provides explain information', async function () {
        await collection.insertOne({});
        const explained = await collection.explain().findOneAndReplace({}, {});
        expect(explained).to.include.all.keys([
          'ok',
          'serverInfo',
          'queryPlanner',
        ]);
        expect(explained).to.not.include.any.keys(['executionStats']);
      });

      it('includes executionStats when requested', async function () {
        await collection.insertOne({});
        const explained = await collection
          .explain('executionStats')
          .findOneAndReplace({}, {});
        expect(explained).to.include.all.keys([
          'ok',
          'serverInfo',
          'queryPlanner',
          'executionStats',
        ]);
      });
    });

    describe('findOneAndUpdate', function () {
      it('provides explain information', async function () {
        await collection.insertOne({});
        const explained = await collection
          .explain()
          .findOneAndUpdate({}, { $set: { a: 1 } });
        expect(explained).to.include.all.keys([
          'ok',
          'serverInfo',
          'queryPlanner',
        ]);
        expect(explained).to.not.include.any.keys(['executionStats']);
      });

      it('includes executionStats when requested', async function () {
        await collection.insertOne({});
        const explained = await collection
          .explain('executionStats')
          .findOneAndUpdate({}, { $set: { a: 1 } });
        expect(explained).to.include.all.keys([
          'ok',
          'serverInfo',
          'queryPlanner',
          'executionStats',
        ]);
      });
    });

    describe('remove', function () {
      it('provides explain information', async function () {
        const explained = await collection.explain().remove({ notfound: 1 });
        expect(explained).to.include.all.keys([
          'ok',
          'serverInfo',
          'queryPlanner',
        ]);
        expect(explained).to.not.include.any.keys(['executionStats']);
      });

      it('includes executionStats when requested', async function () {
        const explained = await collection
          .explain('executionStats')
          .remove({ notfound: 1 });
        expect(explained).to.include.all.keys([
          'ok',
          'serverInfo',
          'queryPlanner',
          'executionStats',
        ]);
      });
    });

    describe('update', function () {
      it('provides explain information', async function () {
        const explained = await collection
          .explain()
          .update({ notfound: 1 }, { $unset: { laksjdhkgh: '' } });
        expect(explained).to.include.all.keys([
          'ok',
          'serverInfo',
          'queryPlanner',
        ]);
        expect(explained).to.not.include.any.keys(['executionStats']);
      });

      it('includes executionStats when requested', async function () {
        const explained = await collection
          .explain('executionStats')
          .update({ notfound: 1 }, { $unset: { laksjdhkgh: '' } });
        expect(explained).to.include.all.keys([
          'ok',
          'serverInfo',
          'queryPlanner',
          'executionStats',
        ]);
      });
    });

    describe('mapReduce', function () {
      skipIfServerVersion(testServer, '< 4.4');

      let mapFn: () => void;
      let reduceFn: (a: string, b: string[]) => string;
      beforeEach(async function () {
        await loadMRExample(collection);
        mapFn = compileExpr`function() {
          emit(this.cust_id, this.price);
        }`;
        reduceFn = compileExpr`function(keyCustId, valuesPrices) {
          return valuesPrices.reduce((s, t) => s + t);
        }`;
      });
      it('provides explain information', async function () {
        const explained = await collection
          .explain()
          .mapReduce(mapFn, reduceFn, 'map_reduce_example');
        expect(explained).to.include.all.keys(['ok', 'serverInfo', 'stages']);
        expect(explained.stages[0].$cursor).to.include.all.keys([
          'queryPlanner',
        ]);
      });

      it('includes executionStats when requested', async function () {
        const explained = await collection
          .explain('executionStats')
          .mapReduce(mapFn, reduceFn, 'map_reduce_example');
        expect(explained).to.include.all.keys(['ok', 'serverInfo', 'stages']);
        expect(explained.stages[0].$cursor).to.include.all.keys([
          'queryPlanner',
          'executionStats',
        ]);
      });
    });

    describe('invalid verbosity', function () {
      it('rejects with a server error', async function () {
        try {
          await (await collection.find()).explain('foo');
          expect.fail('missed exception');
        } catch (err: any) {
          expect(err.name).to.equal('MongoServerError');
        }
      });
    });
  });

  describe('Bulk API', function () {
    let bulk: Bulk;
    const size = 100;
    for (const m of [
      'initializeUnorderedBulkOp',
      'initializeOrderedBulkOp',
    ] as const) {
      describe(m, function () {
        describe('insert', function () {
          beforeEach(async function () {
            bulk = await collection[m]();
            for (let i = 0; i < size; i++) {
              bulk.insert({ x: i });
            }
            expect(await collection.countDocuments()).to.equal(0);
            await bulk.execute();
          });
          it('toJSON returns correctly', function () {
            expect(bulk.toJSON()).to.deep.equal({
              nInsertOps: size,
              nUpdateOps: 0,
              nRemoveOps: 0,
              nBatches: 1,
            });
          });
          it('executes', async function () {
            expect(await collection.countDocuments()).to.equal(size);
          });
          it('getOperations returns correctly', function () {
            const ops = bulk.getOperations();
            expect(ops.length).to.equal(1);
            const op = ops[0];
            expect(op.originalZeroIndex).to.equal(0);
            expect(op.batchType).to.equal(1);
            expect(op.operations.length).to.equal(size);
            expect(op.operations[99].x).to.equal(99);
          });
        });
        describe('remove', function () {
          beforeEach(async function () {
            bulk = await collection[m]();
            for (let i = 0; i < size; i++) {
              await collection.insertOne({ x: i });
            }
            expect(await collection.countDocuments()).to.equal(size);
            bulk.find({ x: { $mod: [2, 0] } }).remove();
            await bulk.execute();
          });
          it('toJSON returns correctly', function () {
            expect(bulk.toJSON()).to.deep.equal({
              nInsertOps: 0,
              nUpdateOps: 0,
              nRemoveOps: 1,
              nBatches: 1,
            });
          });
          it('executes', async function () {
            expect(await collection.countDocuments()).to.equal(size / 2);
          });
          it('getOperations returns correctly', function () {
            const ops = bulk.getOperations();
            expect(ops.length).to.equal(1);
            const op = ops[0];
            expect(op.originalZeroIndex).to.equal(0);
            expect(op.batchType).to.equal(3);
            expect(op.operations.length).to.equal(1);
          });
        });
        describe('removeOne', function () {
          beforeEach(async function () {
            bulk = await collection[m]();
            for (let i = 0; i < size; i++) {
              await collection.insertOne({ x: i });
            }
            expect(await collection.countDocuments()).to.equal(size);
            bulk.find({ x: { $mod: [2, 0] } }).removeOne();
            await bulk.execute();
          });
          it('toJSON returns correctly', function () {
            expect(bulk.toJSON()).to.deep.equal({
              nInsertOps: 0,
              nUpdateOps: 0,
              nRemoveOps: 1,
              nBatches: 1,
            });
          });
          it('executes', async function () {
            expect(await collection.countDocuments()).to.equal(size - 1);
          });
          it('getOperations returns correctly', function () {
            const ops = bulk.getOperations();
            expect(ops.length).to.equal(1);
            const op = ops[0];
            expect(op.originalZeroIndex).to.equal(0);
            expect(op.batchType).to.equal(3);
            expect(op.operations.length).to.equal(1);
          });
        });
        describe('replaceOne', function () {
          beforeEach(async function () {
            bulk = await collection[m]();
            for (let i = 0; i < size; i++) {
              await collection.insertOne({ x: i });
            }
            expect(await collection.countDocuments()).to.equal(size);
            bulk.find({ x: 2 }).replaceOne({ x: 1 });
            await bulk.execute();
          });
          it('toJSON returns correctly', function () {
            expect(bulk.toJSON()).to.deep.equal({
              nInsertOps: 0,
              nUpdateOps: 1,
              nRemoveOps: 0,
              nBatches: 1,
            });
          });
          it('executes', async function () {
            expect(await collection.countDocuments({ x: 1 })).to.equal(2);
            expect(await collection.countDocuments({ x: 2 })).to.equal(0);
            expect(await collection.countDocuments()).to.equal(size);
          });
          it('getOperations returns correctly', function () {
            const ops = bulk.getOperations();
            expect(ops.length).to.equal(1);
            const op = ops[0];
            expect(op.originalZeroIndex).to.equal(0);
            expect(op.batchType).to.equal(2);
            expect(op.operations.length).to.equal(1);
          });
        });
        describe('updateOne', function () {
          beforeEach(async function () {
            bulk = await collection[m]();
            for (let i = 0; i < size; i++) {
              await collection.insertOne({ x: i });
            }
            expect(await collection.countDocuments()).to.equal(size);
            bulk.find({ x: 2 }).updateOne({ $inc: { x: -1 } });
            await bulk.execute();
          });
          it('toJSON returns correctly', function () {
            expect(bulk.toJSON()).to.deep.equal({
              nInsertOps: 0,
              nUpdateOps: 1,
              nRemoveOps: 0,
              nBatches: 1,
            });
          });
          it('executes', async function () {
            expect(await collection.countDocuments({ x: 1 })).to.equal(2);
            expect(await collection.countDocuments({ x: 2 })).to.equal(0);
            expect(await collection.countDocuments()).to.equal(size);
          });
          it('getOperations returns correctly', function () {
            const ops = bulk.getOperations();
            expect(ops.length).to.equal(1);
            const op = ops[0];
            expect(op.originalZeroIndex).to.equal(0);
            expect(op.batchType).to.equal(2);
            expect(op.operations.length).to.equal(1);
          });
        });
        describe('update', function () {
          beforeEach(async function () {
            bulk = await collection[m]();
            for (let i = 0; i < size; i++) {
              await collection.insertOne({ x: i });
            }
            expect(await collection.countDocuments()).to.equal(size);
            bulk.find({ x: { $mod: [2, 0] } }).update({ $inc: { x: 1 } });
            await bulk.execute();
          });
          it('toJSON returns correctly', function () {
            expect(bulk.toJSON()).to.deep.equal({
              nInsertOps: 0,
              nUpdateOps: 1,
              nRemoveOps: 0,
              nBatches: 1,
            });
          });
          it('executes', async function () {
            expect(await collection.countDocuments()).to.equal(size);
            expect(
              await collection.countDocuments({ x: { $mod: [2, 0] } })
            ).to.equal(0);
          });
          it('getOperations returns correctly', function () {
            const ops = bulk.getOperations();
            expect(ops.length).to.equal(1);
            const op = ops[0];
            expect(op.originalZeroIndex).to.equal(0);
            expect(op.batchType).to.equal(2);
            expect(op.operations.length).to.equal(1);
          });
        });
        describe('upsert().update', function () {
          beforeEach(async function () {
            bulk = await collection[m]();
            for (let i = 0; i < size; i++) {
              await collection.insertOne({ x: i });
            }
            expect(await collection.countDocuments()).to.equal(size);
            expect(
              await collection.countDocuments({ y: { $exists: true } })
            ).to.equal(0);
            bulk
              .find({ y: 0 })
              .upsert()
              .update({ $set: { y: 1 } });
            await bulk.execute();
          });
          afterEach(async function () {
            await collection.drop();
          });
          it('toJSON returns correctly', function () {
            expect(bulk.toJSON()).to.deep.equal({
              nInsertOps: 0,
              nUpdateOps: 1,
              nRemoveOps: 0,
              nBatches: 1,
            });
          });
          it('executes', async function () {
            expect(await collection.countDocuments()).to.equal(size + 1);
            expect(
              await collection.countDocuments({ y: { $exists: true } })
            ).to.equal(1);
          });
          it('getOperations returns correctly', function () {
            const ops = bulk.getOperations();
            expect(ops.length).to.equal(1);
            const op = ops[0];
            expect(op.originalZeroIndex).to.equal(0);
            expect(op.batchType).to.equal(2);
            expect(op.operations.length).to.equal(1);
          });
        });
        describe('upsert().updateOne', function () {
          beforeEach(async function () {
            bulk = await collection[m]();
            for (let i = 0; i < size; i++) {
              await collection.insertOne({ x: i });
            }
            expect(await collection.countDocuments()).to.equal(size);
            expect(
              await collection.countDocuments({ y: { $exists: true } })
            ).to.equal(0);
            bulk
              .find({ y: 0 })
              .upsert()
              .updateOne({ $set: { y: 1 } });
            await bulk.execute();
          });
          it('toJSON returns correctly', function () {
            expect(bulk.toJSON()).to.deep.equal({
              nInsertOps: 0,
              nUpdateOps: 1,
              nRemoveOps: 0,
              nBatches: 1,
            });
          });
          it('executes', async function () {
            expect(await collection.countDocuments()).to.equal(size + 1);
            expect(
              await collection.countDocuments({ y: { $exists: true } })
            ).to.equal(1);
          });
          it('getOperations returns correctly', function () {
            const ops = bulk.getOperations();
            expect(ops.length).to.equal(1);
            const op = ops[0];
            expect(op.originalZeroIndex).to.equal(0);
            expect(op.batchType).to.equal(2);
            expect(op.operations.length).to.equal(1);
          });
        });
        describe('update without upsert', function () {
          beforeEach(async function () {
            bulk = await collection[m]();
            for (let i = 0; i < size; i++) {
              await collection.insertOne({ x: i });
            }
            expect(await collection.countDocuments()).to.equal(size);
            expect(
              await collection.countDocuments({ y: { $exists: true } })
            ).to.equal(0);
            bulk.find({ y: 0 }).update({ $set: { y: 1 } });
            await bulk.execute();
          });
          it('executes', async function () {
            expect(await collection.countDocuments()).to.equal(size);
            expect(
              await collection.countDocuments({ y: { $exists: true } })
            ).to.equal(0);
          });
        });
        describe('multiple batches', function () {
          beforeEach(async function () {
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
          it('updates count depending on ordered or not', function () {
            expect(bulk.toJSON().nBatches).to.equal(
              m === 'initializeUnorderedBulkOp' ? 3 : 4
            );
          });
        });
        describe('collation', function () {
          it('respects collation settings', async function () {
            await collection.insertOne({ name: 'cafe', customers: 10 });
            const bulk = await collection[m]();
            await bulk
              .find({ name: 'café' })
              .collation({ locale: 'fr', strength: 1 })
              .update({ $set: { customers: 20 } })
              .execute();
            expect(
              await (
                await collection.find({ name: 'cafe' }, { _id: 0 })
              ).toArray()
            ).to.deep.equal([
              {
                name: 'cafe',
                customers: 20,
              },
            ]);
          });
        });
        describe('arrayFilters().update', function () {
          beforeEach(async function () {
            bulk = await collection[m]();
            for (let i = 0; i < 10; i++) {
              await collection.insertOne({ x: i, arr: [1, -1] });
            }
            expect(
              await collection.countDocuments({ x: { $exists: true } })
            ).to.equal(10);
            bulk
              .find({ x: { $exists: true } })
              .arrayFilters([{ element: { $gte: 0 } }])
              .update({ $set: { 'arr.$[element]': -1 } });
            await bulk.execute();
          });
          afterEach(async function () {
            await collection.drop();
          });
          it('toJSON returns correctly', function () {
            expect(bulk.toJSON()).to.deep.equal({
              nInsertOps: 0,
              nUpdateOps: 1,
              nRemoveOps: 0,
              nBatches: 1,
            });
          });
          it('executes', async function () {
            expect(await collection.countDocuments()).to.equal(10);
            expect(await collection.countDocuments({ arr: [-1, -1] })).to.equal(
              10
            );
            expect(await collection.countDocuments({ arr: [1, -1] })).to.equal(
              0
            );
          });
          it('getOperations returns correctly', function () {
            const ops = bulk.getOperations();
            expect(ops.length).to.equal(1);
            const op = ops[0];
            expect(op.originalZeroIndex).to.equal(0);
            expect(op.batchType).to.equal(2);
            expect(op.operations.length).to.equal(1);
          });
        });
        context('with >= 4.2 server', function () {
          skipIfServerVersion(testServer, '< 4.2');
          describe('update() with pipeline update', function () {
            beforeEach(async function () {
              bulk = await collection[m]();
              for (let i = 0; i < size; i++) {
                await collection.insertOne({ x: i });
              }
              expect(await collection.countDocuments()).to.equal(size);
              expect(
                await collection.countDocuments({ y: { $exists: true } })
              ).to.equal(0);
              bulk
                .find({ y: 0 })
                .upsert()
                .update([{ $set: { y: 1 } }]);
              await bulk.execute();
            });
            afterEach(async function () {
              await collection.drop();
            });
            it('toJSON returns correctly', function () {
              expect(bulk.toJSON()).to.deep.equal({
                nInsertOps: 0,
                nUpdateOps: 1,
                nRemoveOps: 0,
                nBatches: 1,
              });
            });
            it('executes', async function () {
              expect(await collection.countDocuments()).to.equal(size + 1);
              expect(
                await collection.countDocuments({ y: { $exists: true } })
              ).to.equal(1);
            });
            it('getOperations returns correctly', function () {
              const ops = bulk.getOperations();
              expect(ops.length).to.equal(1);
              const op = ops[0];
              expect(op.originalZeroIndex).to.equal(0);
              expect(op.batchType).to.equal(2);
              expect(op.operations.length).to.equal(1);
            });
          });
          describe('updateOne() with pipeline update', function () {
            beforeEach(async function () {
              bulk = await collection[m]();
              for (let i = 0; i < size; i++) {
                await collection.insertOne({ x: i });
              }
              expect(await collection.countDocuments()).to.equal(size);
              expect(
                await collection.countDocuments({ y: { $exists: true } })
              ).to.equal(0);
              bulk
                .find({ y: 0 })
                .upsert()
                .updateOne([{ $set: { y: 1 } }]);
              await bulk.execute();
            });
            it('toJSON returns correctly', function () {
              expect(bulk.toJSON()).to.deep.equal({
                nInsertOps: 0,
                nUpdateOps: 1,
                nRemoveOps: 0,
                nBatches: 1,
              });
            });
            it('executes', async function () {
              expect(await collection.countDocuments()).to.equal(size + 1);
              expect(
                await collection.countDocuments({ y: { $exists: true } })
              ).to.equal(1);
            });
            it('getOperations returns correctly', function () {
              const ops = bulk.getOperations();
              expect(ops.length).to.equal(1);
              const op = ops[0];
              expect(op.originalZeroIndex).to.equal(0);
              expect(op.batchType).to.equal(2);
              expect(op.operations.length).to.equal(1);
            });
          });
        });
        describe('error states', function () {
          it('cannot be executed twice', async function () {
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
          it('getOperations fails before execute', async function () {
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
          it('No ops', async function () {
            bulk = await collection[m]();
            try {
              await bulk.execute();
            } catch (err: any) {
              expect(err.name).to.include('Error');
              return;
            }
            expect.fail('Error not thrown');
          });
          it('Driver error', async function () {
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
    }
  });

  describe('mongo', function () {
    describe('setReadConcern', function () {
      it('reconnects', async function () {
        const oldMC = serviceProvider.mongoClient;
        expect(mongo.getReadConcern()).to.equal(undefined);
        await mongo.setReadConcern('local');
        expect(mongo.getReadConcern()).to.equal('local');
        expect(serviceProvider.mongoClient).to.not.equal(oldMC);
      });
    });
    describe('setReadPref', function () {
      it('reconnects', async function () {
        const oldMC = serviceProvider.mongoClient;
        expect(
          (serviceProvider.mongoClient as any).s.options.readPreference.mode
        ).to.deep.equal('primary');
        await mongo.setReadPref('secondaryPreferred');
        expect(
          (serviceProvider.mongoClient as any).s.options.readPreference.mode
        ).to.equal('secondaryPreferred');
        expect(serviceProvider.mongoClient).to.not.equal(oldMC);
      });
    });
    describe('setWriteConcern', function () {
      it('reconnects', async function () {
        const oldMC = serviceProvider.mongoClient;
        expect(mongo.getWriteConcern()).to.equal(undefined);
        await mongo.setWriteConcern('majority', 200);
        expect(mongo.getWriteConcern()).to.deep.equal({
          w: 'majority',
          wtimeout: 200,
          wtimeoutMS: 200,
        });
        expect(serviceProvider.mongoClient).to.not.equal(oldMC);
      });
    });
    describe('close', function () {
      it('removes the connection from the set of connections', async function () {
        const newMongo = await shellApi.Mongo(mongo._uri);
        expect(instanceState.mongos).to.deep.equal([mongo, newMongo]);
        await newMongo.close();
        expect(instanceState.mongos).to.deep.equal([mongo]);
      });
    });
    describe('getDBs', function () {
      it('lists all databases', async function () {
        const result = await mongo.getDBs();
        expect(result.ok).to.equal(1);
        const admin = result.databases.find((db) => db.name === 'admin');
        // The 5.0+ server responds with a Long.
        expect(
          typeof admin?.sizeOnDisk === 'number' ||
            admin?.sizeOnDisk.constructor.name === 'Long'
        ).to.equal(true);
      });
    });
    describe('getDBNames', function () {
      it('lists all database names', async function () {
        expect(await mongo.getDBNames()).to.include('admin');
      });
    });
    describe('connect with --tls but not tls=...', function () {
      beforeEach(function () {
        (serviceProvider as any).getRawClient = () => {
          return { options: { tls: true } };
        };
      });
      afterEach(function () {
        delete (serviceProvider as any).getRawClient;
      });

      it('adds a notice to the error message', async function () {
        try {
          await shellApi.Mongo(
            `${await testServer.connectionString()}/?replicaSet=notexist&serverSelectionTimeoutMS=100`
          );
        } catch (e: any) {
          expect(e.message).to.match(
            /Server selection timed out.+\(is \?tls=true missing from the connection string\?\)$/
          );
        }
      });

      it('does not add a notice to the error message if tls= is already specified', async function () {
        try {
          await shellApi.Mongo(
            `${await testServer.connectionString()}/?replicaSet=notexist&serverSelectionTimeoutMS=100&tls=false`
          );
        } catch (e: any) {
          expect(e.message).to.match(/Server selection timed out[^()]+$/);
        }
      });
    });
    describe('convertShardKeyToHashed', function () {
      skipIfServerVersion(testServer, '< 4.4');

      it('converts a shard key to its hashed representation', async function () {
        const result: ShellBson['Long'] = (await mongo.convertShardKeyToHashed({
          foo: 'bar',
        })) as any;
        expect(result.constructor.name).to.equal('Long');
        expect(result.toString()).to.equal('4975617422686807705');
      });
    });
  });
  describe('PlanCache', function () {
    skipIfApiStrict();

    describe('list', function () {
      skipIfServerVersion(testServer, '< 4.4');
      it('lists all without args', async function () {
        await loadQueryCache(collection);
        const planCache = collection.getPlanCache();
        const res = await planCache.list();
        // SERVER-82677 means that the number of plans actually stored can
        // vary because queries get deduplicated, even if there are exact
        // indexes matching one query but not the other one during deduplication.
        expect(res).to.have.lengthOf.at.least(2);
        expect(res).to.have.lengthOf.at.most(4);
      });
      it('lists projection with args', async function () {
        await loadQueryCache(collection);
        const planCache = collection.getPlanCache();
        const res = await planCache.list([{ $project: { planCacheKey: 1 } }]);
        // The 6.0 server greatly reduces the expectations we can make here,
        // so just assert that query hashes are returned.
        expect(res).to.have.lengthOf.at.least(2);
        expect(res).to.have.lengthOf.at.most(4);
        expect([
          ...new Set(res.map((doc) => JSON.stringify(Object.keys(doc)))),
        ]).to.deep.equal(['["planCacheKey"]']);
      });
    });
    describe('clear', function () {
      skipIfServerVersion(testServer, '< 4.4');
      it('clears list', async function () {
        await loadQueryCache(collection);
        const planCache = collection.getPlanCache();
        const res = await planCache.list();
        expect(res).to.have.lengthOf.at.least(2);
        expect(res).to.have.lengthOf.at.most(4);
        const clearRes = await planCache.clear();
        expect(clearRes.ok).to.equal(1);
        expect((await planCache.list()).length).to.equal(0);
      });
    });
    describe('clearPlansByQuery', function () {
      skipIfServerVersion(testServer, '< 4.4');
      it('only clears some queries', async function () {
        const query = { quantity: { $gte: 5 }, type: 'apparel' };
        await loadQueryCache(collection);
        const planCache = collection.getPlanCache();
        const res = await planCache.list();
        expect(res).to.have.lengthOf.at.least(2);
        expect(res).to.have.lengthOf.at.most(4);
        const clearRes = await planCache.clearPlansByQuery(query);
        expect(clearRes.ok).to.equal(1);
        expect((await planCache.list()).length).to.equal(res.length - 1);
      });
    });
  });
  describe('mapReduce', function () {
    skipIfApiStrict();

    it('accepts function args and collection name as string', async function () {
      await loadMRExample(collection);
      const mapFn = `function() {
        emit(this.cust_id, this.price);
      };`;
      const reduceFn = compileExpr`function(keyCustId, valuesPrices) {
        return valuesPrices.reduce((s, t) => s + t);
      }`;
      const result = await collection.mapReduce(
        mapFn,
        reduceFn,
        'map_reduce_example'
      );
      expect(result.ok).to.equal(1);
      const outRes = await (
        await database.getCollection('map_reduce_example').find()
      )
        .sort({ _id: 1 })
        .toArray();
      expect(outRes).to.deep.equal([
        { _id: 'Ant O. Knee', value: 95 },
        { _id: 'Busby Bee', value: 125 },
        { _id: 'Cam Elot', value: 60 },
        { _id: 'Don Quis', value: 155 },
      ]);
    });
    it('accepts string args and collection name as string', async function () {
      await loadMRExample(collection);
      const mapFn = `function() {
        emit(this.cust_id, this.price);
      };`;
      const reduceFn = compileExpr`function(keyCustId, valuesPrices) {
        return valuesPrices.reduce((s, t) => s + t);
      }`;
      const result = await collection.mapReduce(
        mapFn,
        reduceFn.toString(),
        'map_reduce_example'
      );
      expect(result.ok).to.equal(1);
      expect(result.result).to.equal('map_reduce_example');
      const outRes = await (
        await database.getCollection('map_reduce_example').find()
      )
        .sort({ _id: 1 })
        .toArray();
      expect(outRes).to.deep.equal([
        { _id: 'Ant O. Knee', value: 95 },
        { _id: 'Busby Bee', value: 125 },
        { _id: 'Cam Elot', value: 60 },
        { _id: 'Don Quis', value: 155 },
      ]);
    });
    it('accepts inline as option', async function () {
      await loadMRExample(collection);
      const mapFn = `function() {
        emit(this.cust_id, this.price);
      };`;
      const reduceFn = compileExpr`function(keyCustId, valuesPrices) {
        return valuesPrices.reduce((s, t) => s + t);
      }`;
      const result = await collection.mapReduce(mapFn, reduceFn.toString(), {
        out: { inline: 1 },
      });
      expect(result.ok).to.equal(1);
      expect(result.results.map((k: Document) => k._id).sort()).to.deep.equal([
        'Ant O. Knee',
        'Busby Bee',
        'Cam Elot',
        'Don Quis',
      ]);
      expect(result.results.map((k: Document) => k.value).sort()).to.deep.equal(
        [125, 155, 60, 95]
      );
    });
    it('accepts finalize as option', async function () {
      await loadMRExample(collection);
      const mapFn = `function() {
        emit(this.cust_id, this.price);
      };`;
      const reduceFn = compileExpr`function(keyCustId, valuesPrices) {
        return valuesPrices.reduce((s, t) => s + t);
      }`;
      const finalizeFn = compileExpr`function() {
        return 1;
      }`;
      const result = await collection.mapReduce(mapFn, reduceFn.toString(), {
        out: { inline: 1 },
        finalize: finalizeFn,
      });
      expect(result.ok).to.equal(1);
      expect(result.results.map((k: Document) => k._id).sort()).to.deep.equal([
        'Ant O. Knee',
        'Busby Bee',
        'Cam Elot',
        'Don Quis',
      ]);
      expect(result.results.map((k: Document) => k.value)).to.deep.equal([
        1, 1, 1, 1,
      ]);
    });
  });

  describe('ShellInstanceState', function () {
    beforeEach(async function () {
      await instanceState.fetchConnectionInfo();
    });

    describe('fetchConnectionInfo', function () {
      skipIfApiStrict();

      it('returns information about the connection', async function () {
        const fetchedInfo = await instanceState.fetchConnectionInfo();
        expect(fetchedInfo?.buildInfo?.version).to.equal(
          await database.version()
        );
        expect(instanceState.cachedConnectionInfo()).to.equal(fetchedInfo);
      });
    });

    describe('getAutocompleteParameters', function () {
      let connectionString: string;
      beforeEach(async function () {
        // Make sure the collection is present so it is included in autocompletion.
        await collection.insertOne({});
        // Make sure 'database' is the current db in the eyes of the instance state object.
        instanceState.setDbFunc(database);
        connectionString = await testServer.connectionString();
        if (!connectionString.endsWith('/')) {
          connectionString += '/';
        }
      });

      it('returns information that is meaningful for autocompletion', async function () {
        const params = instanceState.getAutocompleteParameters();
        expect(params.topology()).to.equal(Topologies.Standalone);
        expect(params.connectionInfo()?.uri).to.equal(connectionString);
        expect(params.connectionInfo()?.is_atlas).to.equal(false);
        expect(params.connectionInfo()?.is_localhost).to.equal(true);
        expect(await database._getCollectionNames()).to.deep.equal(['docs']);
        expect(
          await params.getCollectionCompletionsForCurrentDb('d')
        ).to.deep.equal(['docs']);
        expect(
          await params.getCollectionCompletionsForCurrentDb('D')
        ).to.deep.equal(['docs']);
        expect(
          await params.getCollectionCompletionsForCurrentDb('e')
        ).to.deep.equal([]);
        expect(await params.getDatabaseCompletions('test-')).to.deep.equal([
          database.getName(),
        ]);
        expect(await params.getDatabaseCompletions('TEST-')).to.deep.equal([
          database.getName(),
        ]);
      });
    });
  });

  describe('database commands', function () {
    context('hello as isMaster', function () {
      skipIfApiStrict();
      it('db.isMaster() works', async function () {
        expect((await database.isMaster()).ismaster).to.equal(true);
        expect((await database.isMaster()).isWritablePrimary).to.equal(true);
      });
    });

    context('hello as hello', function () {
      it('db.hello() works', async function () {
        const result = await database.hello();
        expect(result.ismaster).to.equal(undefined);
        expect(result.isWritablePrimary).to.equal(true);
      });
    });

    context('with 5.0+ server', function () {
      skipIfApiStrict();
      skipIfServerVersion(testServer, '<= 4.4');

      it('db.rotateCertificates() works', async function () {
        expect((await database.rotateCertificates()).ok).to.equal(1);
        expect((await database.rotateCertificates('message')).ok).to.equal(1);
      });
    });
  });

  describe('displayBatchSize precedence', function () {
    beforeEach(async function () {
      await collection.insertMany([...Array(100).keys()].map((i) => ({ i })));
      const cfg = new ShellUserConfig();
      instanceState.setEvaluationListener({
        getConfig<K extends keyof ShellUserConfig>(key: K): ShellUserConfig[K] {
          return cfg[key];
        },
        setConfig<K extends keyof ShellUserConfig>(
          key: K,
          value: ShellUserConfig[K]
        ) {
          cfg[key] = value;
          return 'success';
        },
        resetConfig<K extends keyof ShellUserConfig>(key: K) {
          cfg[key] = new ShellUserConfig()[key];
          return 'success';
        },
        listConfigOptions() {
          return Object.keys(cfg);
        },
      });
      expect(
        (await (await collection.find())._it()).documents
      ).to.have.lengthOf(20);
    });

    it('config changes affect displayBatchSize', async function () {
      await shellApi.config.set('displayBatchSize', 10);
      expect(
        (await (await collection.find())._it()).documents
      ).to.have.lengthOf(10);
    });

    it('DBQuery.shellBatchSize takes precedence over config', async function () {
      await shellApi.config.set('displayBatchSize', 10);
      shellApi.DBQuery.shellBatchSize = 30;
      expect(shellApi.DBQuery.shellBatchSize).to.equal(30);
      expect(
        (await (await collection.find())._it()).documents
      ).to.have.lengthOf(30);
    });

    it('cursor.batchSize does not override config displayBatchSize', async function () {
      await shellApi.config.set('displayBatchSize', 10);
      expect(
        (await (await collection.find()).batchSize(50)._it()).documents
      ).to.have.lengthOf(10);
    });

    it('cursor.batchSize does not override DBQuery.shellBatchSize', async function () {
      shellApi.DBQuery.shellBatchSize = 5;
      expect(shellApi.DBQuery.shellBatchSize).to.equal(5);
      expect(
        (await (await collection.find()).batchSize(50)._it()).documents
      ).to.have.lengthOf(5);
    });
  });

  describe('maxTimeMS support', function () {
    skipIfServerVersion(testServer, '< 4.2');

    beforeEach(async function () {
      await collection.insertMany([...Array(10).keys()].map((i) => ({ i })));
      const cfg = new ShellUserConfig();
      instanceState.setEvaluationListener({
        getConfig<K extends keyof ShellUserConfig>(key: K): ShellUserConfig[K] {
          return cfg[key];
        },
        setConfig<K extends keyof ShellUserConfig>(
          key: K,
          value: ShellUserConfig[K]
        ) {
          cfg[key] = value;
          return 'success';
        },
        listConfigOptions() {
          return Object.keys(cfg);
        },
      });
    });

    it('config changes affect maxTimeMS', async function () {
      await shellApi.config.set('maxTimeMS', 100);
      try {
        // eslint-disable-next-line no-constant-condition
        await (
          await collection.find({
            $where: function () {
              // eslint-disable-next-line no-constant-condition
              while (true);
            },
          })
        ).next();
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.codeName).to.equal('MaxTimeMSExpired');
      }
    });

    it('maxTimeMS can be passed explicitly', async function () {
      await shellApi.config.set('maxTimeMS', null);
      try {
        // eslint-disable-next-line no-constant-condition
        await (
          await collection.find(
            {
              $where: function () {
                // eslint-disable-next-line no-constant-condition
                while (true);
              },
            },
            {},
            { maxTimeMS: 100 }
          )
        ).next();
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.codeName).to.equal('MaxTimeMSExpired');
      }
    });
  });

  describe('cursor map/forEach', function () {
    beforeEach(async function () {
      await collection.insertMany([...Array(10).keys()].map((i) => ({ i })));
    });

    it('forEach() iterates over input but does not return anything', async function () {
      let value = 0;
      const result = await (
        await collection.find()
      ).forEach(({ i }) => {
        value += i;
      });
      expect(result).to.equal(undefined);
      expect(value).to.equal(45);
    });

    it('map() iterates over input and changes documents in-place', async function () {
      const cursor = await collection.find();
      cursor.map(({ i }) => ({ j: i }));
      expect((await cursor._it()).documents[0]).to.deep.equal({ j: 0 });
    });

    it('forEach() errors lead to a rejected promise', async function () {
      const error = new Error();
      let calls = 0;
      try {
        await (
          await collection.find()
        ).forEach(() => {
          calls++;
          throw error;
        });
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err).to.equal(error);
      }
      expect(calls).to.equal(1);
    });

    it('map() errors show up when reading the cursor', async function () {
      const error = new Error();
      const cursor = await collection.find();
      let calls = 0;
      cursor.map(() => {
        calls++;
        throw error;
      });
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

  describe('method tracking', function () {
    it('emits an event when a deprecated method is called', async function () {
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
        isAsync: false,
      });
    });

    it('keeps track of whether a call is a top-level call or not', async function () {
      const events: ApiEvent[] = [];
      instanceState.messageBus.on('mongosh:api-call', (ev: ApiEvent) =>
        events.push(ev)
      );
      try {
        await database.printShardingStatus();
        expect.fail('Expected error');
      } catch (e: any) {
        expect(e.message).to.contain('This db does not have sharding enabled');
      }
      expect(events.length).to.be.greaterThan(1);
      expect(events[0]).to.deep.equal({
        method: 'printShardingStatus',
        class: 'DatabaseImpl',
        deprecated: false,
        callDepth: 0,
        isAsync: true,
      });
      expect(
        events.filter((ev) => ev.method === 'find').length
      ).to.be.greaterThan(1);
      expect(events.filter((ev) => ev.method === 'print').length).to.equal(1);
      expect(events.filter((ev) => ev.callDepth === 0).length).to.equal(1);
    });
  });

  describe('interruption', function () {
    it('allows interrupting and resuming Mongo instances', async function () {
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
