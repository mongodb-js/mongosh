import runOnlyOnOnePlatform from './execute-once';
import chai, { expect } from 'chai';
import sinon from 'ts-sinon';

chai.use(require('sinon-chai'));

describe('runOnlyOnOnePlatform', () => {
  it('executes task when platform is macos (darwin)', async() => {
    const spy = sinon.spy();
    runOnlyOnOnePlatform('upload', { platform: 'darwin' }, spy);
    expect(spy).to.have.been.called;
  });

  it('does not execute when platform is windows (win32)', async() => {
    const spy = sinon.spy();
    runOnlyOnOnePlatform('upload', { platform: 'win32' }, spy);
    expect(spy).to.not.have.been.called;
  });
});
