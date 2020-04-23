export default class MongoshRuntimeError extends Error {
  constructor(...args) {
    super(...args);
    this.name = 'MongoshRuntimeError';
    Error.captureStackTrace(MongoshRuntimeError);
  }
}
