import { expect } from 'chai';
import sinon from 'sinon';
import { signatures, AggregationCursor } from './index';

describe('AggregationCursor', () => {
  describe('signature', () => {
    it('signature for class correct', () => {
      expect(signatures.AggregationCursor.type).to.equal('AggregationCursor');
      expect(signatures.AggregationCursor.hasAsyncChild).to.equal(true);
    });
    it('map signature', () => {
      expect(signatures.AggregationCursor.attributes.map).to.deep.equal({
        type: 'function',
        returnsPromise: false,
        returnType: 'AggregationCursor'
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
      cursor = new AggregationCursor({}, wrappee);
    });

    it('sets dynamic properties', () => {
      expect(cursor.shellApiType()).to.equal('AggregationCursor');
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
  });
});
