import { expect } from 'chai';
import Mongo from './mongo';

describe('Mongo', () => {
  describe('help', () => {
    const apiClass: any = new Mongo({} as any, '');
    it('calls help function', () => {
      expect(apiClass.help().shellApiType()).to.equal('Help');
      expect(apiClass.help.shellApiType()).to.equal('Help');
    });
  });
});
