
/**
 * @mongoshErrors
 */
enum ServiceProviderCoreErrors {
  /**
   * Signals one of the following issues:
   * - A connection string was given and the `host` or `port` parameters were specified
   * - A `host` was specified including a port but `port` was also specified with a different value
   *
   * **Solution: Do not specify `host`/`port` when using a connection string or do not specify additional `port`
   * when specifying `host` including a port value.**
   */
  InvalidHostAndPortOptions = 'SVCPCORE-10001',

  /**
   * Signals an invalid URI being given as a connection string.
   *
   * **Solution: Provide a correct URI including at least the host to use as a connection string.**
   */
  InvalidUri = 'SVCPCORE-10002',

  /**
   * Signals an internal error due to a missing library.
   *
   * Please file a bug report and attach the current log file for analysis.
   */
  BsonLibraryMissing = 'SVCPCORE-90001',
}

export {
  ServiceProviderCoreErrors
};
