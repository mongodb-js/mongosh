import { ShowDbsResult } from './show-dbs';
import { expect } from 'chai';

describe('ShowDbsResult', () => {
  describe('#shellApiType', () => {
    it('returns ShowDbsResult', () => {
      expect(new ShowDbsResult({ value: '...' }).shellApiType()).to.equal('ShowDbsResult');
    });
  });

  describe('#toReplString', () => {
    it('returns the value', () => {
      const showDbsResult = new ShowDbsResult({ value: 'some text' });
      expect(showDbsResult.toReplString()).to.equal('some text');
    });
  });
});
