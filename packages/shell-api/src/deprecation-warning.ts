// TODO: Integrate this into ShellInstanceState.
// The set of shown warnings should not be global, but rather per-Shell,
// and we should not be using methods like console.warn inside the
// shell-api package either (because we should generally stick to
// what's in the language itself, not the specific runtime environments).
const warningShown: Set<string> = new Set();

/**
 * Prints deprecation warning message once
 *
 * @param message Deprecation message
 * @param warn Printing method (default: `console.warn`)
 */
export function printDeprecationWarning(
  message: string,
  warn = console.warn
) {
  if (!warningShown.has(message)) {
    warningShown.add(message);
    warn(`DeprecationWarning: ${message}`);
  }
}

export function printWarning(
  message: string,
  warn = console.warn
) {
  if (!warningShown.has(message)) {
    warningShown.add(message);
    warn(`Warning: ${message}`);
  }
}
