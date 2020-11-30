
/**
 * @mongoshErrors
 */
enum ServiceProviderServerErrors {
  /**
   * Signals an error while running a database command that should have already
   * thrown an error.
   *
   * Please file a bug report and attach the current log file for analysis.
   */
  CommandFailed = 'SVCPSRV-90001'
}

export {
  ServiceProviderServerErrors
};
