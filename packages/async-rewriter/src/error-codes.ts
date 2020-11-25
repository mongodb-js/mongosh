
enum AsyncRewriterErrors {
  /**
   * Identifies an error where object destructuring was used with Mongosh API objects which we currently do not support.
   *
   * To prevent this error, refrain from using object destructuring.
   */
  DestructuringNotImplemented = 'ASYNC-10001'
}

export {
  AsyncRewriterErrors
};
