import { Help } from './help';
import { expect } from 'chai';

describe('Help', () => {
  describe('#constructor', () => {
    it('sets defaults attr', () => {
      expect(new Help('Some help').attr).to.deep.equal([]);
    });
  });

  describe('#shellApiType', () => {
    it('returns the translated text', () => {
      expect(new Help('Some help').shellApiType()).to.equal('Help');
    });
  });
});
