import type { DropDatabaseResult } from './node-driver-service-provider';
import { NodeDriverServiceProvider } from './node-driver-service-provider';
import { CompassServiceProvider } from './compass/compass-service-provider';
import { expect } from 'chai';
import { EventEmitter } from 'events';
import { MongoClient } from 'mongodb';
import type {
  AggregationCursor,
  BulkWriteResult,
  Db,
  DeleteResult,
  Document,
  FindCursor,
  InsertManyResult,
  InsertOneResult,
  UpdateResult,
} from 'mongodb';
import {
  skipIfServerVersion,
  startSharedTestServer,
} from '../../../testing/integration-testing-hooks';
import type {
  DbOptions,
  MongoClientOptions,
} from '@mongosh/service-provider-core';
import ConnectionString from 'mongodb-connection-string-url';
import { dummyOptions } from './node-driver-service-provider.spec';

describe('NodeDriverServiceProvider [integration]', function () {
  const testServer = startSharedTestServer();

  let serviceProvider: NodeDriverServiceProvider;
  let client: MongoClient;
  let dbName: string;
  let db: Db;
  let connectionString: string;
  let bus: EventEmitter;

  beforeEach(async function () {
    connectionString = await testServer.connectionString();
    client = await MongoClient.connect(
      connectionString,
      {} as MongoClientOptions
    );

    dbName = `test-db-${Date.now()}`;
    db = client.db(dbName);
    bus = new EventEmitter();
    serviceProvider = new NodeDriverServiceProvider(
      client,
      bus,
      dummyOptions,
      new ConnectionString(connectionString)
    );
  });

  afterEach(async function () {
    await serviceProvider.close(true);
  });

  describe('.connect', function () {
    let instance: NodeDriverServiceProvider;
    beforeEach(async function () {
      instance = await NodeDriverServiceProvider.connect(
        connectionString,
        dummyOptions,
        {},
        bus
      );
    });

    afterEach(async function () {
      await instance.close(true);
    });

    it('returns a NodeDriverServiceProvider', function () {
      expect(instance).to.be.instanceOf(NodeDriverServiceProvider);
    });
  });

  describe('.getNewConnection', function () {
    let instance: NodeDriverServiceProvider;

    beforeEach(async function () {
      instance = await serviceProvider.getNewConnection(connectionString);
    });

    afterEach(async function () {
      await instance.close(true);
    });

    it('returns a NodeDriverServiceProvider', function () {
      expect(instance).to.be.instanceOf(NodeDriverServiceProvider);
    });

    it('differs from the original NodeDriverServiceProvider', function () {
      expect(instance).to.not.equal(serviceProvider);
    });
  });

  describe('.suspend', function () {
    it('allows disconnecting and reconnecting the NodeDriverServiceProvider', async function () {
      await serviceProvider.runCommandWithCheck('admin', { ping: 1 });
      const reconnect = await serviceProvider.suspend();
      try {
        await serviceProvider.runCommandWithCheck('admin', { ping: 1 });
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.name).to.equal('MongoNotConnectedError');
      }
      await reconnect();
      await serviceProvider.runCommandWithCheck('admin', { ping: 1 });
    });
  });

  describe('.authenticate', function () {
    beforeEach(async function () {
      await serviceProvider.runCommandWithCheck('admin', {
        createUser: 'xyz',
        pwd: 'asdf',
        roles: [],
      });
    });

    afterEach(async function () {
      await serviceProvider.runCommandWithCheck('admin', {
        dropUser: 'xyz',
      });
    });

    it('resets the MongoClient', async function () {
      const mongoClientBefore = serviceProvider.mongoClient;
      await serviceProvider.authenticate({
        user: 'xyz',
        pwd: 'asdf',
        authDb: 'admin',
      });
      expect(serviceProvider.mongoClient).to.not.equal(mongoClientBefore);
    });
  });

  describe('.resetConnectionOptions', function () {
    it('resets the MongoClient', async function () {
      const mongoClientBefore = serviceProvider.mongoClient;
      await serviceProvider.resetConnectionOptions({
        readPreference: 'secondaryPreferred',
      });
      expect(serviceProvider.mongoClient).to.not.equal(mongoClientBefore);
      expect(serviceProvider.getReadPreference().mode).to.equal(
        'secondaryPreferred'
      );
    });
  });

  describe('.getConnectionInfo', function () {
    context('when a uri has been passed', function () {
      it("returns the connection's info", async function () {
        const instance = new NodeDriverServiceProvider(
          client,
          bus,
          dummyOptions,
          new ConnectionString(connectionString)
        );
        const connectionInfo = await instance.getConnectionInfo();

        expect(Object.keys(connectionInfo)).to.deep.equal([
          'buildInfo',
          'resolvedHostname',
          'extraInfo',
        ]);
        expect(connectionInfo.buildInfo?.version.length).to.be.greaterThan(1);
      });
    });

    context('when the optional uri has not been passed', function () {
      it("returns the connection's info", async function () {
        const instance = new NodeDriverServiceProvider(
          client,
          bus,
          dummyOptions
        );
        const connectionInfo = await instance.getConnectionInfo();

        expect(Object.keys(connectionInfo)).to.deep.equal([
          'buildInfo',
          'resolvedHostname',
          'extraInfo',
        ]);
        expect(connectionInfo.buildInfo?.version.length).to.be.greaterThan(1);
      });
    });
  });

  describe('#aggregate', function () {
    context(
      'when passing a $function to be serialized by the driver',
      function () {
        skipIfServerVersion(testServer, '< 4.4');

        let result: AggregationCursor;

        beforeEach(function () {
          const pipeline = [
            {
              $addFields: {
                'attr.namespace': {
                  $function: {
                    body: function (value: any): any {
                      if (value) {
                        return value;
                      }
                    },
                    args: ['$attr.namespace'],
                    lang: 'js',
                  },
                },
              },
            },
          ];
          result = serviceProvider.aggregate('music', 'bands', pipeline);
        });

        it('executes the command and resolves the result', async function () {
          const docs = await result.toArray();
          expect(docs).to.deep.equal([]);
        });
      }
    );

    context('when running against a collection', function () {
      let result: AggregationCursor;

      beforeEach(function () {
        result = serviceProvider.aggregate('music', 'bands', [
          { $match: { name: 'Aphex Twin' } },
        ]);
      });

      it('executes the command and resolves the result', async function () {
        const docs = await result.toArray();
        expect(docs).to.deep.equal([]);
      });
    });

    context('when running against a database', function () {
      let result: AggregationCursor;

      beforeEach(function () {
        result = serviceProvider.aggregateDb('admin', [{ $currentOp: {} }]);
      });

      it('executes the command and resolves the result', async function () {
        const docs = await result.toArray();
        expect(docs[0].active).to.equal(true);
      });
    });
  });

  describe('#bulkWrite', function () {
    context('when the filter is empty', function () {
      let result: BulkWriteResult;
      const requests = [
        {
          insertOne: { name: 'Aphex Twin' },
        } as any,
      ];

      beforeEach(async function () {
        result = await serviceProvider.bulkWrite('music', 'bands', requests);
      });

      afterEach(function () {
        return serviceProvider.deleteMany('music', 'bands', {});
      });

      it('executes the count with an empty filter and resolves the result', function () {
        expect((result as any).result.nInserted).to.equal(1);
      });
    });
  });

  describe('#count', function () {
    context('when the filter is empty', function () {
      let result: number;

      beforeEach(async function () {
        result = await serviceProvider.count('music', 'bands');
      });

      it('executes the count with an empty filter and resolves the result', function () {
        expect(result).to.equal(0);
      });
    });
  });

  describe('#countDocuments', function () {
    context('when the filter is empty', function () {
      let result: number;

      beforeEach(async function () {
        result = await serviceProvider.countDocuments('music', 'bands');
      });

      it('executes the count with an empty filter and resolves the result', function () {
        expect(result).to.equal(0);
      });
    });
  });

  describe('#deleteMany', function () {
    context('when the filter is empty', function () {
      let result: DeleteResult;

      beforeEach(async function () {
        result = await serviceProvider.deleteMany('music', 'bands', {});
      });

      it('executes the count with an empty filter and resolves the result', function () {
        expect(result.deletedCount).to.equal(0);
      });
    });
  });

  describe('#deleteOne', function () {
    context('when the filter is empty', function () {
      let result: DeleteResult;

      beforeEach(async function () {
        result = await serviceProvider.deleteOne('music', 'bands', {});
      });

      it('executes the count with an empty filter and resolves the result', function () {
        expect(result.deletedCount).to.equal(0);
      });
    });
  });

  describe('#distinct', function () {
    context('when the distinct is valid', function () {
      let result: Document[];

      beforeEach(async function () {
        result = await serviceProvider.distinct('music', 'bands', 'name');
      });

      it('executes the command and resolves the result', function () {
        expect(result).to.deep.equal([]);
      });
    });
  });

  describe('#estimatedDocumentCount', function () {
    context('when no options are provided', function () {
      let result: number;

      beforeEach(async function () {
        result = await serviceProvider.estimatedDocumentCount('music', 'bands');
      });

      it('executes the count and resolves the result', function () {
        expect(result).to.equal(0);
      });
    });
  });

  describe('#find', function () {
    context('when the find is valid', function () {
      let result: FindCursor;

      beforeEach(function () {
        result = serviceProvider.find('music', 'bands', { name: 'Aphex Twin' });
      });

      it('executes the command and resolves the result', async function () {
        const docs = await result.toArray();
        expect(docs).to.deep.equal([]);
      });
    });
  });

  describe('#findOneAndDelete', function () {
    context('when the find is valid', function () {
      let result: Document | null;
      const filter = { name: 'Aphex Twin' };

      beforeEach(async function () {
        result = await serviceProvider.findOneAndDelete(
          'music',
          'bands',
          filter
        );
      });

      it('executes the command and resolves the result', function () {
        expect(result?.ok).to.equal(1);
      });
    });
  });

  describe('#findOneAndReplace', function () {
    context('when the find is valid', function () {
      let result: Document;
      const filter = { name: 'Aphex Twin' };
      const replacement = { name: 'Richard James' };

      beforeEach(async function () {
        result = await serviceProvider.findOneAndReplace(
          'music',
          'bands',
          filter,
          replacement
        );
      });

      it('executes the command and resolves the result', function () {
        expect(result.ok).to.equal(1);
      });
    });
  });

  describe('#findOneAndUpdate', function () {
    context('when the find is valid', function () {
      let result: Document;
      const filter = { name: 'Aphex Twin' };
      const update = { $set: { name: 'Richard James' } };

      beforeEach(async function () {
        result = await serviceProvider.findOneAndUpdate(
          'music',
          'bands',
          filter,
          update
        );
      });

      it('executes the command and resolves the result', function () {
        expect(result.ok).to.equal(1);
      });
    });
  });

  describe('#insertMany', function () {
    context('when the insert is valid', function () {
      let result: InsertManyResult;

      beforeEach(async function () {
        result = await serviceProvider.insertMany('music', 'bands', [
          { name: 'Aphex Twin' },
        ]);
      });

      afterEach(function () {
        return serviceProvider.deleteMany('music', 'bands', {});
      });

      it('executes the count with an empty filter and resolves the result', function () {
        expect(result.acknowledged).to.equal(true);
      });
    });
  });

  describe('#insertOne', function () {
    context('when the insert is valid', function () {
      let result: InsertOneResult;

      beforeEach(async function () {
        result = await serviceProvider.insertOne('music', 'bands', {
          name: 'Aphex Twin',
        });
      });

      afterEach(function () {
        return serviceProvider.deleteMany('music', 'bands', {});
      });

      it('executes the count with an empty filter and resolves the result', function () {
        expect(result.acknowledged).to.equal(true);
      });
    });
  });

  describe('#listDatabases', function () {
    let result: Document;

    beforeEach(async function () {
      result = await serviceProvider.listDatabases('admin');
    });

    it('returns a list of databases', function () {
      expect(result.ok).to.equal(1);
      expect(
        result.databases.map((db: { name: string }) => db.name)
      ).to.include('admin');
    });
  });

  describe('#replaceOne', function () {
    const filter = { name: 'Aphex Twin' };
    const replacement = { name: 'Richard James' };

    context('when the filter is empty', function () {
      let result: UpdateResult;

      beforeEach(async function () {
        result = await serviceProvider.replaceOne(
          'music',
          'bands',
          filter,
          replacement
        );
      });

      it('executes the count with an empty filter and resolves the result', function () {
        expect(result.acknowledged).to.equal(true);
      });
    });
  });

  describe('#runCommand', function () {
    context('when the command is valid', function () {
      let result: Document;

      beforeEach(async function () {
        result = await serviceProvider.runCommand('admin', { ismaster: true });
      });

      it('executes the command and resolves the result', function () {
        expect(result.ismaster).to.equal(true);
      });
    });
  });

  describe('#updateMany', function () {
    const filter = { name: 'Aphex Twin' };
    const update = { $set: { name: 'Richard James' } };
    context('when the filter is empty', function () {
      let result: UpdateResult;

      beforeEach(async function () {
        result = await serviceProvider.updateMany(
          'music',
          'bands',
          filter,
          update
        );
      });

      it('executes the count with an empty filter and resolves the result', function () {
        expect(result.acknowledged).to.equal(true);
      });
    });
  });

  describe('#updateOne', function () {
    const filter = { name: 'Aphex Twin' };
    const update = { $set: { name: 'Richard James' } };
    context('when the filter is empty', function () {
      let result: UpdateResult;

      beforeEach(async function () {
        result = await serviceProvider.updateOne(
          'music',
          'bands',
          filter,
          update
        );
      });

      it('executes the count with an empty filter and resolves the result', function () {
        expect(result.acknowledged).to.equal(true);
      });
    });
  });

  describe('#dropCollection', function () {
    context('when a collection existed', function () {
      it('returns  {ok: 1}', async function () {
        await serviceProvider.createCollection('test', 'collectionexists');
        const result = await serviceProvider.dropCollection(
          'test',
          'collectionexists'
        );
        expect(result).to.equal(true);
      });
    });
  });

  describe('#dropDatabase', function () {
    context('when a database does not exist', function () {
      let result: DropDatabaseResult;

      it('returns  {ok: 1}', async function () {
        result = await serviceProvider.dropDatabase(`test-db-${Date.now()}`);
        expect(result.ok).to.equal(1);
      });
    });

    context('when a database exists', function () {
      let result: DropDatabaseResult;

      const dbExists = async (): Promise<boolean> => {
        return (await db.admin().listDatabases()).databases
          .map((database) => database.name)
          .includes(dbName);
      };

      beforeEach(async function () {
        await db.collection('coll1').insertOne({ doc: 1 });
        expect(await dbExists()).to.be.true;
        result = await serviceProvider.dropDatabase(dbName);
      });

      it('returns {ok: 1}', function () {
        expect(result.ok).to.equal(1);
      });

      it('deletes the database', async function () {
        expect(await dbExists()).to.be.false;
      });
    });
  });

  describe('#createIndexes', function () {
    it('creates a new index', async function () {
      const collName = 'coll1';
      const nativeCollection = db.collection(collName);

      await db.createCollection(collName);

      expect(await nativeCollection.indexExists('index-1')).to.be.false;

      await serviceProvider.createIndexes(dbName, collName, [
        {
          name: 'index-1',
          key: { x: 1 },
        },
      ]);

      expect(await nativeCollection.indexExists('index-1')).to.be.true;
    });
  });

  describe('#getIndexes', function () {
    it('returns indexes', async function () {
      const collName = 'coll1';
      const nativeCollection = db.collection(collName);

      await nativeCollection.createIndex('x');

      const result = await serviceProvider.getIndexes(dbName, collName);

      expect(result.map((spec) => spec.key)).to.deep.equal([
        { _id: 1 },
        { x: 1 },
      ]);
    });
  });

  // TODO(MONGOSH-1465): integration tests for search indexes

  describe('#listCollections', function () {
    it('returns the list of collections', async function () {
      await db.createCollection('coll1');

      expect(
        (await serviceProvider.listCollections(dbName)).map((c: any) => c.name)
      ).to.deep.equal(['coll1']);
    });

    it('filter the list of collections', async function () {
      await db.createCollection('coll1');
      await db.createCollection('coll2');

      expect(
        (await serviceProvider.listCollections(dbName, { name: 'coll2' })).map(
          (c: any) => c.name
        )
      ).to.deep.equal(['coll2']);
    });

    it('allows options', async function () {
      await db.createCollection('coll1');
      await db.createCollection('coll2');

      const collections = await serviceProvider.listCollections(
        dbName,
        {},
        { nameOnly: true }
      );

      expect(collections).to.deep.contain({
        name: 'coll1',
        type: 'collection',
      });

      expect(collections).to.deep.contain({
        name: 'coll2',
        type: 'collection',
      });
    });

    context('post-5.0', function () {
      skipIfServerVersion(testServer, '< 5.0');

      it('allows time-series', async function () {
        await db.createCollection('coll1', {
          timeseries: { timeField: 'time' },
        });

        const collections = await serviceProvider.listCollections(
          dbName,
          {},
          { nameOnly: true }
        );

        expect(collections).to.deep.contain({
          name: 'coll1',
          type: 'timeseries',
        });

        expect(collections).to.deep.contain({
          name: 'system.buckets.coll1',
          type: 'collection',
        });

        expect(collections).to.deep.contain({
          name: 'system.views',
          type: 'collection',
        });
      });
    });

    context('post-5.3', function () {
      skipIfServerVersion(testServer, '< 5.3');

      it('allows clustered indexes on collections', async function () {
        await db.createCollection('coll1', {
          clusteredIndex: {
            key: { _id: 1 },
            unique: true,
          },
        });

        const collections = await serviceProvider.listCollections(
          dbName,
          {},
          {}
        );

        const matchingCollection = collections.find(
          (collection) => collection.name === 'coll1'
        );
        expect(matchingCollection).to.not.be.undefined;
        expect(matchingCollection?.options).to.deep.contain({
          clusteredIndex: {
            v: 2,
            key: { _id: 1 },
            name: '_id_',
            unique: true,
          },
        });

        const indexes = await serviceProvider.getIndexes(dbName, 'coll1');

        expect(indexes).to.deep.contain({
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

  describe('db fetching', function () {
    it('returns the same db instance when used with the same name and options', function () {
      const db1 = serviceProvider._dbTestWrapper('foo', {
        readPreference: { mode: 'secondary' },
      } as DbOptions);
      const db2 = serviceProvider._dbTestWrapper('foo', {
        readPreference: { mode: 'secondary' },
      } as DbOptions);
      expect(db1).to.equal(db2);
    });

    it('returns the different db instances when used with different names', function () {
      const db1 = serviceProvider._dbTestWrapper('bar', {
        readPreference: { mode: 'secondary' },
      } as DbOptions);
      const db2 = serviceProvider._dbTestWrapper('foo', {
        readPreference: { mode: 'secondary' },
      } as DbOptions);
      expect(db1).not.to.equal(db2);
    });

    it('returns the different db instances when used with different options', function () {
      const db1 = serviceProvider._dbTestWrapper('foo', {
        readPreference: { mode: 'primary' },
      } as DbOptions);
      const db2 = serviceProvider._dbTestWrapper('foo', {
        readPreference: { mode: 'secondary' },
      } as DbOptions);
      expect(db1).not.to.equal(db2);
    });
  });

  describe('#driverMetadata', function () {
    it('returns information about the driver instance', function () {
      expect(serviceProvider.driverMetadata?.driver.name).to.equal('nodejs');
    });
  });

  describe('#getURI', function () {
    it('returns the current URI', function () {
      expect(serviceProvider.getURI()).to.equal(connectionString);
    });
  });

  describe('CompassServiceProvider', function () {
    let instance: NodeDriverServiceProvider;

    afterEach(async function () {
      await instance?.close(true);
    });

    it('.connect() returns a CompassServiceProvider instance', async function () {
      instance = await CompassServiceProvider.connect(
        connectionString,
        dummyOptions,
        {},
        bus
      );

      expect(instance).to.be.instanceOf(CompassServiceProvider);
      expect(instance.platform).to.equal('Compass');
    });
  });
});
