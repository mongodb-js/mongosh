import Document from './document';

interface Cursor {
  /**
   * Add a cursor flag as an option to the cursor.
   *
   * @param {number} option - The flag number.
   *
   * @returns {Cursor} The cursor.
   */
  addOption(option: number): Cursor

  /**
   * Set cursor to allow partial results.
   *
   * @returns {Cursor} The cursor.
   */
  allowPartialResults(): Cursor;

  /**
   * Set the cursor batch size.
   *
   * @param {number} size - The batch size.
   *
   * @returns {Cursor} The cursor.
   */
  batchSize(size: number): Cursor;

  /**
   * Close the cursor.
   *
   * @returns {Cursor} The cursor.
   */
  close(options: Document): Promise<void>;

  /**
   * Clone the cursor.
   *
   * @returns {Cursor} The cursor.
   */
  clone(): Cursor;

  /**
   * Determine if the cursor has been closed.
   *
   * @returns {boolean} If the cursor is closed.
   */
  isClosed(): boolean;

  /**
   * Set the collation on the cursor.
   *
   * @param {Document} spec - The collation.
   *
   * @returns {Cursor} The cursor.
   */
  collation(spec: Document): Cursor;

  /**
   * Add a comment to the cursor.
   *
   * @param {string} cmt - The comment.
   *
   * @returns {Cursor} The cursor.
   */
  comment(cmt: string): Cursor;

  /**
   * Get the count from the cursor.
   *
   * @returns {Promise<number>} The count.
   */
  count(): Promise<number>;


  forEach(f): Promise<void>;

  /**
   * Does the cursor have a next document?
   *
   * @returns {Promise<boolean>} If there is a next document.
   */
  hasNext(): Promise<boolean>;

  /**
   * Set a hint for indexes on the cursor.
   *
   * @param {string} index - The index hint.
   *
   * @returns {Cursor} The cursor.
   */
  hint(index: string): Cursor;

  /**
   * cursor.isExhausted() returns true if the cursor is closed and there are no
   * remaining objects in the batch.
   *
   * @returns Promise<boolean> - whether the cursor is exhausted
   */
  isExhausted(): Promise<boolean>;

  itcount(): Promise<number>;

  /**
   * Set the limit of documents to return.
   *
   * @param {number} value - The limit value.
   *
   * @returns {Cursor} The cursor.
   */
  limit(value: number): Cursor;

  map(f): Cursor;

  /**
   * Set the max index bounds.
   *
   * @param {Document} indexBounds - The max bounds.
   *
   * @returns {Cursor} The cursor.
   */
  max(indexBounds: Document): Cursor;

  /**
   * Set the maxTimeMS value.
   *
   * @param {number} The maxTimeMS value.
   *
   * @returns {Cursor} The cursor.
   */
  maxTimeMS(value: number): Cursor;

  /**
   * Set the min index bounds.
   *
   * @param {Document} indexBounds - The min bounds.
   *
   * @returns {Cursor} The cursor.
   */
  min(indexBounds: Document): Cursor;

  next(): Promise<any>;

  /**
   * Tell the cursor not to timeout.
   *
   * @returns {Cursor} The cursor.
   */
  noCursorTimeout(): Cursor;

  /**
   * Flag the cursor as an oplog replay.
   *
   * @returns {Cursor} The cursor.
   */
  oplogReplay(): Cursor;

  /**
   * Set the projection on the cursor.
   *
   * @param {Document} spec - The projection.
   *
   * @returns {Cursor} The cursor.
   */
  projection(spec: Document): Cursor;

  /**
   * Set the cursor to return the index field.
   *
   * @param {boolean} enabled - Whether to enable return key.
   *
   * @returns {Cursor} The cursor.
   */
  returnKey(enabled: boolean): Cursor;

  size(): Promise<number>;

  /**
   * Set the skip value.
   *
   * @param {number} value - The number of docs to skip.
   *
   * @returns {Cursor} The cursor.
   */
  skip(value: number): Cursor;

  /**
   * Set the sort on the cursor.
   *
   * @param {Document} spec - The sort.
   *
   * @returns {Cursor} The cursor.
   */
  sort(spec: Document): Cursor;

  /**
   * Flag the cursor as tailable.
   *
   * @returns {Cursor} The cursor.
   */
  tailable(): Cursor;

  /**
   * Set read preference for the cursor.
   *
   * @param {string} mode - the read preference mode
   * @param {Document[]} [tagSet] - the tag set
   * @returns {Cursor}
   */
  readPref(mode: string, tagSet?: Document[]): Cursor;

  /**
   * Get the documents from the cursor as an array of objects.
   */
  toArray(): Promise<Document[]>;

  /**
   * Get the explain of the cursor.
   *
   * @param {string} verbosity - the explain verbosity.
   * @returns {Promise<any>}
   */
  explain(verbosity: string): Promise<any>;
}

export default Cursor;
