import { Collection } from './shell-api';
import { expect } from 'chai';
import i18n from 'mongosh-i18n';

describe('Collection', () => {
  describe('#help', () => {
    const collection = new Collection();

    it('returns the translated text', () => {
      expect(collection.findOne.help()).to.include('Selects');
    });
  });
});
