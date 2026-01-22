/**
 * @mongoshErrors
 */
export const CliReplErrors = {
  /**
   * Signals that the currently installed Node version does not match the one expected by mongosh.
   *
   * See the output for further details on the required Node version.
   */
  NodeVersionMismatch: 'CLIREPL-10001',
} as const;
