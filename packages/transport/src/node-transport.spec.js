const NodeTransport = require('./node-transport');
const { MongoClient, Db, Collection } = require('mongodb');
const { expect } = require('chai');
const sinon = require('sinon');

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
const createClientStub = (collectionStub) => {
  const dbStub = sinon.createStubInstance(Db, {
    collection: sinon.stub().returns(collectionStub)
  });
  return sinon.createStubInstance(MongoClient, {
    db: sinon.stub().returns(dbStub)
  });
};

describe('NodeTransport', () => {
  describe('#constructor', () => {
    const mongoClient = sinon.spy();
    const nodeTransport = new NodeTransport(mongoClient);

    it('sets the mongo client on the instance', () => {
      expect(nodeTransport.mongoClient).to.equal(mongoClient);
    });
  });

  describe('#aggregate', () => {
    let nodeTransport;
    const pipeline = [{ $match: { name: 'Aphex Twin' }}];
    const aggResult = [{ name: 'Aphex Twin' }];
    const aggMock = sinon.mock().withArgs(pipeline).
      resolves({ toArray: () => Promise.resolve(aggResult) });

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        aggregate: aggMock
      });
      nodeTransport = new NodeTransport(createClientStub(collectionStub));
    });

    afterEach(() => {
      nodeTransport = null;
    });

    it('executes the command against the database', async() => {
      const cursor = await nodeTransport.aggregate('music', 'bands', pipeline);
      const result = await cursor.toArray();
      expect(result).to.deep.equal(aggResult);
      aggMock.verify();
    });
  });

  describe('#bulkWrite', () => {
    let nodeTransport;
    const requests = [{ insertOne: { name: 'Aphex Twin' }}];
    const commandResult = { result: { nInserted: 1, ok: 1 }};
    const bulkMock = sinon.mock().once().withArgs(requests).resolves(commandResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        bulkWrite: bulkMock
      });
      nodeTransport = new NodeTransport(createClientStub(collectionStub));
    });

    afterEach(() => {
      nodeTransport = null;
    });

    it('executes the command against the database', async() => {
      const result = await nodeTransport.bulkWrite('music', 'bands', requests);
      expect(result).to.deep.equal(commandResult);
      bulkMock.verify();
    });
  });

  describe('#countDocuments', () => {
    let nodeTransport;
    const countResult = 10;
    const countMock = sinon.mock().once().withArgs({}).resolves(countResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        countDocuments: countMock
      });
      nodeTransport = new NodeTransport(createClientStub(collectionStub));
    });

    afterEach(() => {
      nodeTransport = null;
    });

    it('executes the command against the database', async() => {
      const result = await nodeTransport.countDocuments('music', 'bands');
      expect(result).to.deep.equal(countResult);
      countMock.verify();
    });
  });

  describe('#deleteMany', () => {
    let nodeTransport;
    const commandResult = { result: { n: 1, ok: 1 }};
    const deleteMock = sinon.mock().once().withArgs({}).resolves(commandResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        deleteMany: deleteMock
      });
      nodeTransport = new NodeTransport(createClientStub(collectionStub));
    });

    afterEach(() => {
      nodeTransport = null;
    });

    it('executes the command against the database', async() => {
      const result = await nodeTransport.deleteMany('music', 'bands', {});
      expect(result).to.deep.equal(commandResult);
      deleteMock.verify();
    });
  });

  describe('#deleteOne', () => {
    let nodeTransport;
    const commandResult = { result: { n: 1, ok: 1 }};
    const deleteMock = sinon.mock().once().withArgs({}).resolves(commandResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        deleteOne: deleteMock
      });
      nodeTransport = new NodeTransport(createClientStub(collectionStub));
    });

    afterEach(() => {
      nodeTransport = null;
    });

    it('executes the command against the database', async() => {
      const result = await nodeTransport.deleteOne('music', 'bands', {});
      expect(result).to.deep.equal(commandResult);
      deleteMock.verify();
    });
  });

  describe('#distinct', () => {
    let nodeTransport;
    const distinctResult = [ 'Aphex Twin' ];
    const distinctMock = sinon.mock().once().
      withArgs('name', {}, {}).resolves(distinctResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        distinct: distinctMock
      });
      nodeTransport = new NodeTransport(createClientStub(collectionStub));
    });

    afterEach(() => {
      nodeTransport = null;
    });

    it('executes the command against the database', async() => {
      const result = await nodeTransport.distinct('music', 'bands', 'name');
      expect(result).to.deep.equal(distinctResult);
      distinctMock.verify();
    });
  });

  describe('#estimatedDocumentCount', () => {
    let nodeTransport;
    const countResult = 10;
    const countMock = sinon.mock().once().withArgs({}).resolves(countResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        estimatedDocumentCount: countMock
      });
      nodeTransport = new NodeTransport(createClientStub(collectionStub));
    });

    afterEach(() => {
      nodeTransport = null;
    });

    it('executes the command against the database', async() => {
      const result = await nodeTransport.estimatedDocumentCount('music', 'bands');
      expect(result).to.deep.equal(countResult);
      countMock.verify();
    });
  });

  describe('#find', () => {
    let nodeTransport;
    const filter = { name: 'Aphex Twin' };
    const findResult = [{ name: 'Aphex Twin' }];
    const findMock = sinon.mock().withArgs(filter).
      resolves({ toArray: () => Promise.resolve(findResult) });

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        find: findMock
      });
      nodeTransport = new NodeTransport(createClientStub(collectionStub));
    });

    afterEach(() => {
      nodeTransport = null;
    });

    it('executes the command against the database', async() => {
      const cursor = await nodeTransport.find('music', 'bands', filter);
      const result = await cursor.toArray();
      expect(result).to.deep.equal(findResult);
      findMock.verify();
    });
  });

  describe('#findOneAndDelete', () => {
    let nodeTransport;
    const commandResult = { result: { n: 1, ok: 1 }};
    const findMock = sinon.mock().once().withArgs({}).resolves(commandResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        findOneAndDelete: findMock
      });
      nodeTransport = new NodeTransport(createClientStub(collectionStub));
    });

    afterEach(() => {
      nodeTransport = null;
    });

    it('executes the command against the database', async() => {
      const result = await nodeTransport.findOneAndDelete('music', 'bands', {});
      expect(result).to.deep.equal(commandResult);
      findMock.verify();
    });
  });

  describe('#findOneAndReplace', () => {
    let nodeTransport;
    const commandResult = { result: { n: 1, ok: 1 }};
    const filter = { name: 'Aphex Twin' };
    const replacement = { name: 'Richard James' };
    const findMock = sinon.mock().once().withArgs(filter, replacement).
      resolves(commandResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        findOneAndReplace: findMock
      });
      nodeTransport = new NodeTransport(createClientStub(collectionStub));
    });

    afterEach(() => {
      nodeTransport = null;
    });

    it('executes the command against the database', async() => {
      const result = await nodeTransport.
        findOneAndReplace('music', 'bands', filter, replacement);
      expect(result).to.deep.equal(commandResult);
      findMock.verify();
    });
  });

  describe('#findOneAndUpdate', () => {
    let nodeTransport;
    const commandResult = { result: { n: 1, ok: 1 }};
    const filter = { name: 'Aphex Twin' };
    const update = { $set: { name: 'Richard James' }};
    const findMock = sinon.mock().once().withArgs(filter, update).
      resolves(commandResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        findOneAndUpdate: findMock
      });
      nodeTransport = new NodeTransport(createClientStub(collectionStub));
    });

    afterEach(() => {
      nodeTransport = null;
    });

    it('executes the command against the database', async() => {
      const result = await nodeTransport.
        findOneAndUpdate('music', 'bands', filter, update);
      expect(result).to.deep.equal(commandResult);
      findMock.verify();
    });
  });

  describe('#insertMany', () => {
    let nodeTransport;
    const doc = { name: 'Aphex Twin' };
    const commandResult = { result: { n: 1, ok: 1 }};
    const insertMock = sinon.mock().once().withArgs([ doc ]).resolves(commandResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        insertMany: insertMock
      });
      nodeTransport = new NodeTransport(createClientStub(collectionStub));
    });

    afterEach(() => {
      nodeTransport = null;
    });

    it('executes the command against the database', async() => {
      const result = await nodeTransport.insertMany('music', 'bands', [ doc ]);
      expect(result).to.deep.equal(commandResult);
      insertMock.verify();
    });
  });

  describe('#insertOne', () => {
    let nodeTransport;
    const doc = { name: 'Aphex Twin' };
    const commandResult = { result: { n: 1, ok: 1 }};
    const insertMock = sinon.mock().once().withArgs(doc).resolves(commandResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        insertOne: insertMock
      });
      nodeTransport = new NodeTransport(createClientStub(collectionStub));
    });

    afterEach(() => {
      nodeTransport = null;
    });

    it('executes the command against the database', async() => {
      const result = await nodeTransport.insertOne('music', 'bands', doc);
      expect(result).to.deep.equal(commandResult);
      insertMock.verify();
    });
  });

  describe('#replaceOne', () => {
    let nodeTransport;
    const filter = { name: 'Aphex Twin' };
    const replacement = { name: 'Richard James' };
    const commandResult = { result: { n: 1, ok: 1 }};
    const replaceMock = sinon.mock().once().withArgs(filter, replacement).
      resolves(commandResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        replaceOne: replaceMock
      });
      nodeTransport = new NodeTransport(createClientStub(collectionStub));
    });

    afterEach(() => {
      nodeTransport = null;
    });

    it('executes the command against the database', async() => {
      const result = await nodeTransport.replaceOne('music', 'bands', filter, replacement);
      expect(result).to.deep.equal(commandResult);
      replaceMock.verify();
    });
  });

  describe('#runCommand', () => {
    let clientStub;
    let dbStub;
    let nodeTransport;
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
      nodeTransport = new NodeTransport(clientStub);
    });

    afterEach(() => {
      dbStub = null;
      clientStub = null;
      nodeTransport = null;
    });

    it('executes the command against the database', async() => {
      const result = await nodeTransport.runCommand('admin', { ismaster: 1 });
      expect(result).to.deep.equal(commandResult);
      commandMock.verify();
    });
  });

  describe('#updateOne', () => {
    let nodeTransport;
    const filter = { name: 'Aphex Twin' };
    const update = { $set: { name: 'Richard James' }};
    const commandResult = { result: { n: 1, ok: 1 }};
    const updateMock = sinon.mock().once().withArgs(filter, update).
      resolves(commandResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        updateOne: updateMock
      });
      nodeTransport = new NodeTransport(createClientStub(collectionStub));
    });

    afterEach(() => {
      nodeTransport = null;
    });

    it('executes the command against the database', async() => {
      const result = await nodeTransport.updateOne('music', 'bands', filter, update);
      expect(result).to.deep.equal(commandResult);
      updateMock.verify();
    });
  });

  describe('#updateMany', () => {
    let nodeTransport;
    const filter = { name: 'Aphex Twin' };
    const update = { $set: { name: 'Richard James' }};
    const commandResult = { result: { n: 1, ok: 1 }};
    const updateMock = sinon.mock().once().withArgs(filter, update).
      resolves(commandResult);

    beforeEach(() => {
      const collectionStub = sinon.createStubInstance(Collection, {
        updateMany: updateMock
      });
      nodeTransport = new NodeTransport(createClientStub(collectionStub));
    });

    afterEach(() => {
      nodeTransport = null;
    });

    it('executes the command against the database', async() => {
      const result = await nodeTransport.updateMany('music', 'bands', filter, update);
      expect(result).to.deep.equal(commandResult);
      updateMock.verify();
    });
  });
});
