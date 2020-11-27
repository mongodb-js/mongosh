import { expect } from 'chai';
import {
  getScopeFromErrorCode,
  MongoshBaseError, MongoshInternalError,
  MongoshInvalidInputError, MongoshRuntimeError,
  MongoshUnimplementedError
} from './index';

describe('errors', () => {
  it('properly extracts the scope from error codes', () => {
    expect(getScopeFromErrorCode('')).to.be.undefined;
    expect(getScopeFromErrorCode(null)).to.be.undefined;
    expect(getScopeFromErrorCode(undefined)).to.be.undefined;

    expect(getScopeFromErrorCode('asldkjfaksjdf')).to.be.undefined;
    expect(getScopeFromErrorCode('?="§-kajsdf')).to.be.undefined;

    expect(getScopeFromErrorCode('ASYNC-')).to.be.equal('ASYNC');
    expect(getScopeFromErrorCode('SHUPS-42')).to.be.equal('SHUPS');
    expect(getScopeFromErrorCode('e1337-291')).to.be.equal('e1337');
  });

  it('creates MongoshInternalError', () => {
    const errorNoCode = new MongoshInternalError('Something went wrong.');
    expect(errorNoCode).to.be.instanceOf(MongoshBaseError);
    expect(errorNoCode.name).to.be.equal('MongoshInternalError');
    expect(errorNoCode.message).to.be.equal('Something went wrong.\nThis is an error inside Mongosh. Please file a bug report. Please include a log file from this session.');
    expect(errorNoCode.code).to.be.undefined;

    const errorWithCode = new MongoshInternalError('Something went wrong.', 'SHUPS-42');
    expect(errorWithCode).to.be.instanceOf(MongoshBaseError);
    expect(errorWithCode.name).to.be.equal('MongoshInternalError');
    expect(errorWithCode.message).to.be.equal('[SHUPS-42] Something went wrong.\nThis is an error inside Mongosh. Please file a bug report. Please include a log file from this session.');
    expect(errorWithCode.code).to.be.equal('SHUPS-42');
    expect(errorWithCode.scope).to.be.equal('SHUPS');
  });
  it('creates MongoshUnimplementedError', () => {
    const errorNoCode = new MongoshUnimplementedError('Something went wrong.');
    expect(errorNoCode).to.be.instanceOf(MongoshBaseError);
    expect(errorNoCode.name).to.be.equal('MongoshUnimplementedError');
    expect(errorNoCode.message).to.be.equal('Something went wrong.');
    expect(errorNoCode.code).to.be.undefined;

    const errorWithCode = new MongoshUnimplementedError('Something went wrong.', 'SHUPS-42');
    expect(errorWithCode).to.be.instanceOf(MongoshBaseError);
    expect(errorWithCode.name).to.be.equal('MongoshUnimplementedError');
    expect(errorWithCode.message).to.be.equal('[SHUPS-42] Something went wrong.');
    expect(errorWithCode.code).to.be.equal('SHUPS-42');
    expect(errorWithCode.scope).to.be.equal('SHUPS');
  });
  it('creates MongoshRuntimeError', () => {
    const errorNoCode = new MongoshRuntimeError('Something went wrong.');
    expect(errorNoCode).to.be.instanceOf(MongoshBaseError);
    expect(errorNoCode.name).to.be.equal('MongoshRuntimeError');
    expect(errorNoCode.message).to.be.equal('Something went wrong.');
    expect(errorNoCode.code).to.be.undefined;

    const errorWithCode = new MongoshRuntimeError('Something went wrong.', 'SHUPS-42');
    expect(errorWithCode).to.be.instanceOf(MongoshBaseError);
    expect(errorWithCode.name).to.be.equal('MongoshRuntimeError');
    expect(errorWithCode.message).to.be.equal('[SHUPS-42] Something went wrong.');
    expect(errorWithCode.code).to.be.equal('SHUPS-42');
    expect(errorWithCode.scope).to.be.equal('SHUPS');
  });
  it('creates MongoshInvalidInputError', () => {
    const errorNoCode = new MongoshInvalidInputError('Something went wrong.');
    expect(errorNoCode).to.be.instanceOf(MongoshBaseError);
    expect(errorNoCode.name).to.be.equal('MongoshInvalidInputError');
    expect(errorNoCode.message).to.be.equal('Something went wrong.');
    expect(errorNoCode.code).to.be.undefined;

    const errorWithCode = new MongoshInvalidInputError('Something went wrong.', 'SHUPS-42');
    expect(errorWithCode).to.be.instanceOf(MongoshBaseError);
    expect(errorWithCode.name).to.be.equal('MongoshInvalidInputError');
    expect(errorWithCode.message).to.be.equal('[SHUPS-42] Something went wrong.');
    expect(errorWithCode.code).to.be.equal('SHUPS-42');
    expect(errorWithCode.scope).to.be.equal('SHUPS');
  });
});
