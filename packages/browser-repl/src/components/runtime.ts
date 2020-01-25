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

  /**
   * Setup for the runtime.
   *
   * @return {Promise} a promise resolving once the runtime is initialized.
   */
  initialize(): Promise<void>;

  /**
   * Clean up resources that would otherwise
   * leak (ie. listeners, elements attached to the dom).
   *
   * @return {Promise} a promise resolving once the runtime is destroyed.
   */
  destroy(): Promise<void>;
}
