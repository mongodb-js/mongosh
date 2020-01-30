import redactInfo from 'mongodb-redact';

/**
 * Modifies command history array based on sensitive information.
 * If redact option is passed, also redacts sensitive info.
 *
 * @param {array} History - Array of commands, where the first command is the
 * most recent.
 *
 * @param {boolean} Redact - Option to redact sensitive info.
 */
function changeHistory(history: string[], redact: boolean = false) {
  const hiddenCommands =
    RegExp('createUser|auth|updateUser|changeUserPassword', 'g');

  if (hiddenCommands.test(history[0])) return history.shift();
  if (redact) history[0] = redactInfo(history[0]);
}

export default changeHistory;
