import { expect } from 'chai';
import {
  MongoshRuntimeError,
  MongoshInternalError,
  MongoshInvalidInputError,
  MongoshUnimplementedError
} from './index';

describe('errors', () => {
  it('creates MongoshInternalError', () => {
    const error = new MongoshInternalError('Something went wrong.');
    expect(error).to.be.instanceOf(Error);
    expect(error.name).to.be.equal('MongoshInternalError');
    expect(error.message).to.be.equal('Something went wrong.\nThis is an error inside Mongosh. Please file a bug report. Please include a log file from this session.');
  });
  it('creates MongoshUnimplementedError', () => {
    const error = new MongoshUnimplementedError('Something went wrong.');
    expect(error).to.be.instanceOf(Error);
    expect(error.name).to.be.equal('MongoshUnimplementedError');
    expect(error.message).to.be.equal('Something went wrong.');
  });
  it('creates MongoshRuntimeError', () => {
    const error = new MongoshRuntimeError('Something went wrong.');
    expect(error).to.be.instanceOf(Error);
    expect(error.name).to.be.equal('MongoshRuntimeError');
    expect(error.message).to.be.equal('Something went wrong.');
  });
  it('creates MongoshInvalidInputError', () => {
    const error = new MongoshInvalidInputError('Something went wrong.');
    expect(error).to.be.instanceOf(Error);
    expect(error.name).to.be.equal('MongoshInvalidInputError');
    expect(error.message).to.be.equal('Something went wrong.');
  });
});
