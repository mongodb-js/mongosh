import { CommandResult } from './command-result';
import { expect } from 'chai';

describe('CommandResult', () => {
  describe('#shellApiType', () => {
    it('returns CommandResult', () => {
      expect(new CommandResult({value: '...'}).shellApiType()).to.equal('CommandResult');
    });
  });

  describe('#toReplString', () => {
    it('returns the value', () => {
      const commandResult = new CommandResult({value: 'some text'});
      expect(commandResult.toReplString()).to.equal('some text');
    });
  });
});
