const NodeTransport = require('./node-transport');
const { MongoClient, Db, Collection } = require('mongodb');
const { expect } = require('chai');
const sinon = require('sinon');

describe('NodeTransport', () => {
  describe('#constructor', () => {
    const mongoClient = sinon.spy();
    const nodeTransport = new NodeTransport(mongoClient);

    it('sets the mongo client on the instance', () => {
      expect(nodeTransport.mongoClient).to.equal(mongoClient);
    });
  });

  describe('#aggregate', () => {
    let collectionStub;
    let clientStub;
    let dbStub;
    let nodeTransport;
    const pipeline = [{ $match: { name: 'Aphex Twin' }}];
    const aggResult = [{ name: 'Aphex Twin' }];
    const aggMock = sinon.mock().
                      withArgs(pipeline).
                      resolves({ toArray: () => Promise.resolve(aggResult) })

    beforeEach(() => {
      collectionStub = sinon.createStubInstance(Collection, {
        aggregate: aggMock
      });
      dbStub = sinon.createStubInstance(Db, {
        collection: sinon.stub().returns(collectionStub)
      });
      clientStub = sinon.createStubInstance(MongoClient, {
        db: sinon.stub().returns(dbStub)
      });
      nodeTransport = new NodeTransport(clientStub);
    });

    afterEach(() => {
      collectionStub = null;
      dbStub = null;
      clientStub = null;
      nodeTransport = null;
    });

    it('executes the command against the database', async () => {
      const cursor = await nodeTransport.aggregate('music', 'bands', pipeline);
      const result = await cursor.toArray();
      expect(result).to.deep.equal(aggResult);
      aggMock.verify();
    });
  });

  describe('#countDocuments', () => {
    let collectionStub;
    let clientStub;
    let dbStub;
    let nodeTransport;
    const countResult = 10;
    const countMock = sinon.mock().once().withArgs({}).resolves(countResult);

    beforeEach(() => {
      collectionStub = sinon.createStubInstance(Collection, {
        countDocuments: countMock
      });
      dbStub = sinon.createStubInstance(Db, {
        collection: sinon.stub().returns(collectionStub)
      });
      clientStub = sinon.createStubInstance(MongoClient, {
        db: sinon.stub().returns(dbStub)
      });
      nodeTransport = new NodeTransport(clientStub);
    });

    afterEach(() => {
      collectionStub = null;
      dbStub = null;
      clientStub = null;
      nodeTransport = null;
    });

    it('executes the command against the database', async () => {
      const result = await nodeTransport.countDocuments('music', 'bands');
      expect(result).to.deep.equal(countResult);
      countMock.verify();
    });
  });

  describe('#distinct', () => {
    let collectionStub;
    let clientStub;
    let dbStub;
    let nodeTransport;
    const distinctResult = [ 'Aphex Twin' ];
    const distinctMock = sinon.mock().once().
                          withArgs('name', {}, {}).resolves(distinctResult);

    beforeEach(() => {
      collectionStub = sinon.createStubInstance(Collection, {
        distinct: distinctMock
      });
      dbStub = sinon.createStubInstance(Db, {
        collection: sinon.stub().returns(collectionStub)
      });
      clientStub = sinon.createStubInstance(MongoClient, {
        db: sinon.stub().returns(dbStub)
      });
      nodeTransport = new NodeTransport(clientStub);
    });

    afterEach(() => {
      collectionStub = null;
      dbStub = null;
      clientStub = null;
      nodeTransport = null;
    });

    it('executes the command against the database', async () => {
      const result = await nodeTransport.distinct('music', 'bands', 'name');
      expect(result).to.deep.equal(distinctResult);
      distinctMock.verify();
    });
  });

  describe('#estimatedDocumentCount', () => {
    let collectionStub;
    let clientStub;
    let dbStub;
    let nodeTransport;
    const countResult = 10;
    const countMock = sinon.mock().once().withArgs({}).resolves(countResult);

    beforeEach(() => {
      collectionStub = sinon.createStubInstance(Collection, {
        estimatedDocumentCount: countMock
      });
      dbStub = sinon.createStubInstance(Db, {
        collection: sinon.stub().returns(collectionStub)
      });
      clientStub = sinon.createStubInstance(MongoClient, {
        db: sinon.stub().returns(dbStub)
      });
      nodeTransport = new NodeTransport(clientStub);
    });

    afterEach(() => {
      collectionStub = null;
      dbStub = null;
      clientStub = null;
      nodeTransport = null;
    });

    it('executes the command against the database', async () => {
      const result = await nodeTransport.estimatedDocumentCount('music', 'bands');
      expect(result).to.deep.equal(countResult);
      countMock.verify();
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

    it('executes the command against the database', async () => {
      const result = await nodeTransport.runCommand('admin', { ismaster: 1 });
      expect(result).to.deep.equal(commandResult);
      commandMock.verify();
    });
  });
})
