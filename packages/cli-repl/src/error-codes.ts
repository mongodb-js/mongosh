
/**
 * @mongoshErrors
 */
enum CliReplErrors {
  /**
   * Signals that the currently installed Node version does not match the one expected by mongosh.
   *
   * See the output for further details on the required Node version.
   */
  NodeVersionMismatch = 'CLIREPL-10001',

  /**
   * Signals that mongosh continued to run despite an exit being trigger.
   *
   * Please file a bug report and attach the current log file for analysis.
   */
  UnexpectedExitReturn = 'CLIREPL-90001'
}

export {
  CliReplErrors
};
