import mongodb, { MongoClient, Db } from 'mongodb';
const Collection = (mongodb as any).Collection;

import { expect } from 'chai';
import sinon from 'ts-sinon';

import CliServiceProvider from './cli-service-provider';

/**
 * Create a client stub from the provided collection stub.
 *
 * @note: We basically only care about the method under test
 *   which is always mocked on a new collection stub each
 *   test run. We we can use the boilerplate creation of the
 *   db and client here.
 *
 * @param {Stub} collectionStub - The collection stub.
 *
 * @returns {Stub} The client stub to pass to the transport.
 */
const createClientStub = (collectionStub): MongoClient => {
  const dbStub = sinon.createStubInstance(Db, {
    collection: sinon.stub().returns(collectionStub)
  });
  return sinon.createStubInstance(MongoClient, {
    db: sinon.stub().returns(dbStub)
  });
};

describe('CliServiceProvider', () => {
  let serviceProvider: CliServiceProvider;

  describe('#constructor', () => {
    const mongoClient = sinon.spy();
    serviceProvider = new CliServiceProvider(mongoClient);

    it('sets the mongo client on the instance', () => {
      expect((serviceProvider as any).mongoClient).to.equal(mongoClient);
    });
  });

  describe('#aggregate', () => {
    const pipeline = [{ $match: { name: 'Aphex Twin' } }];
    const aggResult = [{ name: 'Aphex Twin' }];
    const aggMock = sinon.mock().withArgs(pipeline).
      returns({ toArray: () => Promise.resolve(aggResult) });

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        aggregate: aggMock
      });
      serviceProvider = new CliServiceProvider(createClientStub(collectionStub));
    });

    it('executes the command against the database', async() => {
      const cursor = await serviceProvider.aggregate('music', 'bands', pipeline);
      const result = await cursor.toArray();
      expect(result).to.deep.equal(aggResult);
      (aggMock as any).verify();
    });
  });

  describe('#bulkWrite', () => {
    const requests = [{ insertOne: { name: 'Aphex Twin' } }];
    const commandResult = { result: { nInserted: 1, ok: 1 } };
    const bulkMock = sinon.mock().once().withArgs(requests).resolves(commandResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        bulkWrite: bulkMock
      });
      serviceProvider = new CliServiceProvider(createClientStub(collectionStub));
    });

    it('executes the command against the database', async() => {
      const result = await serviceProvider.bulkWrite('music', 'bands', requests);
      expect(result).to.deep.equal(commandResult);
      (bulkMock as any).verify();
    });
  });

  describe('#countDocuments', () => {
    const countResult = 10;
    const countMock = sinon.mock().once().withArgs({}).resolves(countResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        countDocuments: countMock
      });
      serviceProvider = new CliServiceProvider(createClientStub(collectionStub));
    });

    it('executes the command against the database', async() => {
      const result = await serviceProvider.countDocuments('music', 'bands');
      expect(result).to.deep.equal(countResult);
      (countMock as any).verify();
    });
  });

  describe('#deleteMany', () => {
    const commandResult = { result: { n: 1, ok: 1 } };
    const deleteMock = sinon.mock().once().withArgs({}).resolves(commandResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        deleteMany: deleteMock
      });
      serviceProvider = new CliServiceProvider(createClientStub(collectionStub));
    });

    it('executes the command against the database', async() => {
      const result = await serviceProvider.deleteMany('music', 'bands', {});
      expect(result).to.deep.equal(commandResult);
      (deleteMock as any).verify();
    });
  });

  describe('#deleteOne', () => {
    const commandResult = { result: { n: 1, ok: 1 } };
    const deleteMock = sinon.mock().once().withArgs({}).resolves(commandResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        deleteOne: deleteMock
      });
      serviceProvider = new CliServiceProvider(createClientStub(collectionStub));
    });

    it('executes the command against the database', async() => {
      const result = await serviceProvider.deleteOne('music', 'bands', {});
      expect(result).to.deep.equal(commandResult);
      (deleteMock as any).verify();
    });
  });

  describe('#distinct', () => {
    const distinctResult = [ 'Aphex Twin' ];
    const distinctMock = sinon.mock().once().
      withArgs('name', {}, {}).resolves(distinctResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        distinct: distinctMock
      });
      serviceProvider = new CliServiceProvider(createClientStub(collectionStub));
    });

    it('executes the command against the database', async() => {
      const result = await serviceProvider.distinct('music', 'bands', 'name');
      expect(result).to.deep.equal(distinctResult);
      (distinctMock as any).verify();
    });
  });

  describe('#estimatedDocumentCount', () => {
    const countResult = 10;
    const countMock = sinon.mock().once().withArgs({}).resolves(countResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        estimatedDocumentCount: countMock
      });
      serviceProvider = new CliServiceProvider(createClientStub(collectionStub));
    });

    it('executes the command against the database', async() => {
      const result = await serviceProvider.estimatedDocumentCount('music', 'bands');
      expect(result).to.deep.equal(countResult);
      (countMock as any).verify();
    });
  });

  describe('#find', () => {
    const filter = { name: 'Aphex Twin' };
    const findResult = [{ name: 'Aphex Twin' }];
    const findMock = sinon.mock().withArgs(filter).
      returns({ toArray: () => Promise.resolve(findResult) });

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        find: findMock
      });
      serviceProvider = new CliServiceProvider(createClientStub(collectionStub));
    });

    it('executes the command against the database', async() => {
      const cursor = await serviceProvider.find('music', 'bands', filter);
      const result = await cursor.toArray();
      expect(result).to.deep.equal(findResult);
      (findMock as any).verify();
    });
  });

  describe('#findAndModify', () => {
    const commandResult = { result: { n: 1, ok: 1 } };
    const findMock = sinon.mock().once().withArgs(
      { query: 1 },
      { sort: 1 },
      { update: 1 },
      { options: 1 }
    ).resolves(commandResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        findAndModify: findMock
      });
      serviceProvider = new CliServiceProvider(createClientStub(collectionStub));
    });

    it('executes the command against the database', async() => {
      const result = await serviceProvider.findAndModify(
        'music', 'bands',
        { query: 1 },
        { sort: 1 },
        { update: 1 },
        { options: 1 }
      );
      expect(result).to.deep.equal(commandResult);
      (findMock as any).verify();
    });
  });

  describe('#findOneAndDelete', () => {
    const commandResult = { result: { n: 1, ok: 1 } };
    const findMock = sinon.mock().once().withArgs({}).resolves(commandResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        findOneAndDelete: findMock
      });
      serviceProvider = new CliServiceProvider(createClientStub(collectionStub));
    });

    it('executes the command against the database', async() => {
      const result = await serviceProvider.findOneAndDelete('music', 'bands', {});
      expect(result).to.deep.equal(commandResult);
      (findMock as any).verify();
    });
  });

  describe('#findOneAndReplace', () => {
    const commandResult = { result: { n: 1, ok: 1 } };
    const filter = { name: 'Aphex Twin' };
    const replacement = { name: 'Richard James' };
    const findMock = sinon.mock().once().withArgs(filter, replacement).
      resolves(commandResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        findOneAndReplace: findMock
      });
      serviceProvider = new CliServiceProvider(createClientStub(collectionStub));
    });

    it('executes the command against the database', async() => {
      const result = await serviceProvider.
        findOneAndReplace('music', 'bands', filter, replacement);
      expect(result).to.deep.equal(commandResult);
      (findMock as any).verify();
    });
  });

  describe('#findOneAndUpdate', () => {
    const commandResult = { result: { n: 1, ok: 1 } };
    const filter = { name: 'Aphex Twin' };
    const update = { $set: { name: 'Richard James' } };
    const findMock = sinon.mock().once().withArgs(filter, update).
      resolves(commandResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        findOneAndUpdate: findMock
      });
      serviceProvider = new CliServiceProvider(createClientStub(collectionStub));
    });

    it('executes the command against the database', async() => {
      const result = await serviceProvider.
        findOneAndUpdate('music', 'bands', filter, update);
      expect(result).to.deep.equal(commandResult);
      (findMock as any).verify();
    });
  });

  describe('#insertMany', () => {
    const doc = { name: 'Aphex Twin' };
    const commandResult = { result: { n: 1, ok: 1 } };
    const insertMock = sinon.mock().once().withArgs([ doc ]).resolves(commandResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        insertMany: insertMock
      });
      serviceProvider = new CliServiceProvider(createClientStub(collectionStub));
    });

    it('executes the command against the database', async() => {
      const result = await serviceProvider.insertMany('music', 'bands', [ doc ]);
      expect(result).to.deep.equal(commandResult);
      (insertMock as any).verify();
    });
  });

  describe('#insertOne', () => {
    const doc = { name: 'Aphex Twin' };
    const commandResult = { result: { n: 1, ok: 1 } };
    const insertMock = sinon.mock().once().withArgs(doc).resolves(commandResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        insertOne: insertMock
      });
      serviceProvider = new CliServiceProvider(createClientStub(collectionStub));
    });

    it('executes the command against the database', async() => {
      const result = await serviceProvider.insertOne('music', 'bands', doc);
      expect(result).to.deep.equal(commandResult);
      (insertMock as any).verify();
    });
  });

  describe('#replaceOne', () => {
    const filter = { name: 'Aphex Twin' };
    const replacement = { name: 'Richard James' };
    const commandResult = { result: { n: 1, ok: 1 } };
    const replaceMock = sinon.mock().once().withArgs(filter, replacement).
      resolves(commandResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        replaceOne: replaceMock
      });
      serviceProvider = new CliServiceProvider(createClientStub(collectionStub));
    });

    it('executes the command against the database', async() => {
      const result = await serviceProvider.replaceOne('music', 'bands', filter, replacement);
      expect(result).to.deep.equal(commandResult);
      (replaceMock as any).verify();
    });
  });

  describe('#runCommand', () => {
    let clientStub;
    let dbStub;
    const commandResult = { ismaster: true };
    const commandMock = sinon.mock().
      withArgs({ ismaster: 1 }).resolves(commandResult);

    beforeEach(() => {
      dbStub = sinon.createStubInstance(Db, {
        command: commandMock
      });
      clientStub = sinon.createStubInstance(MongoClient, {
        db: sinon.stub().returns(dbStub)
      });
      serviceProvider = new CliServiceProvider(clientStub);
    });

    afterEach(() => {
      dbStub = null;
      clientStub = null;
      serviceProvider = null;
    });

    it('executes the command against the database', async() => {
      const result = await serviceProvider.runCommand('admin', { ismaster: 1 });
      expect(result).to.deep.equal(commandResult);
      (commandMock as any).verify();
    });
  });

  describe('#updateOne', () => {
    const filter = { name: 'Aphex Twin' };
    const update = { $set: { name: 'Richard James' } };
    const commandResult = { result: { n: 1, ok: 1 } };
    const updateMock = sinon.mock().once().withArgs(filter, update).
      resolves(commandResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        updateOne: updateMock
      });
      serviceProvider = new CliServiceProvider(createClientStub(collectionStub));
    });

    it('executes the command against the database', async() => {
      const result = await serviceProvider.updateOne('music', 'bands', filter, update);
      expect(result).to.deep.equal(commandResult);
      (updateMock as any).verify();
    });
  });

  describe('#updateMany', () => {
    const filter = { name: 'Aphex Twin' };
    const update = { $set: { name: 'Richard James' } };
    const commandResult = { result: { n: 1, ok: 1 } };
    const updateMock = sinon.mock().once().withArgs(filter, update).
      resolves(commandResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        updateMany: updateMock
      });
      serviceProvider = new CliServiceProvider(createClientStub(collectionStub));
    });

    it('executes the command against the database', async() => {
      const result = await serviceProvider.updateMany('music', 'bands', filter, update);
      expect(result).to.deep.equal(commandResult);
      (updateMock as any).verify();
    });
  });

  describe('#dropDatabase', () => {
    let dropDatabaseMock;
    let clientStub: MongoClient;

    beforeEach(() => {
      dropDatabaseMock = sinon.mock().resolves(true);

      const dbStub = sinon.createStubInstance(Db, {
        dropDatabase: dropDatabaseMock
      });

      clientStub = sinon.createStubInstance(MongoClient, {
        db: sinon.stub().returns(dbStub)
      });

      serviceProvider = new CliServiceProvider(clientStub);
    });

    it('returns ok: 1 if dropped', async() => {
      const result = await serviceProvider.dropDatabase('db1');
      expect(result).to.contain({ ok: 1 });
    });

    it('returns ok: 0 if not dropped', async() => {
      dropDatabaseMock.resolves(false);
      const result = await serviceProvider.dropDatabase('db1');
      expect(result).to.contain({ ok: 0 });
    });

    it('returns dropped: "db name" if dropped', async() => {
      const result = await serviceProvider.dropDatabase('db1');
      expect(result).to.contain({ dropped: 'db1' });
    });

    context('when write concern is omitted', () => {
      it('runs against the database with default write concern', async() => {
        dropDatabaseMock.once().withArgs();
        await serviceProvider.dropDatabase('db1');
        expect((clientStub.db as any).calledOnce);
        expect((clientStub.db as any).calledWith('db1'));
        (dropDatabaseMock as any).verify();
      });
    });

    context('with write concern', () => {
      it('runs against the database passing write concern', async() => {
        dropDatabaseMock.once().withArgs({ w: 1 });
        await serviceProvider.dropDatabase('db1', { w: 1 });
        expect((clientStub.db as any).calledOnce);
        expect((clientStub.db as any).calledWith('db1'));
        (dropDatabaseMock as any).verify();
      });
    });
  });

  describe('#buildInfo', () => {
    let commandMock;
    let dbMock;
    let clientStub: MongoClient;

    const buildInfoResult = {
      version: '4.0.0',
      gitVersion: 'a4b751dcf51dd249c5865812b390cfd1c0129c30',
      javascriptEngine: 'mozjs',
      versionArray: [4, 0, 0, 0],
    };

    beforeEach(() => {
      commandMock = sinon.mock()
        .withArgs({ buildInfo: 1 }, {})
        .resolves(buildInfoResult);

      const dbStub = sinon.createStubInstance(Db, {
        command: commandMock
      });

      dbMock = sinon.mock()
        .withArgs('admin')
        .returns(dbStub);

      clientStub = sinon.createStubInstance(MongoClient, {
        db: dbMock
      });

      serviceProvider = new CliServiceProvider(clientStub);
    });

    it('executes the command against the admin database', async() => {
      const result = await serviceProvider.buildInfo();
      expect(result).to.deep.equal(buildInfoResult);
      (dbMock as any).verify();
      (commandMock as any).verify();
    });
  });

  describe('#getCmdLineOpts', () => {
    let commandMock;
    let dbMock;
    let clientStub: MongoClient;

    const cmdLineOptsResult = {
      argv: [
        '/opt/mongodb-osx-x86_64-enterprise-3.6.3/bin/mongod',
        '--dbpath=/Users/user/testdata'
      ],
      parsed: {
        storage: {
          dbPath: '/Users/user/testdata'
        }
      },
      ok: 1
    };

    beforeEach(() => {
      commandMock = sinon.mock()
        .withArgs({ getCmdLineOpts: 1 }, {})
        .resolves(cmdLineOptsResult);

      const dbStub = sinon.createStubInstance(Db, {
        command: commandMock
      });

      dbMock = sinon.mock()
        .withArgs('admin')
        .returns(dbStub);

      clientStub = sinon.createStubInstance(MongoClient, {
        db: dbMock
      });

      serviceProvider = new CliServiceProvider(clientStub);
    });

    it('executes getCmdLineOpts against an admin db', async() => {
      const result = await serviceProvider.getCmdLineOpts();
      expect(result).to.deep.equal(cmdLineOptsResult);
      (dbMock as any).verify();
      (commandMock as any).verify();
    });
  });

  describe('#convertToCapped', () => {
    let commandMock;
    let dbMock;
    let clientStub: MongoClient;

    beforeEach(() => {
      commandMock = sinon.mock()
        .withArgs({ convertToCapped: 'coll1', size: 1000 })
        .resolves({ ok: 1 });

      const dbStub = sinon.createStubInstance(Db, {
        command: commandMock
      });

      dbMock = sinon.mock()
        .withArgs('db1')
        .returns(dbStub);

      clientStub = sinon.createStubInstance(MongoClient, {
        db: dbMock
      });

      serviceProvider = new CliServiceProvider(clientStub);
    });

    it('executes the command', async() => {
      const result = await serviceProvider.convertToCapped('db1', 'coll1', 1000);
      expect(result).to.deep.equal({ ok: 1 });
      (dbMock as any).verify();
      (commandMock as any).verify();
    });
  });

  describe('#createIndexes', () => {
    let indexSpecs;
    let nativeMethodResult;
    let nativeMethodMock;

    beforeEach(() => {
      indexSpecs = [
        { key: 'x' }
      ];

      nativeMethodResult = {
        createdCollectionAutomatically: false,
        numIndexesBefore: 2,
        numIndexesAfter: 3,
        ok: 1
      };

      nativeMethodMock = sinon.mock().once().withArgs(indexSpecs).
        resolves(nativeMethodResult);

      const collectionStub = sinon.createStubInstance(Collection, {
        createIndexes: nativeMethodMock
      });

      serviceProvider = new CliServiceProvider(createClientStub(collectionStub));
    });

    it('executes the command against the database', async() => {
      const result = await serviceProvider.createIndexes(
        'db1',
        'coll1',
        indexSpecs);
      expect(result).to.deep.equal(nativeMethodResult);
      (nativeMethodMock as any).verify();
    });
  });

  describe('#getIndexes', () => {
    let indexSpecs;
    let nativeMethodResult;
    let nativeMethodMock;

    beforeEach(() => {
      indexSpecs = [
        { key: 'x' }
      ];

      nativeMethodResult = {
        toArray: (): Promise<any[]> => Promise.resolve(indexSpecs)
      };

      nativeMethodMock = sinon.mock().once().withArgs().
        returns(nativeMethodResult);

      const collectionStub = sinon.createStubInstance(Collection, {
        listIndexes: nativeMethodMock
      });

      serviceProvider = new CliServiceProvider(createClientStub(collectionStub));
    });

    it('executes the command against the database', async() => {
      const result = await (serviceProvider as any).getIndexes(
        'db1',
        'coll1'
      );

      expect(result).to.deep.equal(indexSpecs);
      (nativeMethodMock as any).verify();
    });
  });

  describe('#dropIndexes', () => {
    let commandMock;
    let dbMock;
    let clientStub: MongoClient;

    beforeEach(() => {
      commandMock = sinon.mock()
        .withArgs({ dropIndexes: 'coll1', index: ['index-1'] })
        .resolves({ ok: 1 });

      const dbStub = sinon.createStubInstance(Db, {
        command: commandMock
      });

      dbMock = sinon.mock()
        .withArgs('db1')
        .returns(dbStub);

      clientStub = sinon.createStubInstance(MongoClient, {
        db: dbMock
      });

      serviceProvider = new CliServiceProvider(clientStub);
    });

    it('executes the command', async() => {
      const result = await serviceProvider.dropIndexes('db1', 'coll1', ['index-1']);
      expect(result).to.deep.equal({ ok: 1 });
      (dbMock as any).verify();
      (commandMock as any).verify();
    });
  });

  describe('#listCollections', () => {
    let commandMock;
    let dbMock;
    let clientStub: MongoClient;

    beforeEach(() => {
      commandMock = sinon.mock()
        .withArgs({}, {})
        .returns({
          toArray: () => {
            return Promise.resolve([
              {
                name: 'coll1'
              }
            ]);
          }
        });

      const dbStub = sinon.createStubInstance(Db, {
        listCollections: commandMock
      });

      dbMock = sinon.mock()
        .withArgs('db1')
        .returns(dbStub);

      clientStub = sinon.createStubInstance(MongoClient, {
        db: dbMock
      });

      serviceProvider = new CliServiceProvider(clientStub);
    });

    it('executes the command', async() => {
      const result = await serviceProvider.listCollections('db1');
      expect(result).to.deep.equal([
        {
          name: 'coll1'
        }
      ]);

      (dbMock as any).verify();
      (commandMock as any).verify();
    });
  });

  describe('#stats', () => {
    let options;
    let expectedResult;
    let statsMock;

    beforeEach(() => {
      options = { scale: 1 };
      expectedResult = { ok: 1 };
      statsMock = sinon.mock().once().withArgs(options).
        resolves(expectedResult);

      const collectionStub = sinon.createStubInstance(Collection, {
        stats: statsMock
      });
      serviceProvider = new CliServiceProvider(createClientStub(collectionStub));
    });

    it('executes the command against the database', async() => {
      const result = await serviceProvider.stats('db1', 'coll1', options);
      expect(result).to.deep.equal(expectedResult);
      (statsMock as any).verify();
    });
  });

  describe('#reIndex', () => {
    let commandMock;
    let dbMock;
    let clientStub: MongoClient;

    beforeEach(() => {
      commandMock = sinon.mock()
        .withArgs({ reIndex: 'coll1' })
        .resolves({ ok: 1 });

      const dbStub = sinon.createStubInstance(Db, {
        command: commandMock
      });

      dbMock = sinon.mock()
        .withArgs('db1')
        .returns(dbStub);

      clientStub = sinon.createStubInstance(MongoClient, {
        db: dbMock
      });

      serviceProvider = new CliServiceProvider(clientStub);
    });

    it('executes the command against the database', async() => {
      const result = await serviceProvider.reIndex('db1', 'coll1');
      expect(result).to.deep.equal({ ok: 1 });
      (dbMock as any).verify();
      (commandMock as any).verify();
    });
  });

  describe('#renameCollection', () => {
    let commandMock;
    let dbMock;
    let clientStub: MongoClient;

    beforeEach(() => {
      commandMock = sinon.mock()
        .withArgs(
          'coll1',
          'newName',
          {
            dropTarget: true,
            session: 1
          })
        .resolves({ ok: 1 });

      const dbStub = sinon.createStubInstance(Db, {
        renameCollection: commandMock
      });

      dbMock = sinon.mock()
        .withArgs('db1')
        .returns(dbStub);

      clientStub = sinon.createStubInstance(MongoClient, {
        db: dbMock
      });

      serviceProvider = new CliServiceProvider(clientStub);
    });

    it('executes the command against the database', async() => {
      const result = await serviceProvider.renameCollection(
        'db1',
        'coll1',
        'newName',
        { dropTarget: true, session: 1 }
      );
      expect(result).to.deep.equal({ ok: 1 });
      (dbMock as any).verify();
      (commandMock as any).verify();
    });
  });
});
