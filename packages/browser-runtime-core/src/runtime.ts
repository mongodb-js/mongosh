import { Completion } from './autocompleter/autocompleter';
import { ShellResult, EvaluationListener } from '@mongosh/shell-evaluator';

export type ContextValue = any;

export interface Runtime {
  /**
   * Sets a listener for certain events, e.g. onPrint() when print() is called
   * in the shell.
   *
   * @param {EvaluationListener} listener - The new listener.
   * @return {EvaluationListener | null} The previous listener, if any.
   */
  setEvaluationListener(listener: EvaluationListener): EvaluationListener | null;

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
