const NodeTransport = require('./node-transport');
const { MongoClient, Db } = require('mongodb');
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

  describe('#runCommand', () => {
    let clientStub;
    let dbStub;
    let nodeTransport;
    const commandResult = { ismaster: true };

    beforeEach(() => {
      dbStub = sinon.createStubInstance(Db, {
        command: sinon.stub().
          withArgs('admin', { ismaster: 1 }).
          resolves(commandResult)
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

    it('executes the command against the database', () => {
      return nodeTransport.runCommand('admin', { ismaster: 1 }).then((result) => {
        expect(result).to.deep.equal(commandResult);
      });
    });
  });
})
