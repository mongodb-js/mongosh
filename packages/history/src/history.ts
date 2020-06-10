import redactInfo from 'mongodb-redact';
import redactPwd from './redact-pwd';

/**
 * Modifies command history array based on sensitive information.
 * If redact option is passed, also redacts sensitive info.
 *
 * @param {array} History - Array of commands, where the first command is the
 * most recent.
 *
 * @param {boolean} Redact - Option to redact sensitive info.
 */
export function changeHistory(history: string[], redact = false): void {
  const hiddenCommands =
    RegExp('createUser|auth|updateUser|changeUserPassword|connect', 'g');

  if (hiddenCommands.test(history[0])) {
    history.shift();
    return;
  }
  if (/Mongo\(([^+)]+)\)/g.test(history[0])) {
    history[0] = history[0].replace(/Mongo\(([^+)]+)\)/g, (substr) => redactPwd(substr));
    return;
  }

  if (redact) history[0] = redactInfo(history[0]);
}

