import { Completion } from './autocompleter/autocompleter';
import { ShellResult } from '@mongosh/shell-api';

export type ContextValue = any;

export interface Runtime {
  /**
   * Evaluates code
   *
   * @param {string} code - A string of code
   * @return {Promise<ShellResult>} the result of the evaluation
   */
  evaluate(code: string): Promise<ShellResult>;

  /**
   * Get shell api completions give a code prefix
   *
   * @param {string} code - The code to be completed
   */
  getCompletions(code: string): Promise<Completion[]>;
}
