import { expect } from 'chai';
import isRecoverableError from './is-recoverable-error';

describe('error is recoverable', function () {
  it('recovers when input is function x () {', function () {
    expect(isRecoverableError('function x () {')).to.equal(true);
  });

  it('recovers when input is [1, 2, 3].forEach((x) =>  {', function () {
    expect(isRecoverableError('[1, 2, 3].forEach((x) =>  {')).to.equal(true);
  });

  it('recovers when input is db.coll.find().forEach((x) => {', function () {
    expect(isRecoverableError('db.coll.find().forEach((x) => {')).to.equal(
      true
    );
  });

  it('recovers when input is db.coll.insertOne({', function () {
    expect(isRecoverableError('db.coll.insertOne({')).to.equal(true);
  });

  it('recovers for an unterminated template', function () {
    expect(isRecoverableError('var x =`')).to.equal(true);
  });

  it('recovers for a \r separator', function () {
    expect(isRecoverableError('var x = \r')).to.equal(true);
  });

  it('recovers for an unterminated comment', function () {
    expect(isRecoverableError('var x = 6 /**')).to.equal(true);
  });

  it('recovers for an unterminated string constant that uses u2028', function () {
    expect(isRecoverableError('var x =\u2028')).to.equal(true);
  });

  it('recovers for an unterminated string constant that uses u2029', function () {
    expect(isRecoverableError('var x =\u2029')).to.equal(true);
  });
});

describe('error is non-recoverable', function () {
  it('does not recover when input is <cat>', function () {
    expect(isRecoverableError('<cat>')).to.equal(false);
  });

  it('does not when input is db.coll.find(.forEach((x) => {', function () {
    expect(isRecoverableError('db.coll.find(.forEach((x) => {')).to.equal(
      false
    );
  });
  it('does not recover for a regular unterminated string constant', function () {
    expect(isRecoverableError("var x = 'unfinished string")).to.equal(false);
  });

  it('does not recover for a single line unterminated comment', function () {
    expect(isRecoverableError('function x () //\n')).to.equal(true);
  });
});
