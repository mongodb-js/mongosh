import sinon from 'ts-sinon';
import Help from './help';
import { expect } from 'chai';
import { asShellResult } from './enums';

describe('Help', () => {
  let translate;

  beforeEach(() => {
    translate = sinon.fake((x) => `translated: ${x}`);
  });

  describe('#asShellResult', () => {
    it('returns Help', async() => {
      expect((await new Help({ help: 'help' }, { translate })[asShellResult]()).type).to.equal('Help');
    });
  });

  describe('#asShellResult', () => {
    it('returns the Help a plain object', () => {
      const properties = {
        help: 'help'
      };

      const help = new Help(properties, { translate });
      const result = help[asShellResult]();
      expect(result.value.constructor.name).to.equal('Object');
      expect(result.value).to.not.equal(help);
    });

    it('returns translated help', () => {
      const properties = {
        help: 'help'
      };

      expect(
        new Help(properties, { translate })
          [asShellResult]()
          .value
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
          [asShellResult]()
          .value
          .docs
      ).to.equal('translated: https://example.com');
    });

    it('returns default attr', () => {
      const properties = {
        help: 'help'
      };

      const help = new Help(properties, { translate });

      expect(help[asShellResult]().value.attr).to.deep.equal([]);
    });

    it('returns attr with translated description', () => {
      const properties = {
        help: 'help',
        attr: [{ name: 'key', description: 'description' }]
      };

      expect(
        new Help(properties, { translate })
          [asShellResult]()
          .value
          .attr
      ).to.deep.equal([{ name: 'key', description: 'translated: description' }]);
    });
  });
});
