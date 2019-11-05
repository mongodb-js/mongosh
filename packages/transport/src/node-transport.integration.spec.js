const NodeTransport = require('./node-transport');
const { expect } = require('chai');
const sinon = require('sinon');

describe('NodeTransport [ integration ]', () => {
  before(require('mongodb-runner/mocha/before')({ port: 27018 }));
  after(require('mongodb-runner/mocha/after')({ port: 27018 }));

  describe('.fromURI', () => {
    let nodeTransport;

    before(() => {
      return NodeTransport.fromURI('mongodb://localhost:27018').then((transport) => {
        nodeTransport = transport;
      });
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
    it.skip('calls #command on the driver database', () => {
    });
  });
}).timeout(30000);
