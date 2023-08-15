import { expect } from 'chai';
import sinon from 'sinon';
import { withRetries } from './';

describe('withRetries', function () {
  let fn: sinon.SinonStub;

  beforeEach(function () {
    fn = sinon.stub();
  });

  it('passes an immediate success through', async function () {
    fn.onFirstCall().resolves(42);
    expect(await withRetries(fn, 1)).to.equal(42);
  });

  it('passes a later success through', async function () {
    fn.onFirstCall().rejects(new Error('failed'));
    fn.onSecondCall().rejects(new Error('failed'));
    fn.onThirdCall().resolves(42);
    expect(await withRetries(fn, 3)).to.equal(42);
  });

  it('aggregates failures if retries are insufficient', async function () {
    fn.onFirstCall().rejects(new Error('fail 1'));
    fn.onSecondCall().rejects(new Error('fail 2'));
    fn.onThirdCall().resolves(42);
    const rejection = await withRetries(fn, 2).catch((err) => err);
    expect(rejection.name).to.equal('AggregateError');
    expect(rejection.errors).to.be.an('array');
    expect(rejection.errors.map((err: any) => err.message)).to.deep.equal([
      'fail 1',
      'fail 2',
    ]);
  });
});
