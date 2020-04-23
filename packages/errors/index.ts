class MongoshRuntimeError extends Error {
  constructor(...args) {
    super(...args);
    this.name = 'MongoshRuntimeError';
    Error.captureStackTrace(MongoshRuntimeError);
  }
}

class MongoshInternalError extends Error {
  constructor(msg, opts?) {
    super(opts);
    this.name = 'MongoshInternalError';
    this.message =
      msg + '\nThis is an error inside Mongosh. Please file a bug report. '
      + 'Please include a log file from this session.';
    Error.captureStackTrace(MongoshInternalError);
  }
}

class MongoshUnimplementedError extends Error {
  constructor(...args) {
    super(...args);
    this.name = 'MongoshUnimplementedError';
    Error.captureStackTrace(MongoshUnimplementedError);
  }
}

class MongoshInvalidInputError extends Error {
  constructor(...args) {
    super(...args);
    this.name = 'MongoshInvalidInputError';
    Error.captureStackTrace(MongoshInvalidInputError);
  }
}

export { MongoshRuntimeError, MongoshInternalError, MongoshInvalidInputError, MongoshUnimplementedError };
