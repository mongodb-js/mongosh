import { shouldRedactCommand } from './redact';
import { redact } from 'mongodb-redact';

/**
 * Modifies the most recent command in history based on sensitive information.
 * If redact option is passed, also redacts sensitive info.
 *
 * @param {String} history - Command string.
 * @param {boolean} redact - Option to redact sensitive info.
 */
export function changeHistory(
  history: string[],
  redactMode: 'redact-sensitive-data' | 'keep-sensitive-data'
): void {
  if (history.length === 0) return;

  if (shouldRedactCommand(history[0])) {
    history.shift();
  } else if (redactMode === 'redact-sensitive-data') {
    history[0] = redact(history[0]);
  }
}
