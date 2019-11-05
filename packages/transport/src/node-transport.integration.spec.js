const NodeTransport = require('./node-transport');
const { expect } = require('chai');

describe('NodeTransport [ integration ]', () => {
  before(require('mongodb-runner/mocha/before')({ port: 27018 }));
  after(require('mongodb-runner/mocha/after')({ port: 27018 }));

  describe('.fromURI', () => {
    let nodeTransport;

    before(async() => {
      nodeTransport = await NodeTransport.fromURI('mongodb://localhost:27018');
    });

    after(() => {
      return nodeTransport.mongoClient.close(true);
    });

    it('returns a NodeTransport with mongo client set', () => {
      expect(nodeTransport.mongoClient).to.not.equal(undefined);
    });

    it('contains a connected mongo client', () => {
      expect(nodeTransport.mongoClient.isConnected()).to.equal(true);
    });
  });

  describe('#aggregate', () => {
    let nodeTransport;

    before(async() => {
      nodeTransport = await NodeTransport.fromURI('mongodb://localhost:27018');
    });

    after(() => {
      return nodeTransport.mongoClient.close(true);
    });

    context('when running against a collection', () => {
      let result;

      beforeEach(async() => {
        result = await nodeTransport.
          aggregate('music', 'bands', [{ $match: { name: 'Aphex Twin' }}]);
      });

      it('executes the command and resolves the result', async() => {
        const docs = await result.toArray();
        expect(docs).to.deep.equal([]);
      });
    });

    context('when running against a database', () => {
      let result;

      beforeEach(async() => {
        result = await nodeTransport.aggregate('admin', null, [{ $currentOp: {}}]);
      });

      it('executes the command and resolves the result', async() => {
        const docs = await result.toArray();
        expect(docs[0].active).to.equal(true);
      });
    });
  });

  describe('#bulkWrite', () => {
    let nodeTransport;

    before(async() => {
      nodeTransport = await NodeTransport.fromURI('mongodb://localhost:27018');
    });

    after(() => {
      return nodeTransport.mongoClient.close(true);
    });

    context('when the filter is empty', () => {
      let result;
      const requests = [{
        insertOne: { name: 'Aphex Twin' }
      }];

      beforeEach(async() => {
        result = await nodeTransport.bulkWrite('music', 'bands', requests);
      });

      afterEach(() => {
        return nodeTransport.deleteMany('music', 'bands', {});
      });

      it('executes the count with an empty filter and resolves the result', () => {
        expect(result.result.nInserted).to.equal(1);
      });
    });
  });

  describe('#countDocuments', () => {
    let nodeTransport;

    before(async() => {
      nodeTransport = await NodeTransport.fromURI('mongodb://localhost:27018');
    });

    after(() => {
      return nodeTransport.mongoClient.close(true);
    });

    context('when the filter is empty', () => {
      let result;

      beforeEach(async() => {
        result = await nodeTransport.countDocuments('music', 'bands');
      });

      it('executes the count with an empty filter and resolves the result', () => {
        expect(result).to.equal(0);
      });
    });
  });

  describe('#distinct', () => {
    let nodeTransport;

    before(async() => {
      nodeTransport = await NodeTransport.fromURI('mongodb://localhost:27018');
    });

    after(() => {
      return nodeTransport.mongoClient.close(true);
    });

    context('when the distinct is valid', () => {
      let result;

      beforeEach(async() => {
        result = await nodeTransport.distinct('music', 'bands', 'name');
      });

      it('executes the command and resolves the result', () => {
        expect(result).to.deep.equal([]);
      });
    });
  });

  describe('#deleteMany', () => {
    let nodeTransport;

    before(async() => {
      nodeTransport = await NodeTransport.fromURI('mongodb://localhost:27018');
    });

    after(() => {
      return nodeTransport.mongoClient.close(true);
    });

    context('when the filter is empty', () => {
      let result;

      beforeEach(async() => {
        result = await nodeTransport.deleteMany('music', 'bands', {});
      });

      it('executes the count with an empty filter and resolves the result', () => {
        expect(result.result.n).to.equal(0);
      });
    });
  });

  describe('#deleteOne', () => {
    let nodeTransport;

    before(async() => {
      nodeTransport = await NodeTransport.fromURI('mongodb://localhost:27018');
    });

    after(() => {
      return nodeTransport.mongoClient.close(true);
    });

    context('when the filter is empty', () => {
      let result;

      beforeEach(async() => {
        result = await nodeTransport.deleteOne('music', 'bands', {});
      });

      it('executes the count with an empty filter and resolves the result', () => {
        expect(result.result.n).to.equal(0);
      });
    });
  });

  describe('#estimatedDocumentCount', () => {
    let nodeTransport;

    before(async() => {
      nodeTransport = await NodeTransport.fromURI('mongodb://localhost:27018');
    });

    after(() => {
      return nodeTransport.mongoClient.close(true);
    });

    context('when no options are provided', () => {
      let result;

      beforeEach(async() => {
        result = await nodeTransport.estimatedDocumentCount('music', 'bands');
      });

      it('executes the count and resolves the result', () => {
        expect(result).to.equal(0);
      });
    });
  });

  describe('#find', () => {
    let nodeTransport;

    before(async() => {
      nodeTransport = await NodeTransport.fromURI('mongodb://localhost:27018');
    });

    after(() => {
      return nodeTransport.mongoClient.close(true);
    });

    context('when the find is valid', () => {
      let result;

      beforeEach(async() => {
        result = await nodeTransport.find('music', 'bands', { name: 'Aphex Twin' });
      });

      it('executes the command and resolves the result', async() => {
        const docs = await result.toArray();
        expect(docs).to.deep.equal([]);
      });
    });
  });

  describe('#findOneAndDelete', () => {
    let nodeTransport;

    before(async() => {
      nodeTransport = await NodeTransport.fromURI('mongodb://localhost:27018');
    });

    after(() => {
      return nodeTransport.mongoClient.close(true);
    });

    context('when the find is valid', () => {
      let result;
      const filter = { name: 'Aphex Twin' };

      beforeEach(async() => {
        result = await nodeTransport.findOneAndDelete('music', 'bands', filter);
      });

      it('executes the command and resolves the result', () => {
        expect(result.ok).to.equal(1);
      });
    });
  });

  describe('#findOneAndReplace', () => {
    let nodeTransport;

    before(async() => {
      nodeTransport = await NodeTransport.fromURI('mongodb://localhost:27018');
    });

    after(() => {
      return nodeTransport.mongoClient.close(true);
    });

    context('when the find is valid', () => {
      let result;
      const filter = { name: 'Aphex Twin' };
      const replacement = { name: 'Richard James' };

      beforeEach(async() => {
        result = await nodeTransport.
          findOneAndReplace('music', 'bands', filter, replacement);
      });

      it('executes the command and resolves the result', () => {
        expect(result.ok).to.equal(1);
      });
    });
  });

  describe('#findOneAndUpdate', () => {
    let nodeTransport;

    before(async() => {
      nodeTransport = await NodeTransport.fromURI('mongodb://localhost:27018');
    });

    after(() => {
      return nodeTransport.mongoClient.close(true);
    });

    context('when the find is valid', () => {
      let result;
      const filter = { name: 'Aphex Twin' };
      const update = { $set: { name: 'Richard James' }};

      beforeEach(async() => {
        result = await nodeTransport.
          findOneAndUpdate('music', 'bands', filter, update);
      });

      it('executes the command and resolves the result', () => {
        expect(result.ok).to.equal(1);
      });
    });
  });

  describe('#insertMany', () => {
    let nodeTransport;

    before(async() => {
      nodeTransport = await NodeTransport.fromURI('mongodb://localhost:27018');
    });

    after(() => {
      return nodeTransport.mongoClient.close(true);
    });

    context('when the filter is empty', () => {
      let result;

      beforeEach(async() => {
        result = await nodeTransport.insertMany('music', 'bands', [{ name: 'Aphex Twin' }]);
      });

      afterEach(() => {
        return nodeTransport.deleteMany('music', 'bands', {});
      });

      it('executes the count with an empty filter and resolves the result', () => {
        expect(result.result.n).to.equal(1);
      });
    });
  });

  describe('#insertOne', () => {
    let nodeTransport;

    before(async() => {
      nodeTransport = await NodeTransport.fromURI('mongodb://localhost:27018');
    });

    after(() => {
      return nodeTransport.mongoClient.close(true);
    });

    context('when the filter is empty', () => {
      let result;

      beforeEach(async() => {
        result = await nodeTransport.insertOne('music', 'bands', { name: 'Aphex Twin' });
      });

      afterEach(() => {
        return nodeTransport.deleteMany('music', 'bands', {});
      });

      it('executes the count with an empty filter and resolves the result', () => {
        expect(result.result.n).to.equal(1);
      });
    });
  });

  describe('#replaceOne', () => {
    let nodeTransport;
    const filter = { name: 'Aphex Twin' };
    const replacement = { name: 'Richard James' };

    before(async() => {
      nodeTransport = await NodeTransport.fromURI('mongodb://localhost:27018');
    });

    after(() => {
      return nodeTransport.mongoClient.close(true);
    });

    context('when the filter is empty', () => {
      let result;

      beforeEach(async() => {
        result = await nodeTransport.
          replaceOne('music', 'bands', filter, replacement);
      });

      it('executes the count with an empty filter and resolves the result', () => {
        expect(result.result.n).to.equal(0);
      });
    });
  });

  describe('#runCommand', () => {
    let nodeTransport;

    before(async() => {
      nodeTransport = await NodeTransport.fromURI('mongodb://localhost:27018');
    });

    after(() => {
      return nodeTransport.mongoClient.close(true);
    });

    context('when the command is valid', () => {
      let result;

      beforeEach(async() => {
        result = await nodeTransport.runCommand('admin', { ismaster: true });
      });

      it('executes the command and resolves the result', () => {
        expect(result.ismaster).to.equal(true);
      });
    });
  });

  describe('#updateOne', () => {
    let nodeTransport;
    const filter = { name: 'Aphex Twin' };
    const update = { $set: { name: 'Richard James' }};

    before(async() => {
      nodeTransport = await NodeTransport.fromURI('mongodb://localhost:27018');
    });

    after(() => {
      return nodeTransport.mongoClient.close(true);
    });

    context('when the filter is empty', () => {
      let result;

      beforeEach(async() => {
        result = await nodeTransport.
          updateOne('music', 'bands', filter, update);
      });

      it('executes the count with an empty filter and resolves the result', () => {
        expect(result.result.n).to.equal(0);
      });
    });
  });

  describe('#updateMany', () => {
    let nodeTransport;
    const filter = { name: 'Aphex Twin' };
    const update = { $set: { name: 'Richard James' }};

    before(async() => {
      nodeTransport = await NodeTransport.fromURI('mongodb://localhost:27018');
    });

    after(() => {
      return nodeTransport.mongoClient.close(true);
    });

    context('when the filter is empty', () => {
      let result;

      beforeEach(async() => {
        result = await nodeTransport.
          updateMany('music', 'bands', filter, update);
      });

      it('executes the count with an empty filter and resolves the result', () => {
        expect(result.result.n).to.equal(0);
      });
    });
  });
}).timeout(120000);
