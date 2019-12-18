import UnsupportedCursor from './unsupported-cursor';
import { expect } from 'chai';

describe('UnsupportedCursor', () => {
  describe('#toArray', () => {
    const cursor = new UnsupportedCursor('testing');

    it('rejects the promise with the provided message', () => {
      return cursor.toArray().catch((message) => {
        expect(message).to.equal('testing');
      });
    });
  });
});
