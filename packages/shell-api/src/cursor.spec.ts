import { expect } from 'chai';
import sinon from 'ts-sinon';
import { signatures } from './decorators';
import Cursor from './cursor';
import { ALL_PLATFORMS, ALL_SERVER_VERSIONS, ALL_TOPOLOGIES, ServerVersions } from './enums';

describe('Cursor', () => {
  describe('signature', () => {
    it('signature for class correct', () => {
      expect(signatures.Cursor.type).to.equal('Cursor');
      expect(signatures.Cursor.hasAsyncChild).to.equal(true);
    });
    it('map signature', () => {
      expect(signatures.Cursor.attributes.map).to.deep.equal({
        type: 'function',
        returnsPromise: false,
        returnType: 'Cursor',
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        serverVersions: ALL_SERVER_VERSIONS
      });
    });
  });
  describe('instance', () => {
    let wrappee;
    let cursor;
    beforeEach(() => {
      wrappee = {
        map: sinon.spy()
      };
      cursor = new Cursor({}, wrappee);
    });

    it('sets dynamic properties', () => {
      expect(cursor.shellApiType()).to.equal('Cursor');
      expect(cursor.help.shellApiType()).to.equal('Help');
    });

    it('returns the same cursor', () => {
      expect(cursor.map()).to.equal(cursor);
    });

    it('calls wrappee.map with arguments', () => {
      const arg = {};
      cursor.map(arg);
      expect(wrappee.map.calledWith(arg)).to.equal(true);
    });

    it('has the correct metadata', () => {
      expect(cursor.collation.serverVersions).to.deep.equal(['3.4.0', ServerVersions.latest]);
    });
  });
});
