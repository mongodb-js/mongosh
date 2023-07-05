import redactSensitiveData from 'mongodb-redact';

export const HIDDEN_COMMANDS = String.raw`\b(createUser|auth|updateUser|changeUserPassword|connect|Mongo)\b`;

/**
 * Modifies the most recent command in history based on sensitive information.
 * If redact option is passed, also redacts sensitive info.
 *
 * @param {String} history - Command string.
 * @param {boolean} redact - Option to redact sensitive info.
 */
export function changeHistory(
  history: string[],
  redact: 'redact-sensitive-data' | 'keep-sensitive-data'
): void {
  if (history.length === 0) return;
  const hiddenCommands = new RegExp(HIDDEN_COMMANDS, 'g');

  if (hiddenCommands.test(history[0])) {
    history.shift();
  } else if (redact === 'redact-sensitive-data') {
    history[0] = redactSensitiveData(history[0]);
  }
}

export { redactSensitiveData };
