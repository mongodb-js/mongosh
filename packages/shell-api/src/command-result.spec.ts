import { CommandResult } from './shell-api';
import { expect } from 'chai';

describe('CommandResult', () => {
  describe('#shellApiType', () => {
    it('returns CommandResult', () => {
      expect(new CommandResult('...' ).shellApiType()).to.equal('CommandResult');
    });
  });

  describe('#toReplString', () => {
    it('returns the value', () => {
      const commandResult = new CommandResult('some text' );
      expect(commandResult.toReplString()).to.equal('some text');
    });
  });
});
