import { Completion } from './autocompleter/autocompleter';
import { EvaluateOptions } from './interpreter/interpreter';

export type ContextValue = any;

export type EvaluationResult = {
  shellApiType: string;
  value: any;
};

export interface Runtime {

  /**
   * Evaluates code
   *
   * @param {string} code - A string of code
   * @return {Promise<EvaluationResult>} the result of the evaluation
   */
  evaluate(code: string, options?: EvaluateOptions): Promise<EvaluationResult>;

  /**
   * Get shell api completions give a code prefix
   *
   * @param {string} code - The code to be completed
   */
  getCompletions(code: string): Promise<Completion[]>;
}
