const NodeTransport = require('./node-transport');
const { expect } = require('chai');
const sinon = require('sinon');

describe('NodeTransport [ integration ]', () => {
  before(require('mongodb-runner/mocha/before')({ port: 27018 }));
  after(require('mongodb-runner/mocha/after')({ port: 27018 }));

  describe('.fromURI', () => {
    let nodeTransport;

    before(async () => {
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

  describe('#runCommand', () => {
    let nodeTransport;

    before(async () => {
      nodeTransport = await NodeTransport.fromURI('mongodb://localhost:27018');
    });

    after(() => {
      return nodeTransport.mongoClient.close(true);
    });

    context('when the command is valid', () => {
      let result;

      beforeEach(async () => {
        result = await nodeTransport.runCommand('admin', { ismaster: true });
      });

      it('executes the command and resolves the result', () => {
        expect(result.ismaster).to.equal(true);
      });
    });
  });
}).timeout(30000);
