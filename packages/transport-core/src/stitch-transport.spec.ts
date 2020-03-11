import StitchTransport from './stitch-transport';
import { expect } from 'chai';
import sinon from 'sinon';
import StitchClient from '../lib/stitch-client';
import StitchMongoClient from '../lib/stitch-mongo-client';

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
  const dbStub = {
    collection: sinon.stub().returns(collectionStub)
  };
  return {
    db: sinon.stub().returns(dbStub)
  };
};

const createStitchClientStub = (): StitchClient => ({auth: null});
const createMongoClientStub = (): StitchMongoClient => ({db: () => {}});

describe('StitchTransport', () => {
  const stitchClient = createStitchClientStub();

  describe('#constructor', () => {
    const mongoClient = createMongoClientStub();
    const stitchTransport = new StitchTransport(stitchClient, mongoClient);

    it('sets the mongo client on the instance', () => {
      expect(stitchTransport.mongoClient).to.equal(mongoClient);
    });

    it('sets the stitch client on the instance', () => {
      expect(stitchTransport.stitchClient).to.equal(stitchClient);
    });
  });

  describe('#aggregate', () => {
    let stitchTransport;
    const pipeline = [{ $match: { name: 'Aphex Twin' }}];
    const aggResult = [{ name: 'Aphex Twin' }];

    const aggMock = sinon.mock().withArgs(pipeline).
      returns({ toArray: () => Promise.resolve(aggResult) });

    beforeEach(() => {
      const collectionStub = {
        aggregate: aggMock
      };
      stitchTransport = new StitchTransport(stitchClient, createClientStub(collectionStub));
    });

    afterEach(() => {
      stitchTransport = null;
    });

    it('executes the command against the database', async() => {
      const cursor = stitchTransport.aggregate('music', 'bands', pipeline);
      const result = await cursor.toArray();
      expect(result).to.deep.equal(aggResult);
      aggMock.verify();
    });
  });

  describe('#bulkWrite', () => {
    let stitchTransport;
    const requests = [{ insertOne: { name: 'Aphex Twin' }}];

    beforeEach(() => {
      stitchTransport = new StitchTransport(stitchClient, createClientStub({}));
    });

    afterEach(() => {
      stitchTransport = null;
    });

    it('rejects the promise', () => {
      return stitchTransport.bulkWrite('music', 'bands', requests).catch((error) => {
        expect(error).to.not.equal(null);
      });
    });
  });

  describe('#countDocuments', () => {
    let stitchTransport;
    const countResult = 10;
    const countMock = sinon.mock().once().withArgs({}).resolves(countResult);

    beforeEach(() => {
      const collectionStub = {
        count: countMock
      };
      stitchTransport = new StitchTransport(stitchClient, createClientStub(collectionStub));
    });

    afterEach(() => {
      stitchTransport = null;
    });

    it('executes the command against the database', async() => {
      const result = await stitchTransport.countDocuments('music', 'bands');
      expect(result).to.deep.equal(countResult);
      countMock.verify();
    });
  });

  describe('#deleteMany', () => {
    let stitchTransport;
    const commandResult = { result: { n: 1, ok: 1 }};
    const deleteMock = sinon.mock().once().withArgs({}).resolves(commandResult);

    beforeEach(() => {
      const collectionStub = {
        deleteMany: deleteMock
      };
      stitchTransport = new StitchTransport(stitchClient, createClientStub(collectionStub));
    });

    afterEach(() => {
      stitchTransport = null;
    });

    it('executes the command against the database', async() => {
      const result = await stitchTransport.deleteMany('music', 'bands', {});
      expect(result).to.deep.equal(commandResult);
      deleteMock.verify();
    });
  });

  describe('#deleteOne', () => {
    let stitchTransport;
    const commandResult = { result: { n: 1, ok: 1 }};
    const deleteMock = sinon.mock().once().withArgs({}).resolves(commandResult);

    beforeEach(() => {
      const collectionStub = {
        deleteOne: deleteMock
      };
      stitchTransport = new StitchTransport(stitchClient, createClientStub(collectionStub));
    });

    afterEach(() => {
      stitchTransport = null;
    });

    it('executes the command against the database', async() => {
      const result = await stitchTransport.deleteOne('music', 'bands', {});
      expect(result).to.deep.equal(commandResult);
      deleteMock.verify();
    });
  });

  describe('#distinct', () => {
    let stitchTransport;

    beforeEach(() => {
      stitchTransport = new StitchTransport(stitchClient, createClientStub({}));
    });

    afterEach(() => {
      stitchTransport = null;
    });

    it('rejects the promise', () => {
      return stitchTransport.distinct('music', 'bands', 'name').catch((error) => {
        expect(error).to.not.equal(null);
      });
    });
  });

  describe('#estimatedDocumentCount', () => {
    let stitchTransport;

    beforeEach(() => {
      stitchTransport = new StitchTransport(stitchClient, createClientStub({}));
    });

    afterEach(() => {
      stitchTransport = null;
    });

    it('rejects the promise', () => {
      return stitchTransport.estimatedDocumentCount('music', 'bands').catch((error) => {
        expect(error).to.not.equal(null);
      });
    });
  });

  describe('#find', () => {
    let stitchTransport;
    const filter = { name: 'Aphex Twin' };
    const findResult = [{ name: 'Aphex Twin' }];
    const findMock = sinon.mock().withArgs(filter).
      returns({ toArray: () => Promise.resolve(findResult) });

    beforeEach(() => {
      const collectionStub = {
        find: findMock
      };
      stitchTransport = new StitchTransport(stitchClient, createClientStub(collectionStub));
    });

    afterEach(() => {
      stitchTransport = null;
    });

    it('executes the command against the database', async() => {
      const cursor = stitchTransport.find('music', 'bands', filter);
      const result = await cursor.toArray();
      expect(result).to.deep.equal(findResult);
      findMock.verify();
    });
  });

  describe('#findOneAndDelete', () => {
    let stitchTransport;
    const commandResult = { result: { n: 1, ok: 1 }};
    const findMock = sinon.mock().once().withArgs({}).resolves(commandResult);

    beforeEach(() => {
      const collectionStub = {
        findOneAndDelete: findMock
      };
      stitchTransport = new StitchTransport(stitchClient, createClientStub(collectionStub));
    });

    afterEach(() => {
      stitchTransport = null;
    });

    it('executes the command against the database', async() => {
      const result = await stitchTransport.findOneAndDelete('music', 'bands', {});
      expect(result).to.deep.equal(commandResult);
      findMock.verify();
    });
  });

  describe('#findOneAndReplace', () => {
    let stitchTransport;
    const commandResult = { result: { n: 1, ok: 1 }};
    const filter = { name: 'Aphex Twin' };
    const replacement = { name: 'Richard James' };
    const findMock = sinon.mock().once().withArgs(filter, replacement).
      resolves(commandResult);

    beforeEach(() => {
      const collectionStub = {
        findOneAndReplace: findMock
      };
      stitchTransport = new StitchTransport(stitchClient, createClientStub(collectionStub));
    });

    afterEach(() => {
      stitchTransport = null;
    });

    it('executes the command against the database', async() => {
      const result = await stitchTransport.
        findOneAndReplace('music', 'bands', filter, replacement);
      expect(result).to.deep.equal(commandResult);
      findMock.verify();
    });
  });

  describe('#findOneAndUpdate', () => {
    let stitchTransport;
    const commandResult = { result: { n: 1, ok: 1 }};
    const filter = { name: 'Aphex Twin' };
    const update = { $set: { name: 'Richard James' }};
    const findMock = sinon.mock().once().withArgs(filter, update).
      resolves(commandResult);

    beforeEach(() => {
      const collectionStub = {
        findOneAndUpdate: findMock
      };
      stitchTransport = new StitchTransport(stitchClient, createClientStub(collectionStub));
    });

    afterEach(() => {
      stitchTransport = null;
    });

    it('executes the command against the database', async() => {
      const result = await stitchTransport.
        findOneAndUpdate('music', 'bands', filter, update);
      expect(result).to.deep.equal(commandResult);
      findMock.verify();
    });
  });

  describe('#insertMany', () => {
    let stitchTransport;
    const doc = { name: 'Aphex Twin' };
    const commandResult = { result: { n: 1, ok: 1 }};
    const insertMock = sinon.mock().once().withArgs([ doc ]).resolves(commandResult);

    beforeEach(() => {
      const collectionStub = {
        insertMany: insertMock
      };
      stitchTransport = new StitchTransport(stitchClient, createClientStub(collectionStub));
    });

    afterEach(() => {
      stitchTransport = null;
    });

    it('executes the command against the database', async() => {
      const result = await stitchTransport.insertMany('music', 'bands', [ doc ]);
      expect(result).to.deep.equal(commandResult);
      insertMock.verify();
    });
  });

  describe('#insertOne', () => {
    let stitchTransport;
    const doc = { name: 'Aphex Twin' };
    const commandResult = { result: { n: 1, ok: 1 }};
    const insertMock = sinon.mock().once().withArgs(doc).resolves(commandResult);

    beforeEach(() => {
      const collectionStub = {
        insertOne: insertMock
      };
      stitchTransport = new StitchTransport(stitchClient, createClientStub(collectionStub));
    });

    afterEach(() => {
      stitchTransport = null;
    });

    it('executes the command against the database', async() => {
      const result = await stitchTransport.insertOne('music', 'bands', doc);
      expect(result).to.deep.equal(commandResult);
      insertMock.verify();
    });
  });

  describe('#replaceOne', () => {
    let stitchTransport;
    const filter = { name: 'Aphex Twin' };
    const replacement = { name: 'Richard James' };

    beforeEach(() => {
      stitchTransport = new StitchTransport(stitchClient, createClientStub({}));
    });

    afterEach(() => {
      stitchTransport = null;
    });

    it('rejects the promise', () => {
      return stitchTransport.replaceOne('music', 'bands', filter, replacement).catch((error) => {
        expect(error).to.not.equal(null);
      });
    });
  });

  describe('#runCommand', () => {
    let stitchTransport;

    beforeEach(() => {
      stitchTransport = new StitchTransport(stitchClient, createClientStub({}));
    });

    afterEach(() => {
      stitchTransport = null;
    });

    it('rejects the promise', () => {
      return stitchTransport.runCommand('admin', { ismaster: 1 }).catch((error) => {
        expect(error).to.not.equal(null);
      });
    });
  });

  describe('#updateOne', () => {
    let stitchTransport;
    const filter = { name: 'Aphex Twin' };
    const update = { $set: { name: 'Richard James' }};
    const commandResult = { result: { n: 1, ok: 1 }};
    const updateMock = sinon.mock().once().withArgs(filter, update).
      resolves(commandResult);

    beforeEach(() => {
      const collectionStub = {
        updateOne: updateMock
      };
      stitchTransport = new StitchTransport(stitchClient, createClientStub(collectionStub));
    });

    afterEach(() => {
      stitchTransport = null;
    });

    it('executes the command against the database', async() => {
      const result = await stitchTransport.updateOne('music', 'bands', filter, update);
      expect(result).to.deep.equal(commandResult);
      updateMock.verify();
    });
  });

  describe('#updateMany', () => {
    let stitchTransport;
    const filter = { name: 'Aphex Twin' };
    const update = { $set: { name: 'Richard James' }};
    const commandResult = { result: { n: 1, ok: 1 }};
    const updateMock = sinon.mock().once().withArgs(filter, update).
      resolves(commandResult);

    beforeEach(() => {
      const collectionStub = {
        updateMany: updateMock
      };
      stitchTransport = new StitchTransport(stitchClient, createClientStub(collectionStub));
    });

    afterEach(() => {
      stitchTransport = null;
    });

    it('executes the command against the database', async() => {
      const result = await stitchTransport.updateMany('music', 'bands', filter, update);
      expect(result).to.deep.equal(commandResult);
      updateMock.verify();
    });
  });
});
