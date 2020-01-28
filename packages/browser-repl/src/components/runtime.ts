// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ContextValue = any;

export type EvaluationResult = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
