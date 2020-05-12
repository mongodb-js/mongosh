/**
 * Evaluation result is a simplified
 * representation of a shell api type instance.
 *
 * It is intended to be returned as result of calling
 * `[[toEvaluationResult]]` on any of the shell api types.
 */
export interface EvaluationResult {
  readonly type: string;
  readonly value: any;
}

/**
 * Symbol to get a handle on the [[toEvaluationResult]] method on api types
 */
export const toEvaluationResult: unique symbol = Symbol('toEvaluationResult');

export interface Evaluable {
  /**
   * Returns a representation of the api type that is
   * suitable to be used as evaluation result.
   *
   * In most cases this method would return a stripped down
   * instance of the type or a preformatted string.
   *
   * In some cases this method would actually perform actions to
   * fetch data and materialize the type as an evaluation result.
   *
   * @example - Cursor
   *
   * A particular implementation example is for cursors.
   * A cursor can be assigned to a variable and never be actually
   * executed until it becomes a result of evaluation.
   *
   * The following input is valid and should return the first 20 documents
   * after skipping the first one:
   *
   * ```
   * > c = db.coll1.find(); c.skip(1)
   * ```
   */
  [toEvaluationResult](): Promise<EvaluationResult>;
}
