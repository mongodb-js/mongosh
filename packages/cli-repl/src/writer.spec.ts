import write from './writer';
import { expect } from 'chai';

describe('writer.write', () => {
  context('when the output can print a repl string', () => {
    const obj = {
      toReplString: () => ('testing')
    };

    it('returns the repl string', () => {
      expect(write(obj)).to.equal('testing');
    });
  });

  context('when the output is a string', () => {
    it('returns the output', () => {
      expect(write('test')).to.equal('test');
    });
  });

  context('when the output is an object', () => {
    it('returns the inspection', () => {
      expect(write(2)).to.include('2');
    });
  });
});
