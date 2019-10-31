const NodeTransport = require('./node-transport');
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
    it.skip('calls #command on the driver database', () => {
    });
  });

  describe('.fromURI', () => {
    it.skip('returns a NodeTransport with connected client', () => {
    });
  });
});
