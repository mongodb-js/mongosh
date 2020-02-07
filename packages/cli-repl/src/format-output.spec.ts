import format from './format-output';
import { expect } from 'chai';

describe('formatOutput', () => {
  context('when the output is a string', () => {
    it('returns the output', () => {
      expect(format('test')).to.equal('test');
    });
  });

  context('when the output is an object', () => {
    it('returns the inspection', () => {
      expect(format(2)).to.include('2');
    });
  });
});
