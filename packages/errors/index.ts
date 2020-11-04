class MongoshRuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MongoshRuntimeError';
  }
}

class MongoshInternalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MongoshInternalError';
    this.message =
      this.message + '\nThis is an error inside Mongosh. Please file a bug report. '
      + 'Please include a log file from this session.';
  }
}

class MongoshUnimplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MongoshUnimplementedError';
  }
}

class MongoshInvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MongoshInvalidInputError';
  }
}

class MongoshWarning extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MongoshWarning';
  }
}

class MongoshCommandFailed extends Error {
  constructor(message: string) {
    super(`Command ${message} returned ok: 0. To see the raw results of the command, use 'runCommand' instead.`);
    this.name = 'MongoshCommandFailed';
  }
}

export {
  MongoshWarning,
  MongoshRuntimeError,
  MongoshInternalError,
  MongoshInvalidInputError,
  MongoshUnimplementedError,
  MongoshCommandFailed
};
