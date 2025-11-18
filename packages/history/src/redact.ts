// TODO: This will completely be replaced by mongodb-redact once it is released

/**
 * Regex pattern for commands that contain sensitive information and should be
 * completely removed from history rather than redacted.
 *
 * These commands typically involve authentication or connection strings with credentials.
 */
const HIDDEN_COMMANDS = String.raw`\b(createUser|auth|updateUser|changeUserPassword|connect|Mongo)\b`;

/**
 * Checks if a mongosh command should be redacted because it often contains sensitive information like credentials.
 *
 * @param input - The command string to check
 * @returns true if the command should be hidden/redacted, false otherwise
 *
 * @example
 * ```typescript
 * shouldRedactCommand('db.createUser({user: "admin", pwd: "secret"})')
 * // Returns: true
 *
 * shouldRedactCommand('db.getUsers()')
 * // Returns: false
 * ```
 */
export function shouldRedactCommand(input: string): boolean {
  const hiddenCommands = new RegExp(HIDDEN_COMMANDS, 'g');
  return hiddenCommands.test(input);
}

import { redactConnectionString } from 'mongodb-connection-string-url';

export function redactUriCredentials(uri: string): string {
  return redactConnectionString(uri);
}
