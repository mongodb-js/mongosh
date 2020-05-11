import { expect } from 'chai';
import sinon from 'ts-sinon';
import ReplicaSet from './replica-set';

describe('ReplicaSet', () => {
  describe('unimplemented', () => {
    it('throws', () => {
      const mSpy = sinon.spy();
      const rs = new ReplicaSet(mSpy);
      try {
        (rs as any).anything();
      } catch (e) {
        expect(e.name).to.be.equal('MongoshUnimplementedError');
      }
    });
  });
});
