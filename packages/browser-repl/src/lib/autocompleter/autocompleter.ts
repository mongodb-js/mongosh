/**
 * A completion item
 *
 * @example
 *
 * ``` js
 * {
 *   caption: 'db.coll1.find',
 *   value: 'find'
 * }
 * ```
 */
export interface Completion {

  /**
   * The string to be displayed for presentation
   */
  caption: string;

  /**
   * The string to be inserted in the text
   */
  value: string;
}

export interface Autocompleter {
  getCompletions(code: string): Promise<Completion[]>;
}
