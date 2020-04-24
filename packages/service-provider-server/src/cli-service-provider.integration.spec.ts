import CliServiceProvider from './cli-service-provider';
import { expect } from 'chai';
import { MongoClient } from 'mongodb';
import path from 'path';
import fs from 'fs';
import os from 'os';

const mongodbRunnerBefore = require('mongodb-runner/mocha/before');
const mongodbRunnerAfter = require('mongodb-runner/mocha/after');

describe('CliServiceProvider [integration]', function() {
  const port = 27019;
  const connectionString = `mongodb://localhost:${port}`;

  //@ts-ignore
  fs.access(path.join(os.homedir(), process.cwd(), './node_modules/mongodb-version-manager/bin'), fs.F_OK, function (err) {
    console.log('ACCESS VERSION DIR')
    console.log(err)
  })
  
  before(function(done) {
    try {
      mongodbRunnerBefore({ port: 27019, timeout: 60000 }).call(this, done);
    } catch (e) {
      done(e);
    }
  });

  after(mongodbRunnerAfter({ port: 27019 }));

  let serviceProvider: CliServiceProvider;
  let client: MongoClient;
  let dbName: string;
  let db;

  beforeEach(async() => {
    client = await MongoClient.connect(
      connectionString,
      { useUnifiedTopology: true }
    );

    dbName = `test-db-${Date.now()}`;
    db = client.db(dbName);
    serviceProvider = new CliServiceProvider(client);
  });

  afterEach(() => {
    serviceProvider.close(true);
  });

  describe('.connect', () => {
    let instance;
    beforeEach(async() => {
      instance = await CliServiceProvider.connect(connectionString);
    });

    afterEach(() => {
      instance.close(true);
    });

    it('returns a CliServiceProvider', async() => {
      expect(instance).to.be.instanceOf(CliServiceProvider);
    });

    it('connects mongo client', () => {
      expect(instance.mongoClient.isConnected()).to.equal(true);
    });
  });

  describe('#aggregate', () => {
    context('when running against a collection', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.
          aggregate('music', 'bands', [{ $match: { name: 'Aphex Twin' } }]);
      });

      it('executes the command and resolves the result', async() => {
        const docs = await result.toArray();
        expect(docs).to.deep.equal([]);
      });
    });

    context('when running against a database', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.aggregateDb('admin', [{ $currentOp: {} }]);
      });

      it('executes the command and resolves the result', async() => {
        const docs = await result.toArray();
        expect(docs[0].active).to.equal(true);
      });
    });
  });

  describe('#bulkWrite', () => {
    context('when the filter is empty', () => {
      let result;
      const requests = [{
        insertOne: { name: 'Aphex Twin' }
      }];

      beforeEach(async() => {
        result = await serviceProvider.bulkWrite('music', 'bands', requests);
      });

      afterEach(() => {
        return serviceProvider.deleteMany('music', 'bands', {});
      });

      it('executes the count with an empty filter and resolves the result', () => {
        expect(result.result.nInserted).to.equal(1);
      });
    });
  });

  describe('#countDocuments', () => {
    context('when the filter is empty', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.countDocuments('music', 'bands');
      });

      it('executes the count with an empty filter and resolves the result', () => {
        expect(result).to.equal(0);
      });
    });
  });

  describe('#deleteMany', () => {
    context('when the filter is empty', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.deleteMany('music', 'bands', {});
      });

      it('executes the count with an empty filter and resolves the result', () => {
        expect(result.result.n).to.equal(0);
      });
    });
  });

  describe('#deleteOne', () => {
    context('when the filter is empty', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.deleteOne('music', 'bands', {});
      });

      it('executes the count with an empty filter and resolves the result', () => {
        expect(result.result.n).to.equal(0);
      });
    });
  });

  describe('#distinct', () => {
    context('when the distinct is valid', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.distinct('music', 'bands', 'name');
      });

      it('executes the command and resolves the result', () => {
        expect(result).to.deep.equal([]);
      });
    });
  });

  describe('#estimatedDocumentCount', () => {
    context('when no options are provided', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.estimatedDocumentCount('music', 'bands');
      });

      it('executes the count and resolves the result', () => {
        expect(result).to.equal(0);
      });
    });
  });

  describe('#find', () => {
    context('when the find is valid', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.find('music', 'bands', { name: 'Aphex Twin' });
      });

      it('executes the command and resolves the result', async() => {
        const docs = await result.toArray();
        expect(docs).to.deep.equal([]);
      });
    });
  });

  describe('#findOneAndDelete', () => {
    context('when the find is valid', () => {
      let result;
      const filter = { name: 'Aphex Twin' };

      beforeEach(async() => {
        result = await serviceProvider.findOneAndDelete('music', 'bands', filter);
      });

      it('executes the command and resolves the result', () => {
        expect(result.ok).to.equal(1);
      });
    });
  });

  describe('#findOneAndReplace', () => {
    context('when the find is valid', () => {
      let result;
      const filter = { name: 'Aphex Twin' };
      const replacement = { name: 'Richard James' };

      beforeEach(async() => {
        result = await serviceProvider.
          findOneAndReplace('music', 'bands', filter, replacement);
      });

      it('executes the command and resolves the result', () => {
        expect(result.ok).to.equal(1);
      });
    });
  });

  describe('#findOneAndUpdate', () => {
    context('when the find is valid', () => {
      let result;
      const filter = { name: 'Aphex Twin' };
      const update = { $set: { name: 'Richard James' } };

      beforeEach(async() => {
        result = await serviceProvider.
          findOneAndUpdate('music', 'bands', filter, update);
      });

      it('executes the command and resolves the result', () => {
        expect(result.ok).to.equal(1);
      });
    });
  });

  describe('#insertMany', () => {
    context('when the insert is valid', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.insertMany('music', 'bands', [{ name: 'Aphex Twin' }]);
      });

      afterEach(() => {
        return serviceProvider.deleteMany('music', 'bands', {});
      });

      it('executes the count with an empty filter and resolves the result', () => {
        expect(result.result.n).to.equal(1);
      });
    });
  });

  describe('#insertOne', () => {
    context('when the insert is valid', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.insertOne('music', 'bands', { name: 'Aphex Twin' });
      });

      afterEach(() => {
        return serviceProvider.deleteMany('music', 'bands', {});
      });

      it('executes the count with an empty filter and resolves the result', () => {
        expect(result.result.n).to.equal(1);
      });
    });
  });

  describe('#replaceOne', () => {
    const filter = { name: 'Aphex Twin' };
    const replacement = { name: 'Richard James' };

    context('when the filter is empty', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.
          replaceOne('music', 'bands', filter, replacement);
      });

      it('executes the count with an empty filter and resolves the result', () => {
        expect(result.result.n).to.equal(0);
      });
    });
  });

  describe('#runCommand', () => {
    context('when the command is valid', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.runCommand('admin', { ismaster: true });
      });

      it('executes the command and resolves the result', () => {
        expect(result.ismaster).to.equal(true);
      });
    });
  });

  describe('#updateMany', () => {
    const filter = { name: 'Aphex Twin' };
    const update = { $set: { name: 'Richard James' } };
    context('when the filter is empty', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.
          updateMany('music', 'bands', filter, update);
      });

      it('executes the count with an empty filter and resolves the result', () => {
        expect(result.result.n).to.equal(0);
      });
    });
  });

  describe('#updateOne', () => {
    const filter = { name: 'Aphex Twin' };
    const update = { $set: { name: 'Richard James' } };
    context('when the filter is empty', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.
          updateOne('music', 'bands', filter, update);
      });

      it('executes the count with an empty filter and resolves the result', () => {
        expect(result.result.n).to.equal(0);
      });
    });
  });

  describe('#getServerVersion', () => {
    context('when the filter is empty', () => {
      let result;

      beforeEach(async() => {
        result = await serviceProvider.getServerVersion();
      });

      it('returns a semver', () => {
        expect(result).to.match(/^\d+.\d+/);
      });
    });
  });

  describe('#dropDatabase', () => {
    context('when a database does not exist', () => {
      let result;

      it('returns  {ok: 1}', async() => {
        result = await serviceProvider.dropDatabase(`test-db-${Date.now()}`);
        expect(result.ok).to.equal(1);
      });
    });

    context('when a database exists', () => {
      let result;

      const dbExists = async(): Promise<boolean> => {
        return (await db.admin().listDatabases())
          .databases
          .map((database) => database.name)
          .includes(dbName);
      };

      beforeEach(async() => {
        await db.collection('coll1').insertOne({ doc: 1 });
        expect(await dbExists()).to.be.true;
        result = await serviceProvider.dropDatabase(dbName);
      });

      it('returns {ok: 1}', async() => {
        expect(result.ok).to.equal(1);
      });

      it('deletes the database', async() => {
        expect(await dbExists()).to.be.false;
      });
    });
  });

  describe('#convertToCapped', () => {
    it('converts a collection to capped', async() => {
      const collName = 'coll1';
      const nativeCollection = db.collection(collName);

      await db.createCollection(collName);

      expect(
        await nativeCollection.isCapped()
      ).to.be.false;

      await serviceProvider.convertToCapped(
        dbName,
        collName,
        10000
      );

      expect(
        await nativeCollection.isCapped()
      ).to.be.true;
    });
  });

  describe('#createIndexes', () => {
    it('creates a new index', async() => {
      const collName = 'coll1';
      const nativeCollection = db.collection(collName);

      await db.createCollection(collName);

      expect(
        await nativeCollection.indexExists('index-1')
      ).to.be.false;

      await serviceProvider.createIndexes(
        dbName,
        collName,
        [{
          name: 'index-1',
          key: { x: 1 }
        }]
      );

      expect(
        await nativeCollection.indexExists('index-1')
      ).to.be.true;
    });
  });

  describe('#getIndexes', () => {
    it('returns indexes', async() => {
      const collName = 'coll1';
      const nativeCollection = db.collection(collName);

      await nativeCollection.createIndex('x');

      const result = await serviceProvider.getIndexes(
        dbName,
        collName
      );

      expect(
        result.map((spec) => spec.key)
      ).to.deep.equal([{ _id: 1 }, { x: 1 }]);
    });
  });

  describe('#dropIndexes', () => {
    it('drop existing indexes', async() => {
      const collName = 'coll1';
      const nativeCollection = db.collection(collName);

      await nativeCollection.createIndex({ x: 1 }, { name: 'index-1' });

      expect(
        await nativeCollection.indexExists('index-1')
      ).to.be.true;

      await serviceProvider.dropIndexes(
        dbName,
        collName,
        ['index-1']
      );

      expect(
        await nativeCollection.indexExists('index-1')
      ).to.be.false;
    });

    it('throws an error if index does not exist', async() => {
      const collName = 'coll1';
      await db.createCollection(collName);

      let error;
      await serviceProvider.dropIndexes(
        dbName,
        collName,
        ['index-1']
      ).catch(err => {error = err;});

      expect(error.ok).to.equal(0);
      expect(error.codeName).to.equal('IndexNotFound');
    });
  });

  describe('stats', () => {
    it('returns collection stats', async() => {
      const collName = 'coll1';
      await db.createCollection(collName);

      const stats = await serviceProvider.stats(
        dbName,
        collName
      );

      expect(Object.keys(stats)).to.contain.members([
        'ns',
        'size',
        'count',
        'storageSize',
        'capped',
        'wiredTiger',
        'nindexes',
        'indexDetails',
        'indexBuilds',
        'totalIndexSize',
        'indexSizes',
        'scaleFactor',
        'ok'
      ]);
    });
  });

  describe('#listCollections', () => {
    it('returns the list of collections', async() => {
      await db.createCollection('coll1');

      expect(
        (await serviceProvider.listCollections(dbName)).map((c) => c.name)
      ).to.deep.equal(['coll1']);
    });

    it('filter the list of collections', async() => {
      await db.createCollection('coll1');
      await db.createCollection('coll2');

      expect(
        (await serviceProvider.listCollections(dbName, { name: 'coll2' })).map((c) => c.name)
      ).to.deep.equal(['coll2']);
    });

    it('allows options', async() => {
      await db.createCollection('coll1');
      await db.createCollection('coll2');

      const collections = await serviceProvider.listCollections(dbName, {}, { nameOnly: true });

      expect(
        collections
      ).to.deep.contain({
        name: 'coll1',
        type: 'collection'
      });

      expect(
        collections
      ).to.deep.contain({
        name: 'coll2',
        type: 'collection'
      });
    });
  });

  describe('#reIndex', () => {
    it('runs against the db', async() => {
      const collName = 'coll1';
      await db.createCollection(collName);

      const result = await serviceProvider.reIndex(
        dbName,
        collName
      );

      expect(
        result
      ).to.deep.equal({
        nIndexesWas: 1,
        nIndexes: 1,
        indexes: [
          {
            v: 2,
            key: {
              '_id': 1
            },
            name: '_id_',
            ns: `${dbName}.${collName}`
          }
        ],
        ok: 1
      });
    });
  });
});
