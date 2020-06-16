import { expect } from 'chai';
import Mongo from './mongo';

describe('Mongo', () => {
  describe('help', () => {
    const apiClass: any = new Mongo({} as any, '');
    it('calls help function', async() => {
      expect((await apiClass.help().asShellResult()).type).to.equal('Help');
      expect((await apiClass.help.asShellResult()).type).to.equal('Help');
    });
  });
});
