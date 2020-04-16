import { Runtime } from '@mongosh/browser-runtime-core';
import { ShellOutputEntry } from './shell-output';

export interface ShellProps {
  /* The runtime used to evaluate code.
  */
  runtime: Runtime;

  /* A function called each time the output changes with an array of
   * ShellOutputEntryes.
   */
  onOutputChanged?: (output: readonly ShellOutputEntry[]) => void;

  /* A function called each time the history changes
   * with an array of history entries ordered from the most recent to
   * the oldest entry.
   */
  onHistoryChanged?: (history: readonly string[]) => void;

  /* If set, the shell will omit or redact entries containing sensitive
   * info from history. Defaults to `false`.
   */
  redactInfo?: boolean;

  /* The maxiumum number of lines to keep in the output.
   * Defaults to `1000`.
   */
  maxOutputLength?: number;

  /* The maxiumum number of lines to keep in the history.
   * Defaults to `1000`.
   */
  maxHistoryLength?: number;

  /* An array of entries to be displayed in the output area.
   *
   * Can be used to restore the output between sessions, or to setup
   * a greeting message.
   *
   * Note: new entries will not be appended to the array.
   */
  initialOutput?: readonly ShellOutputEntry[];

  /* An array of history entries to prepopulate the history.
   *
   * Can be used to restore the history between sessions.
   *
   * Entries must be ordered from the most recent to the oldest.
   *
   * Note: new entries will not be appended to the array.
   */
  initialHistory?: readonly string[];
}
