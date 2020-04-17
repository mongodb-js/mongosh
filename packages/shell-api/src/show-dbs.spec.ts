import { ShowDbsResult } from './shell-api';
import { expect } from 'chai';

describe('ShowDbsResult', () => {
  describe('#shellApiType', () => {
    it('returns ShowDbsResult', () => {
      expect(new ShowDbsResult('...' ).shellApiType()).to.equal('ShowDbsResult');
    });
  });

  describe('#toReplString', () => {
    it('returns the value', () => {
      const showDbsResult = new ShowDbsResult('some text');
      expect(showDbsResult.toReplString()).to.equal('some text');
    });
  });
});
