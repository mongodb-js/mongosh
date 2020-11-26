
/**
 * @mongoshErrors
 */
enum AsyncRewriterErrors {
  /**
   * Signals the use of destructuring with Mongosh API objects which we currently do not support.
   *
   * Examples causing error:
   * ```
   * const [a, b] = [1, db];
   * const { var1, var2 } = { var1: 1, var2: db };
   * ```
   * Here `db` refresh to the database Mongosh API object and thus cannot be used.
   *
   * This also applies to the use of methods of `db` or `collections` that communicate with the server.
   */
  DestructuringNotImplemented = 'ASYNC-10001',

  /**
   * Signals the dynamic access of a Mongosh API type which we currently do not support.
   *
   * Examples causing error:
   * ```
   * const wrapper = { database: db };
   * const key = 'database';
   * wrapper[key].get(...); // <-- fails
   *
   * const collectionName = 'someColl';
   * db[collectionName].find(...); // <-- fails
   * ```
   * **Solution: Do not use dynamic access but explicit access, e.g. `wrapper.database`, or `db.get('someColl')`.**
   */
  DynamicAccessOfApiType = 'ASYNC-10002',

  /**
   * Signals the use of `this` outside the body of a method of a class declaration.
   * We currently do not support `this` in function or global scope.
   *
   * Examples causing error:
   * ```
   * function usingThis() {
   *   this.x = 5;
   * }
   *
   * const obj = {
   *   memberMethod(): {
   *     this.x = 5;
   *   }
   * };
   * ```
   */
  UsedThisOutsideOfMethodOfClassDeclaration = 'ASYNC-10003',

  /**
   * Signals the use of for-in and for-of loops which we currently do not support.
   *
   * Examples causing error:
   * ```
   * for (let v of anArray) {
   *   ...
   * }
   * for (let key in anObject) {
   *   ...
   * }
   * ```
   *
   * **Solution: rewrite using a regular for loop with counter and/or `Array.forEach` and/or `Object.keys`.**
   */
  ForInForOfUnsupported = 'ASYNC-10005',

  /**
   * Signals an issue where a symbol in a scope can be of different known async types (e.g. `db` and `db.coll`) and/or non-async types (e.g. plain `1`).
   * This error is also raised, when a so far undeclared variable is initialized in an inner block with a Mongosh API type, i.e. it does not support hoisting.
   *
   * Examples causing error:
   * ```
   * if (x < 5) {
   *   a = db; // a is not yet declared, but now initialized in an inner block with Mongosh API type
   *   var b = db; // b is a var and would be hoisted
   * }
   * let a = db; // db is an async type
   * for (let i = 0; i < 5; i++) {
   *   a = 2;
   * }
   * ```
   *
   * **Solution: Do not mix async and non-async types as values of a variable - use separate variables instead and declare variables explicitly before/with initialization.**
   */
  MixedAsyncTypeInScope = 'ASYNC-10006',

  /**
   * Signales that an internal assertion was violated that guards uncovered code paths.
   *
   * This error is only thrown when an assumed impossible situation occurs.
   * The executed code should be sent for analysis.
   */
  UnreachableAssertionViolated = 'ASYNC-90001',
}

export {
  AsyncRewriterErrors
};
