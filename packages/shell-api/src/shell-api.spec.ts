import { expect } from 'chai';
import ShellApi from './shell-api';

describe('ShellApi', () => {
  describe('help', () => {
    const apiClass: any = new ShellApi({} as any);
    it('calls help function', () => {
      expect(apiClass.help().shellApiType()).to.equal('Help');
      expect(apiClass.help.shellApiType()).to.equal('Help');
    });
  });
});
