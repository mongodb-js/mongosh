import sinon from 'ts-sinon';
import Help from './help';
import { expect } from 'chai';

describe('Help', () => {
  let translate;

  beforeEach(() => {
    translate = sinon.fake((x) => `translated: ${x}`);
  });

  describe('#shellApiType', () => {
    it('returns Help', () => {
      expect(new Help({ help: 'help' }, { translate }).shellApiType()).to.equal('Help');
    });
  });

  describe('#toReplString', () => {
    it('returns the Help a plain object', () => {
      const properties = {
        help: 'help'
      };

      const help = new Help(properties, { translate });
      expect(help.toReplString().constructor.name).to.equal('Object');
      expect(help.toReplString()).to.not.equal(help);
    });

    it('returns translated help', () => {
      const properties = {
        help: 'help'
      };

      expect(
        new Help(properties, { translate })
          .toReplString()
          .help
      ).to.equal('translated: help');
    });

    it('returns docs', () => {
      const properties = {
        help: 'help',
        docs: 'https://example.com'
      };

      expect(
        new Help(properties, { translate })
          .toReplString()
          .docs
      ).to.equal('translated: https://example.com');
    });

    it('returns default attr', () => {
      const properties = {
        help: 'help'
      };

      const help = new Help(properties, { translate });

      expect(help.toReplString().attr).to.deep.equal([]);
    });

    it('returns attr with translated description', () => {
      const properties = {
        help: 'help',
        attr: [{ name: 'key', description: 'description' }]
      };

      expect(
        new Help(properties, { translate })
          .toReplString()
          .attr
      ).to.deep.equal([{ name: 'key', description: 'translated: description' }]);
    });
  });
});
