import { CommandResult } from './shell-api';
import { expect } from 'chai';

describe('CommandResult', () => {
  describe('#shellApiType', () => {
    it('returns the type', () => {
      const commandResult = new CommandResult('ResultType', 'value');
      expect(commandResult.shellApiType()).to.equal('ResultType');
    });
  });

  describe('#toReplString', () => {
    it('returns the value', () => {
      const commandResult = new CommandResult('ResultType', 'value');
      expect(commandResult.toReplString()).to.equal('value');
    });
  });
});
