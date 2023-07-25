import { CommonErrors } from '@mongosh/errors';
import chai, { expect } from 'chai';
import { Collection, Db, MongoClient } from 'mongodb';
import sinonChai from 'sinon-chai';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubInterface } from 'ts-sinon';
import type { DevtoolsConnectOptions } from './cli-service-provider';
import CliServiceProvider from './cli-service-provider';
import ConnectionString from 'mongodb-connection-string-url';
import { EventEmitter } from 'events';
import type {
  ClientEncryption,
  ClientEncryptionDataKeyProvider,
} from '@mongosh/service-provider-core';

chai.use(sinonChai);

export const dummyOptions: DevtoolsConnectOptions = Object.freeze({
  productName: 'Test Product',
  productDocsLink: 'https://example.com/',
});

const DEFAULT_BASE_OPTS = { serializeFunctions: true, promoteLongs: false };

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
const createClientStub = (collectionStub): StubbedInstance<MongoClient> => {
  const clientStub = stubInterface<MongoClient>();
  const dbStub = stubInterface<Db>();
  dbStub.collection.returns(collectionStub);
  clientStub.db.returns(dbStub);
  return clientStub;
};

describe('CliServiceProvider', function () {
  let serviceProvider: CliServiceProvider;
  let collectionStub: StubbedInstance<Collection>;
  let bus: EventEmitter;

  beforeEach(function () {
    bus = new EventEmitter();
  });

  describe('#constructor', function () {
    const mongoClient: any = sinon.spy();
    serviceProvider = new CliServiceProvider(mongoClient, bus, dummyOptions);

    it('sets the mongo client on the instance', function () {
      expect((serviceProvider as any).mongoClient).to.equal(mongoClient);
    });
  });

  describe('#aggregate', function () {
    const pipeline = [{ $match: { name: 'Aphex Twin' } }];
    const aggResult = [{ name: 'Aphex Twin' }];

    beforeEach(function () {
      collectionStub = stubInterface<Collection>();
      collectionStub.aggregate.returns({
        toArray: () => Promise.resolve(aggResult),
      } as any);
      serviceProvider = new CliServiceProvider(
        createClientStub(collectionStub),
        bus,
        dummyOptions
      );
    });

    it('executes the command against the database', async function () {
      const cursor = serviceProvider.aggregate('music', 'bands', pipeline);
      const result = await cursor.toArray();
      expect(result).to.deep.equal(aggResult);
      expect(collectionStub.aggregate).to.have.been.calledWith(pipeline);
    });
  });

  describe('#bulkWrite', function () {
    const requests = [{ insertOne: { name: 'Aphex Twin' } } as any];
    const commandResult = { result: { nInserted: 1, ok: 1 } };

    beforeEach(function () {
      collectionStub = stubInterface<Collection>();
      collectionStub.bulkWrite.resolves(commandResult as any);
      serviceProvider = new CliServiceProvider(
        createClientStub(collectionStub),
        bus,
        dummyOptions
      );
    });

    it('executes the command against the database', async function () {
      const result = await serviceProvider.bulkWrite(
        'music',
        'bands',
        requests
      );
      expect(result).to.deep.equal(commandResult);
      expect(collectionStub.bulkWrite).to.have.been.calledWith(requests);
    });
  });

  describe('#countDocuments', function () {
    const countResult = 10;

    beforeEach(function () {
      collectionStub = stubInterface<Collection>();
      collectionStub.countDocuments.resolves(countResult);
      serviceProvider = new CliServiceProvider(
        createClientStub(collectionStub),
        bus,
        dummyOptions
      );
    });

    it('executes the command against the database', async function () {
      const result = await serviceProvider.countDocuments('music', 'bands');
      expect(result).to.deep.equal(countResult);
      expect(collectionStub.countDocuments).to.have.been.calledWith({});
    });
  });

  describe('#deleteMany', function () {
    const commandResult = { result: { n: 1, ok: 1 } };

    beforeEach(function () {
      collectionStub = stubInterface<Collection>();
      collectionStub.deleteMany.resolves(commandResult as any);
      serviceProvider = new CliServiceProvider(
        createClientStub(collectionStub),
        bus,
        dummyOptions
      );
    });

    it('executes the command against the database', async function () {
      const result = await serviceProvider.deleteMany('music', 'bands', {});
      expect(result).to.deep.equal(commandResult);
      expect(collectionStub.deleteMany).to.have.been.calledWith({});
    });
  });

  describe('#deleteOne', function () {
    const commandResult = { result: { n: 1, ok: 1 } };

    beforeEach(function () {
      collectionStub = stubInterface<Collection>();
      collectionStub.deleteOne.resolves(commandResult as any);
      serviceProvider = new CliServiceProvider(
        createClientStub(collectionStub),
        bus,
        dummyOptions
      );
    });

    it('executes the command against the database', async function () {
      const result = await serviceProvider.deleteOne('music', 'bands', {});
      expect(result).to.deep.equal(commandResult);
      expect(collectionStub.deleteOne).to.have.been.calledWith({});
    });
  });

  describe('#distinct', function () {
    const distinctResult = ['Aphex Twin'];

    beforeEach(function () {
      collectionStub = stubInterface<Collection>();
      collectionStub.distinct.resolves(distinctResult);
      serviceProvider = new CliServiceProvider(
        createClientStub(collectionStub),
        bus,
        dummyOptions
      );
    });

    it('executes the command against the database', async function () {
      const result = await serviceProvider.distinct('music', 'bands', 'name');
      expect(result).to.deep.equal(distinctResult);
      expect(collectionStub.distinct).to.have.been.calledWith(
        'name',
        {},
        DEFAULT_BASE_OPTS
      );
    });
  });

  describe('#estimatedDocumentCount', function () {
    const countResult = 10;

    beforeEach(function () {
      collectionStub = stubInterface<Collection>();
      collectionStub.estimatedDocumentCount.resolves(countResult);
      serviceProvider = new CliServiceProvider(
        createClientStub(collectionStub),
        bus,
        dummyOptions
      );
    });

    it('executes the command against the database', async function () {
      const result = await serviceProvider.estimatedDocumentCount(
        'music',
        'bands'
      );
      expect(result).to.deep.equal(countResult);
      expect(collectionStub.estimatedDocumentCount).to.have.been.calledWith(
        DEFAULT_BASE_OPTS
      );
    });
  });

  describe('#find', function () {
    const filter = { name: 'Aphex Twin' };
    const findResult = [{ name: 'Aphex Twin' }];

    beforeEach(function () {
      collectionStub = stubInterface<Collection>();
      collectionStub.find.returns({
        toArray: () => Promise.resolve(findResult),
      } as any);
      serviceProvider = new CliServiceProvider(
        createClientStub(collectionStub),
        bus,
        dummyOptions
      );
    });

    it('executes the command against the database', async function () {
      const cursor = serviceProvider.find('music', 'bands', filter);
      const result = await cursor.toArray();
      expect(result).to.deep.equal(findResult);
      expect(collectionStub.find).to.have.been.calledWith(filter);
    });
  });
  describe('#find with options', function () {
    const filter = { name: 'Aphex Twin' };
    const findResult = [{ name: 'Aphex Twin' }];
    const options = {
      allowPartialResults: true,
      noCursorTimeout: true,
      tailable: true,
    };

    beforeEach(function () {
      collectionStub = stubInterface<Collection>();
      collectionStub.find.returns({
        toArray: () => Promise.resolve(findResult),
      } as any);
      serviceProvider = new CliServiceProvider(
        createClientStub(collectionStub),
        bus,
        dummyOptions
      );
    });

    it('executes the command against the database', async function () {
      const cursor = serviceProvider.find('music', 'bands', filter, options);
      const result = await cursor.toArray();
      expect(result).to.deep.equal(findResult);
      expect(collectionStub.find).to.have.been.calledWith(filter, {
        ...DEFAULT_BASE_OPTS,
        ...options,
        partial: true,
        timeout: true,
      });
    });
  });

  describe('#findOneAndDelete', function () {
    const commandResult = { result: { n: 1, ok: 1 } };

    beforeEach(function () {
      collectionStub = stubInterface<Collection>();
      collectionStub.findOneAndDelete.resolves(commandResult as any);
      serviceProvider = new CliServiceProvider(
        createClientStub(collectionStub),
        bus,
        dummyOptions
      );
    });

    it('executes the command against the database', async function () {
      const result = await serviceProvider.findOneAndDelete(
        'music',
        'bands',
        {}
      );
      expect(result).to.deep.equal(commandResult);
      expect(collectionStub.findOneAndDelete).to.have.been.calledWith({});
    });
  });

  describe('#findOneAndReplace', function () {
    const commandResult = { result: { n: 1, ok: 1 } };
    const filter = { name: 'Aphex Twin' };
    const replacement = { name: 'Richard James' };

    beforeEach(function () {
      collectionStub = stubInterface<Collection>();
      collectionStub.findOneAndReplace.resolves(commandResult as any);
      serviceProvider = new CliServiceProvider(
        createClientStub(collectionStub),
        bus,
        dummyOptions
      );
    });

    it('executes the command against the database', async function () {
      const result = await serviceProvider.findOneAndReplace(
        'music',
        'bands',
        filter,
        replacement
      );
      expect(result).to.deep.equal(commandResult);
      expect(collectionStub.findOneAndReplace).to.have.been.calledWith(
        filter,
        replacement
      );
    });
  });

  describe('#findOneAndUpdate', function () {
    const commandResult = { result: { n: 1, ok: 1 } };
    const filter = { name: 'Aphex Twin' };
    const update = { $set: { name: 'Richard James' } };

    beforeEach(function () {
      collectionStub = stubInterface<Collection>();
      collectionStub.findOneAndUpdate.resolves(commandResult as any);
      serviceProvider = new CliServiceProvider(
        createClientStub(collectionStub),
        bus,
        dummyOptions
      );
    });

    it('executes the command against the database', async function () {
      const result = await serviceProvider.findOneAndUpdate(
        'music',
        'bands',
        filter,
        update
      );
      expect(result).to.deep.equal(commandResult);
      expect(collectionStub.findOneAndUpdate).to.have.been.calledWith(
        filter,
        update
      );
    });
  });

  describe('#insertMany', function () {
    const doc = { name: 'Aphex Twin' };
    const commandResult = { result: { n: 1, ok: 1 } };

    beforeEach(function () {
      collectionStub = stubInterface<Collection>();
      collectionStub.insertMany.resolves(commandResult as any);
      serviceProvider = new CliServiceProvider(
        createClientStub(collectionStub),
        bus,
        dummyOptions
      );
    });

    it('executes the command against the database', async function () {
      const result = await serviceProvider.insertMany('music', 'bands', [doc]);
      expect(result).to.deep.equal(commandResult);
      expect(collectionStub.insertMany).to.have.been.calledWith([doc]);
    });
  });

  describe('#insertOne', function () {
    const doc = { name: 'Aphex Twin' };
    const commandResult = { result: { n: 1, ok: 1 } };

    beforeEach(function () {
      collectionStub = stubInterface<Collection>();
      collectionStub.insertOne.resolves(commandResult as any);
      serviceProvider = new CliServiceProvider(
        createClientStub(collectionStub),
        bus,
        dummyOptions
      );
    });

    it('executes the command against the database', async function () {
      const result = await serviceProvider.insertOne('music', 'bands', doc);
      expect(result).to.deep.equal(commandResult);
      expect(collectionStub.insertOne).to.have.been.calledWith(doc);
    });
  });

  describe('#replaceOne', function () {
    const filter = { name: 'Aphex Twin' };
    const replacement = { name: 'Richard James' };
    const commandResult = { result: { n: 1, ok: 1 } };

    beforeEach(function () {
      collectionStub = stubInterface<Collection>();
      collectionStub.replaceOne.resolves(commandResult);
      serviceProvider = new CliServiceProvider(
        createClientStub(collectionStub),
        bus,
        dummyOptions
      );
    });

    it('executes the command against the database', async function () {
      const result = await serviceProvider.replaceOne(
        'music',
        'bands',
        filter,
        replacement
      );
      expect(result).to.deep.equal(commandResult);
      expect(collectionStub.replaceOne).to.have.been.calledWith(
        filter,
        replacement
      );
    });
  });

  describe('#runCommand', function () {
    let clientStub: any;
    let dbStub: any;
    const commandResult = { ismaster: true };

    beforeEach(function () {
      dbStub = stubInterface<Db>();
      clientStub = stubInterface<MongoClient>();
      dbStub.command.resolves(commandResult);
      clientStub.db.returns(dbStub);
      serviceProvider = new CliServiceProvider(clientStub, bus, dummyOptions);
    });

    afterEach(function () {
      dbStub = null;
      clientStub = null;
      serviceProvider = null;
    });

    it('executes the command against the database', async function () {
      const result = await serviceProvider.runCommand('admin', { ismaster: 1 });
      expect(result).to.deep.equal(commandResult);
      expect(dbStub.command).to.have.been.calledWith({ ismaster: 1 });
    });
  });

  describe('#runCommandWithCheck', function () {
    let clientStub: any;
    let dbStub: any;
    const commandResult = { ok: 0 };

    beforeEach(function () {
      dbStub = stubInterface<Db>();
      clientStub = stubInterface<MongoClient>();
      dbStub.command.resolves(commandResult);
      clientStub.db.returns(dbStub);
      serviceProvider = new CliServiceProvider(clientStub, bus, dummyOptions);
    });

    afterEach(function () {
      dbStub = null;
      clientStub = null;
      serviceProvider = null;
    });

    it('executes the command against the database and throws if ok: 0', async function () {
      try {
        await serviceProvider.runCommandWithCheck('admin', { ismaster: 1 });
      } catch (e: any) {
        expect(e.message).to.include(JSON.stringify({ ismaster: 1 }));
        expect(e.name).to.equal('MongoshCommandFailed');
        expect(e.code).to.equal(CommonErrors.CommandFailed);
        return;
      }
      expect.fail('Error not thrown');
    });
  });

  describe('#runCursorCommand', function () {
    let clientStub: any;
    let dbStub: any;
    const commandResult = 'a-cursor';

    beforeEach(function () {
      dbStub = stubInterface<Db>();
      clientStub = stubInterface<MongoClient>();
      dbStub.runCursorCommand.returns(commandResult);
      clientStub.db.returns(dbStub);
      serviceProvider = new CliServiceProvider(clientStub, bus, dummyOptions);
    });

    afterEach(function () {
      dbStub = null;
      clientStub = null;
      serviceProvider = null;
    });

    it('executes the command against the database', function () {
      const result = serviceProvider.runCursorCommand('admin', {
        checkMetadataConsistency: 1,
      });
      expect(result).to.deep.equal(commandResult);
      expect(dbStub.runCursorCommand).to.have.been.calledWith({
        checkMetadataConsistency: 1,
      });
    });
  });

  describe('#updateOne', function () {
    const filter = { name: 'Aphex Twin' };
    const update = { $set: { name: 'Richard James' } };
    const commandResult = { result: { n: 1, ok: 1 } };

    beforeEach(function () {
      collectionStub = stubInterface<Collection>();
      collectionStub.updateOne.resolves(commandResult as any);
      serviceProvider = new CliServiceProvider(
        createClientStub(collectionStub),
        bus,
        dummyOptions
      );
    });

    it('executes the command against the database', async function () {
      const result = await serviceProvider.updateOne(
        'music',
        'bands',
        filter,
        update
      );
      expect(result).to.deep.equal(commandResult);
      expect(collectionStub.updateOne).to.have.been.calledWith(filter, update);
    });
  });

  describe('#updateMany', function () {
    const filter = { name: 'Aphex Twin' };
    const update = { $set: { name: 'Richard James' } };
    const commandResult = { result: { n: 1, ok: 1 } };

    beforeEach(function () {
      collectionStub = stubInterface<Collection>();
      collectionStub.updateMany.resolves(commandResult as any);
      serviceProvider = new CliServiceProvider(
        createClientStub(collectionStub),
        bus,
        dummyOptions
      );
    });

    it('executes the command against the database', async function () {
      const result = await serviceProvider.updateMany(
        'music',
        'bands',
        filter,
        update
      );
      expect(result).to.deep.equal(commandResult);
      expect(collectionStub.updateMany).to.have.been.calledWith(filter, update);
    });
  });

  describe('#dropDatabase', function () {
    let clientStub: StubbedInstance<MongoClient>;
    let dbStub: StubbedInstance<Db>;

    beforeEach(function () {
      dbStub = stubInterface<Db>();
      clientStub = stubInterface<MongoClient>();
      clientStub.db.returns(dbStub);

      serviceProvider = new CliServiceProvider(clientStub, bus, dummyOptions);
    });

    it('returns ok: 1 if dropped', async function () {
      dbStub.dropDatabase.resolves(true);
      const result = await serviceProvider.dropDatabase('db1');
      expect(result).to.contain({ ok: 1 });
    });

    it('returns ok: 0 if not dropped', async function () {
      dbStub.dropDatabase.resolves(false);
      const result = await serviceProvider.dropDatabase('db1');
      expect(result).to.contain({ ok: 0 });
    });

    it('returns dropped: "db name" if dropped', async function () {
      dbStub.dropDatabase.resolves(true);
      const result = await serviceProvider.dropDatabase('db1');
      expect(result).to.contain({ dropped: 'db1' });
    });

    context('when write concern is omitted', function () {
      it('runs against the database with default write concern', async function () {
        dbStub.dropDatabase.resolves(true);
        await serviceProvider.dropDatabase('db1');
        expect(clientStub.db).to.have.been.calledOnceWith('db1');
      });
    });

    context('with write concern', function () {
      it('runs against the database passing write concern', async function () {
        const opts = { serializeFunctions: true, w: 1 };
        dbStub.dropDatabase.resolves(true);
        await serviceProvider.dropDatabase('db1', opts);
        expect(clientStub.db).to.have.been.calledOnceWith('db1');
      });
    });
  });

  describe('#createIndexes', function () {
    let indexSpecs;
    let nativeMethodResult;

    beforeEach(function () {
      indexSpecs = [{ key: 'x' }];

      nativeMethodResult = {
        createdCollectionAutomatically: false,
        numIndexesBefore: 2,
        numIndexesAfter: 3,
        ok: 1,
      };

      collectionStub = stubInterface<Collection>();
      collectionStub.createIndexes.resolves(nativeMethodResult);
      serviceProvider = new CliServiceProvider(
        createClientStub(collectionStub),
        bus,
        dummyOptions
      );
    });

    it('executes the command against the database', async function () {
      const result = await serviceProvider.createIndexes(
        'db1',
        'coll1',
        indexSpecs
      );
      expect(result).to.deep.equal(nativeMethodResult);
      expect(collectionStub.createIndexes).to.have.been.calledWith(indexSpecs);
    });
  });

  describe('#getIndexes', function () {
    let indexSpecs;
    let nativeMethodResult;

    beforeEach(function () {
      indexSpecs = [{ key: 'x' }];

      nativeMethodResult = {
        toArray: (): Promise<any[]> => Promise.resolve(indexSpecs),
      };

      collectionStub = stubInterface<Collection>();
      collectionStub.listIndexes.returns(nativeMethodResult);

      serviceProvider = new CliServiceProvider(
        createClientStub(collectionStub),
        bus,
        dummyOptions
      );
    });

    it('executes the command against the database', async function () {
      const result = await serviceProvider.getIndexes('db1', 'coll1');

      expect(result).to.deep.equal(indexSpecs);
      expect(collectionStub.listIndexes).to.have.been.calledWith(
        DEFAULT_BASE_OPTS
      );
    });
  });

  describe('#listCollections', function () {
    let dbStub: StubbedInstance<Db>;
    let clientStub: StubbedInstance<MongoClient>;

    beforeEach(function () {
      dbStub = stubInterface<Db>();
      clientStub = stubInterface<MongoClient>();
      dbStub.listCollections.returns({
        toArray: () => {
          return Promise.resolve([
            {
              name: 'coll1',
            },
          ]);
        },
      } as any);
      clientStub.db.returns(dbStub);
      serviceProvider = new CliServiceProvider(clientStub, bus, dummyOptions);
    });

    it('executes the command', async function () {
      const result = await serviceProvider.listCollections('db1');
      expect(result).to.deep.equal([
        {
          name: 'coll1',
        },
      ]);

      expect(dbStub.listCollections).to.have.been.calledWith(
        {},
        DEFAULT_BASE_OPTS
      );
      expect(clientStub.db).to.have.been.calledWith('db1');
    });
  });

  describe('#renameCollection', function () {
    let dbStub: StubbedInstance<Db>;
    let clientStub: StubbedInstance<MongoClient>;

    beforeEach(function () {
      dbStub = stubInterface<Db>();
      clientStub = stubInterface<MongoClient>();
      dbStub.renameCollection.resolves({ ok: 1 } as any);
      clientStub.db.returns(dbStub);
      serviceProvider = new CliServiceProvider(clientStub, bus, dummyOptions);
    });

    it('executes the command against the database', async function () {
      const result = await serviceProvider.renameCollection(
        'db1',
        'coll1',
        'newName',
        { dropTarget: true, session: {} as any }
      );
      expect(result).to.deep.equal({ ok: 1 });
      expect(dbStub.renameCollection).to.have.been.calledOnceWith(
        'coll1',
        'newName',
        {
          ...DEFAULT_BASE_OPTS,
          dropTarget: true,
          session: {},
        }
      );
      expect(clientStub.db).to.have.been.calledOnceWith('db1');
    });
  });

  describe('#createCollection', function () {
    let dbStub: StubbedInstance<Db>;
    let clientStub: StubbedInstance<MongoClient>;

    beforeEach(function () {
      dbStub = stubInterface<Db>();
      clientStub = stubInterface<MongoClient>();
      dbStub.createCollection.resolves({} as any);
      clientStub.db.returns(dbStub);
      serviceProvider = new CliServiceProvider(clientStub, bus, dummyOptions);
    });

    it('executes the command', async function () {
      const result = await serviceProvider.createCollection(
        'db1',
        'newcoll',
        {}
      );
      expect(result).to.deep.equal({ ok: 1 });
      expect(dbStub.createCollection).to.have.been.calledOnceWith(
        'newcoll',
        DEFAULT_BASE_OPTS
      );
      expect(clientStub.db).to.have.been.calledOnceWith('db1');
    });
  });

  describe('#createEncryptedCollection', function () {
    let dbStub: StubbedInstance<Db>;
    let clientStub: StubbedInstance<MongoClient>;
    let libmongoc: StubbedInstance<ClientEncryption>;
    const createCollOptions = {
      provider: 'local' as ClientEncryptionDataKeyProvider,
      createCollectionOptions: {
        encryptedFields: {
          fields: [
            {
              path: 'ssn',
              bsonType: 'string',
            },
          ],
        },
      },
    };

    beforeEach(function () {
      dbStub = stubInterface<Db>();
      clientStub = stubInterface<MongoClient>();
      clientStub.db.returns(dbStub);
      serviceProvider = new CliServiceProvider(clientStub, bus, dummyOptions);
      libmongoc = stubInterface<ClientEncryption>();
    });

    it('calls calls libmongocrypt.createEncryptedCollection', async function () {
      await serviceProvider.createEncryptedCollection(
        'db1',
        'coll1',
        createCollOptions,
        libmongoc
      );
      expect(libmongoc.createEncryptedCollection).calledOnceWithExactly(
        dbStub,
        'coll1',
        createCollOptions
      );
    });

    it('returns whatever libmongocrypt.createEncryptedCollection returns', async function () {
      const resolvedValue = {
        collection: { name: 'secretCol' },
        encryptedFields: [],
      } as any;
      libmongoc.createEncryptedCollection.resolves(resolvedValue);
      const returnValue = await serviceProvider.createEncryptedCollection(
        'db1',
        'coll1',
        createCollOptions,
        libmongoc
      );
      expect(returnValue).to.deep.equal(resolvedValue);
    });
  });

  describe('sessions', function () {
    let clientStub: StubbedInstance<MongoClient>;
    let serviceProvider: CliServiceProvider;
    let db: StubbedInstance<Db>;
    let driverSession;
    beforeEach(function () {
      clientStub = stubInterface<MongoClient>();
      serviceProvider = new CliServiceProvider(clientStub, bus, dummyOptions);
      driverSession = { dSession: 1 };
      clientStub.startSession.returns(driverSession);
      db = stubInterface<Db>();
      clientStub.db.returns(db);
    });
    describe('startSession', function () {
      it('calls startSession without args', function () {
        const opts = {};
        const result = serviceProvider.startSession(opts);
        expect(clientStub.startSession).to.have.been.calledOnceWith(opts);
        expect(result).to.equal(driverSession);
      });
    });
  });

  describe('#watch', function () {
    let options;
    let expectedResult;
    let watchMock;
    let watchMock2;
    let watchMock3;
    let pipeline;

    beforeEach(function () {
      pipeline = [{ $match: { operationType: 'insertOne' } }];
      options = { batchSize: 1 };
      expectedResult = { ChangeStream: 1 };

      watchMock = sinon
        .mock()
        .once()
        .withArgs(pipeline, options)
        .returns(expectedResult);
      watchMock2 = sinon
        .mock()
        .once()
        .withArgs(pipeline, options)
        .returns(expectedResult);
      watchMock3 = sinon
        .mock()
        .once()
        .withArgs(pipeline, options)
        .returns(expectedResult);

      const collectionStub = sinon.createStubInstance(Collection, {
        watch: watchMock3,
      });
      const dbStub = sinon.createStubInstance(Db, {
        watch: watchMock2,
        collection: sinon.stub().returns(collectionStub) as any,
      });
      const clientStub = sinon.createStubInstance(MongoClient, {
        db: sinon.stub().returns(dbStub) as any,
        watch: watchMock,
      }) as any;

      serviceProvider = new CliServiceProvider(clientStub, bus, dummyOptions);
    });

    it('executes watch on MongoClient', function () {
      const result = serviceProvider.watch(pipeline, options);
      expect(result).to.deep.equal(expectedResult);
      (watchMock as any).verify();
    });
    it('executes watch on Db', function () {
      const result = serviceProvider.watch(pipeline, options, {}, 'dbname');
      expect(result).to.deep.equal(expectedResult);
      (watchMock2 as any).verify();
    });
    it('executes watch on collection', function () {
      const result = serviceProvider.watch(
        pipeline,
        options,
        {},
        'dbname',
        'collname'
      );
      expect(result).to.deep.equal(expectedResult);
      (watchMock3 as any).verify();
    });
  });

  describe('#getConnectionInfo', function () {
    let clientStub: any;
    let dbStub: StubbedInstance<Db>;

    beforeEach(function () {
      dbStub = stubInterface<Db>();
      clientStub = stubInterface<MongoClient>();
      // eslint-disable-next-line @typescript-eslint/require-await
      dbStub.command.callsFake(async () => {
        return { ok: 1 };
      });
      clientStub.db.returns(dbStub);
      clientStub.topology = { s: {} };
      serviceProvider = new CliServiceProvider(
        clientStub,
        bus,
        dummyOptions,
        new ConnectionString('mongodb://localhost/')
      );
      serviceProvider.getNewConnection = () => Promise.resolve(serviceProvider);
    });

    afterEach(function () {
      dbStub = null;
      clientStub = null;
      serviceProvider = null;
    });

    it('returns some connection info data', async function () {
      const info = await serviceProvider.getConnectionInfo();
      expect(info.extraInfo.is_atlas).to.equal(false);
      expect(info.extraInfo.is_localhost).to.equal(true);
      expect(info.extraInfo.fcv).to.equal(undefined);
      expect(dbStub.command).to.have.callCount(3);
    });

    context('when connected to a DocumentDB deployment', function () {
      it('correctly gathers info on the fake deployment', async function () {
        const serviceProvider = new CliServiceProvider(
          clientStub,
          bus,
          dummyOptions,
          new ConnectionString(
            'mongodb://elastic-docdb-123456789.eu-central-1.docdb-elastic.amazonaws.com:27017'
          )
        );

        const info = await serviceProvider.getConnectionInfo();
        expect(info.extraInfo.is_genuine).to.be.false;
        expect(info.extraInfo.non_genuine_server_name).to.equal('documentdb');
      });
    });

    context('when connected to a CosmosDB deployment', function () {
      it('correctly gathers info on the fake deployment', async function () {
        const serviceProvider = new CliServiceProvider(
          clientStub,
          bus,
          dummyOptions,
          new ConnectionString(
            'mongodb+srv://compass-vcore.mongocluster.cosmos.azure.com'
          )
        );

        const info = await serviceProvider.getConnectionInfo();
        expect(info.extraInfo.is_genuine).to.be.false;
        expect(info.extraInfo.non_genuine_server_name).to.equal('cosmosdb');
      });
    });
  });

  describe('processDriverOptions', function () {
    it('shares user configuration options from an existing CliServiceProvider instance', function () {
      const cloneableOidcOptions = {
        redirectURI: 'http://localhost',
        openBrowser: { command: '/usr/bin/browser' },
        notifyDeviceFlow: () => {},
        allowedFlows: ['device-auth'],
      };
      const productInfo = {
        productDocsLink: 'https://example.com',
        productName: 'test',
      };
      expect(
        CliServiceProvider.prototype.processDriverOptions.call(
          {
            currentClientOptions: {
              oidc: {
                ...cloneableOidcOptions,
                throwOnIncompatibleSerializedState: true,
              },
              ...productInfo,
              readConcern: 'local',
            } as DevtoolsConnectOptions,
            uri: new ConnectionString('mongodb://localhost/'),
          } as any,
          new ConnectionString('mongodb://localhost/'),
          {}
        )
      ).to.deep.equal({
        oidc: { ...cloneableOidcOptions },
        ...productInfo,
      });
    });

    it('shares OIDC state if the auth options match', function () {
      const parentState: any = {};

      expect(
        CliServiceProvider.prototype.processDriverOptions.call(
          {
            uri: new ConnectionString('mongodb://localhost/'),
            currentClientOptions: {
              auth: { username: 'meow' },
              parentState,
            },
          },
          new ConnectionString('mongodb://localhost'),
          { auth: { username: 'meow' } }
        ).parentState
      ).to.equal(parentState);
    });

    it('does not share OIDC state if the auth options mismatch', function () {
      const parentState: any = {};

      expect(
        CliServiceProvider.prototype.processDriverOptions.call(
          {
            uri: new ConnectionString('mongodb://localhost/'),
            currentClientOptions: {
              auth: { username: 'meow' },
              parentState,
            },
          },
          new ConnectionString('mongodb://localhost'),
          { auth: { username: 'moo' } }
        ).parentState
      ).to.equal(undefined);
    });

    it('does not share OIDC state if the endpoints mismatch', function () {
      const parentState: any = {};

      expect(
        CliServiceProvider.prototype.processDriverOptions.call(
          {
            uri: new ConnectionString('mongodb://localhost/'),
            currentClientOptions: {
              auth: { username: 'meow' },
              parentState,
            },
          },
          new ConnectionString('mongodb://localghost'),
          { auth: { username: 'meow' } }
        ).parentState
      ).to.equal(undefined);
    });
  });

  describe('#getSearchIndexes', function () {
    let descriptions;
    let nativeMethodResult;
    let getSearchIndexesOptions;

    beforeEach(function () {
      descriptions = [{ name: 'foo' }, { name: 'bar' }];

      nativeMethodResult = {
        toArray: () => {
          return Promise.resolve(descriptions);
        },
      };

      getSearchIndexesOptions = { allowDiskUse: true };

      collectionStub = stubInterface<Collection>();
      collectionStub.listSearchIndexes.returns(nativeMethodResult);
      serviceProvider = new CliServiceProvider(
        createClientStub(collectionStub),
        bus,
        dummyOptions
      );
    });

    context('without indexName', function () {
      it('calls listSearchIndexes and toArray on the resulting cursor', async function () {
        const result = await serviceProvider.getSearchIndexes(
          'db1',
          'coll1',
          null,
          getSearchIndexesOptions
        );
        expect(result).to.deep.equal(descriptions);
        expect(collectionStub.listSearchIndexes).to.have.been.calledWith(
          null,
          getSearchIndexesOptions
        );
      });
    });

    context('with indexName', function () {
      it('calls listSearchIndexes and toArray on the resulting cursor', async function () {
        const result = await serviceProvider.getSearchIndexes(
          'db1',
          'coll1',
          'my-index',
          getSearchIndexesOptions
        );
        expect(result).to.deep.equal(descriptions);
        expect(collectionStub.listSearchIndexes).to.have.been.calledWith(
          'my-index',
          getSearchIndexesOptions
        );
      });
    });
  });

  describe('#createSearchIndexes', function () {
    let descriptions;
    let nativeMethodResult;

    beforeEach(function () {
      descriptions = [
        { name: 'foo', definition: {} },
        { name: 'bar', definition: {} },
      ];

      nativeMethodResult = ['index_1'];

      collectionStub = stubInterface<Collection>();
      collectionStub.createSearchIndexes.resolves(nativeMethodResult);
      serviceProvider = new CliServiceProvider(
        createClientStub(collectionStub),
        bus,
        dummyOptions
      );
    });

    it('executes the command against the database', async function () {
      const result = await serviceProvider.createSearchIndexes(
        'db1',
        'coll1',
        descriptions
      );
      expect(result).to.deep.equal(nativeMethodResult);
      expect(collectionStub.createSearchIndexes).to.have.been.calledWith(
        descriptions
      );
    });
  });

  describe('#dropSearchIndex', function () {
    let indexName;

    beforeEach(function () {
      indexName = 'foo';

      collectionStub = stubInterface<Collection>();
      collectionStub.dropSearchIndex.resolves();
      serviceProvider = new CliServiceProvider(
        createClientStub(collectionStub),
        bus,
        dummyOptions
      );
    });

    it('executes the command against the database', async function () {
      const result = await serviceProvider.dropSearchIndex(
        'db1',
        'coll1',
        indexName
      );
      expect(result).to.deep.equal(undefined);
      expect(collectionStub.dropSearchIndex).to.have.been.calledWith(indexName);
    });
  });

  describe('#updateSearchIndex', function () {
    let indexName;
    let description;

    beforeEach(function () {
      indexName = 'foo';
      description = { x: 1, y: 2 };

      collectionStub = stubInterface<Collection>();

      collectionStub.updateSearchIndex.resolves();
      serviceProvider = new CliServiceProvider(
        createClientStub(collectionStub),
        bus,
        dummyOptions
      );
    });

    it('executes the command against the database', async function () {
      const result = await serviceProvider.updateSearchIndex(
        'db1',
        'coll1',
        indexName,
        description
      );
      expect(result).to.deep.equal(undefined);
      expect(collectionStub.updateSearchIndex).to.have.been.calledWith(
        indexName,
        description
      );
    });
  });
});
