
/**
 * @mongoshErrors
 */
enum CommonErrors {
  /**
   * Signals calling an API method with an invalid argument.
   *
   * **Solution: See the error output for details on allowed argument values.**
   */
  InvalidArgument = 'COMMON-10001',

  /**
   * Signals calling an API method that has been deprecated or using an argument or option of an API method that has been deprecated
   * and therefore is no longer supported.
   *
   * **Solution: See the error output for details on alternatives or consult the official documentation.**
   */
  DeprecatedMethod = 'COMMON-10002',

  /**
   * Signals an error while running a specific command against the database.
   *
   * **Solution: Run the command directly using `runCommand` to see the full result.**
   */
  CommandFailed = 'COMMON-10003',

  /**
   * Signals an unexpected internal error of mongosh.
   *
   * **Please file a bug report for the `MONGOSH` project here: https://jira.mongodb.org.**
   */
  UnexpectedInternalError = 'COMMON-90001',
}

export {
  CommonErrors
};
