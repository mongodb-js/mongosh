// Note: Codes are shared with the old async rewriter for now, hence starting at 10012

/**
 * @mongoshErrors
 */
export const AsyncRewriterErrors = {
  /**
   * Signals the use of a Mongosh API call in a place where it is not supported.
   * This occurs inside of constructors and (non-async) generator functions.
   *
   * Examples causing error:
   * ```javascript
   * class SomeClass {
   *   constructor() {
   *     this.list = db.coll.find().toArray();
   *   }
   * }
   *
   * function*() {
   *   yield* db.coll.find().toArray();
   * }
   * ```
   *
   * **Solution: Do not use calls directly in such functions. If necessary, place these calls in an inner 'async' function.**
   */
  SyntheticPromiseInAlwaysSyncContext: 'ASYNC-10012',
  /**
   * Signals the iteration of a Mongosh API object in a place where it is not supported.
   * This occurs inside of constructors and (non-async) generator functions.
   *
   * Examples causing error:
   * ```javascript
   * class SomeClass {
   *   constructor() {
   *     for (const item of db.coll.find()) { ... }
   *   }
   * }
   *
   * function*() {
   *   for (const item of db.coll.find()) yield item;
   *   yield* db.coll.find();
   * }
   * ```
   *
   * **Solution: Do not use calls directly in such functions. If necessary, place these calls in an inner 'async' function.**
   */
  SyntheticAsyncIterableInAlwaysSyncContext: 'ASYNC-10013',
} as const;
