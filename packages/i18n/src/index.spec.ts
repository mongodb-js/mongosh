import { expect } from 'chai';
import translator from './index';

describe('Translator', () => {
  describe('#__apiHelp', () => {
    it('returns the translated help text', () => {
      expect(translator.__apiHelp('')).to.equal('');
    });
  });
});
