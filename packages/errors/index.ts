class MongoshRuntimeError extends Error {
  constructor(...args) {
    super(...args);
    this.name = 'MongoshRuntimeError';
  }
}

class MongoshInternalError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'MongoshInternalError';
    this.message =
      this.message + '\nThis is an error inside Mongosh. Please file a bug report. '
      + 'Please include a log file from this session.';
  }
}

class MongoshUnimplementedError extends Error {
  constructor(...args) {
    super(...args);
    this.name = 'MongoshUnimplementedError';
  }
}

class MongoshInvalidInputError extends Error {
  constructor(...args) {
    super(...args);
    this.name = 'MongoshInvalidInputError';
  }
}

export {
  MongoshRuntimeError,
  MongoshInternalError,
  MongoshInvalidInputError,
  MongoshUnimplementedError
};
