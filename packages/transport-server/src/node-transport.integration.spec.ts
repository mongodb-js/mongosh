import NodeTransport from './node-transport';
import { expect } from 'chai';
import { MongoClient } from 'mongodb';

describe('NodeTransport [ integration ]', function() {
  this.timeout(30000);

  const port = 27018;
  const connectionString = `mongodb://localhost:${port}`;

  before(require('mongodb-runner/mocha/before')({ port, timeout: 60000 }));
  after(require('mongodb-runner/mocha/after')({ port }));

  let client;
  let dbName;
  let db;
  let nodeTransport: NodeTransport;

  beforeEach(async() => {
    client = await MongoClient.connect(
      connectionString,
      { useUnifiedTopology: true }
    );

    dbName = `test-db-${Date.now()}`;
    db = client.db(dbName);
    nodeTransport = new NodeTransport(client);
  });

  afterEach(() => {
    client.close(true);
    return nodeTransport.close(true);
  });

  describe('.fromURI', () => {
    it('returns a NodeTransport with mongo client set', () => {
      expect(nodeTransport.mongoClient).to.not.equal(undefined);
    });

    it('contains a connected mongo client', () => {
      expect(nodeTransport.mongoClient.isConnected()).to.equal(true);
    });
  });

  describe('#aggregate', () => {
    context('when running against a collection', () => {
      let result;

      beforeEach(async() => {
        result = await nodeTransport.
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
        result = await nodeTransport.aggregateDb('admin', [{ $currentOp: {} }]);
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

  describe('#deleteMany', () => {
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

  describe('#distinct', () => {
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

  describe('#estimatedDocumentCount', () => {
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
    context('when the find is valid', () => {
      let result;
      const filter = { name: 'Aphex Twin' };
      const update = { $set: { name: 'Richard James' } };

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
    context('when the insert is valid', () => {
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
    context('when the insert is valid', () => {
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
    const filter = { name: 'Aphex Twin' };
    const replacement = { name: 'Richard James' };

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

  describe('#updateMany', () => {
    const filter = { name: 'Aphex Twin' };
    const update = { $set: { name: 'Richard James' } };
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

  describe('#updateOne', () => {
    const filter = { name: 'Aphex Twin' };
    const update = { $set: { name: 'Richard James' } };
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

  describe('#dropDatabase', () => {
    context('when a database does not exist', () => {
      let result;

      it('returns  {ok: 1}', async() => {
        result = await nodeTransport.dropDatabase(`test-db-${Date.now()}`);
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
        result = await nodeTransport.dropDatabase(dbName);
      });

      it('returns  {ok: 1}', async() => {
        expect(result.ok).to.equal(1);
      });

      it('deletes the database', async() => {
        expect(await dbExists()).to.be.false;
      });
    });
  });
});
