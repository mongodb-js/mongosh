function getScopeFromErrorCode(code: string | null | undefined): string | undefined {
  if (!code) {
    return undefined;
  }
  const match = code.match(/^([a-zA-Z0-9]+)-/);
  return !match ? undefined : match[1];
}

abstract class MongoshBaseError extends Error {
  readonly code: string | undefined;
  readonly scope: string | undefined;

  constructor(name: string, message: string, code?: string) {
    super(code ? `[${code}] ${message}` : message);
    this.name = name;
    this.code = code;
    this.scope = getScopeFromErrorCode(code);
  }
}

class MongoshRuntimeError extends MongoshBaseError {
  constructor(message: string, code?: string) {
    super('MongoshRuntimeError', message, code);
  }
}

class MongoshInternalError extends MongoshBaseError {
  constructor(message: string, code?: string) {
    super(
      'MongoshInternalError',
      `${message}
This is an error inside Mongosh. Please file a bug report. Please include a log file from this session.`,
      code
    );
  }
}

class MongoshUnimplementedError extends MongoshBaseError {
  constructor(message: string, code?: string) {
    super('MongoshUnimplementedError', message, code);
  }
}

class MongoshInvalidInputError extends MongoshBaseError {
  constructor(message: string, code?: string) {
    super('MongoshInvalidInputError', message, code);
  }
}

class MongoshWarning extends MongoshBaseError {
  constructor(message: string, code?: string) {
    super('MongoshWarning', message, code);
  }
}

class MongoshCommandFailed extends MongoshBaseError {
  constructor(message: string, code?: string) {
    super(
      'MongoshCommandFailed',
      `Command ${message} returned ok: 0. To see the raw results of the command, use 'runCommand' instead.`,
      code
    );
  }
}

export {
  getScopeFromErrorCode,
  MongoshBaseError,
  MongoshWarning,
  MongoshRuntimeError,
  MongoshInternalError,
  MongoshInvalidInputError,
  MongoshUnimplementedError,
  MongoshCommandFailed
};
