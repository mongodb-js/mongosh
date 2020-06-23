import { expect } from 'chai';
import sinon from 'ts-sinon';
import Shard from './shard';
// import { asShellResult } from './enums';

describe('Shard', () => {
  describe('unimplemented', () => {
    it('throws', () => {
      const mSpy = sinon.spy();
      const rs = new Shard(mSpy);
      try {
        (rs as any).anything();
      } catch (e) {
        expect(e.name).to.be.equal('MongoshUnimplementedError');
      }
    });
  });
  // describe('help', () => {
  //   const apiClass: any = new Shard({});
  //   it('calls help function', async() => {
  //     expect((await apiClass.help()[asShellResult]()).type).to.equal('Help');
  //     expect((await apiClass.help[asShellResult]()).type).to.equal('Help');
  //   });
  // });
});
