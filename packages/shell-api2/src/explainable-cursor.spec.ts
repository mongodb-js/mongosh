import { expect } from 'chai';
import sinon from 'ts-sinon';
import { signatures, ExplainableCursor } from './index';
import { ServerVersions } from './main';

describe('ExplainableCursor', () => {
  describe('signature', () => {
    it('signature for class correct', () => {
      expect(signatures.ExplainableCursor.type).to.equal('ExplainableCursor');
      expect(signatures.ExplainableCursor.hasAsyncChild).to.equal(true);
    });
    it('inherited (map) signature', () => {
      expect(signatures.ExplainableCursor.attributes.map).to.deep.equal({
        type: 'function',
        returnsPromise: false,
        returnType: 'Cursor' // because inherited from Cursor.
      });
    });
  });
  describe('instance', () => {
    let wrappee;
    let eCursor;
    beforeEach(() => {
      wrappee = {
        map: sinon.spy(),
        explain: (verbosity): any => ({ ok: verbosity })
      };
      eCursor = new ExplainableCursor({}, wrappee, 'verbosity');
    });

    it('sets dynamic properties', async() => {
      expect(eCursor.shellApiType()).to.equal('ExplainableCursor');
      expect(eCursor.help.shellApiType()).to.equal('Help');
      expect(eCursor.verbosity).to.equal('verbosity');
      expect(await eCursor.toReplString()).to.deep.equal({ ok: 'verbosity' });
    });

    it('returns the same ExplainableCursor', () => {
      expect(eCursor.map()).to.equal(eCursor);
    });

    it('calls wrappee.map with arguments', () => {
      const arg = {};
      eCursor.map(arg);
      expect(wrappee.map.calledWith(arg)).to.equal(true);
    });

    it('has the correct metadata', () => {
      expect(eCursor.collation.serverVersions).to.deep.equal(['3.4.0', ServerVersions.latest]);
    });
  });
});
