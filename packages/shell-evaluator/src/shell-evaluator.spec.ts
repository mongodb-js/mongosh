import { expect } from 'chai';

describe('ShellEvaluator placeholder', () => {
  // TODO: move to ShellApi tests
  // describe('setCtx', () => {
  //   let ctx;
  //   beforeEach(() => {
  //     ctx = {};
  //     mapper.setCtx(ctx);
  //   });
  //
  //   it('sets shell api globals', () => {
  //     expect(ctx).to.include.all.keys('it', 'help', 'show', 'use');
  //   });
  //
  //   it('sets db', () => {
  //     expect(ctx.db).to.be.instanceOf(Database);
  //   });
  //
  //   it('sets the object as context for the mapper', () => {
  //     expect((mapper as any).context).to.equal(ctx);
  //   });
  // });

  it('passes', () => {
    expect(true);
  });
});
