import { Collection } from './shell-api';
import { expect } from 'chai';

describe('Collection', () => {
  describe('#help', () => {
    const collection = new Collection();

    it('returns the translated text', () => {
      expect((collection.findOne as any).help().help).to.include('Selects');
    });
  });
});
