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
  evaluate(code: string): Promise<EvaluationResult>;
}
