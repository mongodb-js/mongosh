import { expect } from 'chai';
import {
  getScopeFromErrorCode,
  MongoshBaseError,
  MongoshInternalError,
  MongoshInvalidInputError,
  MongoshRuntimeError,
  MongoshUnimplementedError,
  MongoshWarning,
  MongoshDeprecatedError,
  MongoshCommandFailed,
  CommonErrors,
} from './index';

describe('errors', function () {
  it('properly extracts the scope from error codes', function () {
    expect(getScopeFromErrorCode('')).to.be.undefined;
    expect(getScopeFromErrorCode(null)).to.be.undefined;
    expect(getScopeFromErrorCode(undefined)).to.be.undefined;

    expect(getScopeFromErrorCode('asldkjfaksjdf')).to.be.undefined;
    expect(getScopeFromErrorCode('?="§-kajsdf')).to.be.undefined;

    expect(getScopeFromErrorCode('ASYNC-')).to.be.equal('ASYNC');
    expect(getScopeFromErrorCode('SHUPS-42')).to.be.equal('SHUPS');
    expect(getScopeFromErrorCode('e1337-291')).to.be.equal('e1337');
  });

  it('creates MongoshInternalError', function () {
    const error = new MongoshInternalError('Something went wrong.');
    expect(error).to.be.instanceOf(MongoshBaseError);
    expect(error.name).to.be.equal('MongoshInternalError');
    expect(error.message).to.be.equal('[COMMON-90001] Something went wrong.');
    expect(error.code).to.be.equal(CommonErrors.UnexpectedInternalError);
    expect(error.scope).to.be.equal('COMMON');
  });
  it('creates MongoshUnimplementedError', function () {
    const errorNoCode = new MongoshUnimplementedError('Something went wrong.');
    expect(errorNoCode).to.be.instanceOf(MongoshBaseError);
    expect(errorNoCode.name).to.be.equal('MongoshUnimplementedError');
    expect(errorNoCode.message).to.be.equal('Something went wrong.');
    expect(errorNoCode.code).to.be.undefined;

    const errorWithCode = new MongoshUnimplementedError(
      'Something went wrong.',
      'SHUPS-42'
    );
    expect(errorWithCode).to.be.instanceOf(MongoshBaseError);
    expect(errorWithCode.name).to.be.equal('MongoshUnimplementedError');
    expect(errorWithCode.message).to.be.equal(
      '[SHUPS-42] Something went wrong.'
    );
    expect(errorWithCode.code).to.be.equal('SHUPS-42');
    expect(errorWithCode.scope).to.be.equal('SHUPS');
  });
  it('creates MongoshRuntimeError', function () {
    const errorNoCode = new MongoshRuntimeError('Something went wrong.');
    expect(errorNoCode).to.be.instanceOf(MongoshBaseError);
    expect(errorNoCode.name).to.be.equal('MongoshRuntimeError');
    expect(errorNoCode.message).to.be.equal('Something went wrong.');
    expect(errorNoCode.code).to.be.undefined;

    const errorWithCode = new MongoshRuntimeError(
      'Something went wrong.',
      'SHUPS-42'
    );
    expect(errorWithCode).to.be.instanceOf(MongoshBaseError);
    expect(errorWithCode.name).to.be.equal('MongoshRuntimeError');
    expect(errorWithCode.message).to.be.equal(
      '[SHUPS-42] Something went wrong.'
    );
    expect(errorWithCode.code).to.be.equal('SHUPS-42');
    expect(errorWithCode.scope).to.be.equal('SHUPS');
  });
  it('creates MongoshInvalidInputError', function () {
    const errorNoCode = new MongoshInvalidInputError('Something went wrong.');
    expect(errorNoCode).to.be.instanceOf(MongoshBaseError);
    expect(errorNoCode.name).to.be.equal('MongoshInvalidInputError');
    expect(errorNoCode.message).to.be.equal('Something went wrong.');
    expect(errorNoCode.code).to.be.undefined;

    const errorWithCode = new MongoshInvalidInputError(
      'Something went wrong.',
      'SHUPS-42'
    );
    expect(errorWithCode).to.be.instanceOf(MongoshBaseError);
    expect(errorWithCode.name).to.be.equal('MongoshInvalidInputError');
    expect(errorWithCode.message).to.be.equal(
      '[SHUPS-42] Something went wrong.'
    );
    expect(errorWithCode.code).to.be.equal('SHUPS-42');
    expect(errorWithCode.scope).to.be.equal('SHUPS');
  });
  it('creates MongoshWarning', function () {
    const errorNoCode = new MongoshWarning('Something went wrong.');
    expect(errorNoCode).to.be.instanceOf(MongoshBaseError);
    expect(errorNoCode.name).to.be.equal('MongoshWarning');
    expect(errorNoCode.message).to.be.equal('Something went wrong.');
    expect(errorNoCode.code).to.be.undefined;

    const errorWithCode = new MongoshWarning(
      'Something went wrong.',
      'SHUPS-42'
    );
    expect(errorWithCode).to.be.instanceOf(MongoshBaseError);
    expect(errorWithCode.name).to.be.equal('MongoshWarning');
    expect(errorWithCode.message).to.be.equal(
      '[SHUPS-42] Something went wrong.'
    );
    expect(errorWithCode.code).to.be.equal('SHUPS-42');
    expect(errorWithCode.scope).to.be.equal('SHUPS');
  });
  it('creates MongoshDeprecatedError', function () {
    const errorNoCode = new MongoshDeprecatedError('Something went wrong.');
    expect(errorNoCode).to.be.instanceOf(MongoshBaseError);
    expect(errorNoCode.name).to.be.equal('MongoshDeprecatedError');
    expect(errorNoCode.message).to.be.equal(
      '[COMMON-10003] Something went wrong.'
    );
    expect(errorNoCode.code).to.equal('COMMON-10003');
  });
  it('creates MongoshCommandFailed', function () {
    const errorNoCode = new MongoshCommandFailed('Something went wrong.');
    expect(errorNoCode).to.be.instanceOf(MongoshBaseError);
    expect(errorNoCode.name).to.be.equal('MongoshCommandFailed');
    expect(errorNoCode.message).to.be.equal(
      "[COMMON-10004] Command Something went wrong. returned ok: 0. To see the raw results of the command, use 'runCommand' instead."
    );
    expect(errorNoCode.code).to.equal('COMMON-10004');
  });
});
