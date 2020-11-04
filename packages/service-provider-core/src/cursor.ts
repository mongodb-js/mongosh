import Document from './document';

/**
 * This is the interface based on the Node driver cursor.
 * For future stitch cursors we will need to write a wrapper layer that
 * makes the API the same as the Node driver.
 */
/**
 * Enum for the available cursor flags.
 */
export const enum CursorFlag {
  Tailable = 'tailable',
  SlaveOk = 'slaveOk',
  OplogReplay = 'oplogReplay',
  NoTimeout = 'noCursorTimeout',
  AwaitData = 'awaitData',
  Exhaust = 'exhaust',
  Partial = 'partial'
}

/**
 * The cursor flags.
 */
export const CURSOR_FLAGS = {
  2: CursorFlag.Tailable,
  4: CursorFlag.SlaveOk,
  8: CursorFlag.OplogReplay,
  16: CursorFlag.NoTimeout,
  32: CursorFlag.AwaitData,
  64: CursorFlag.Exhaust,
  128: CursorFlag.Partial
};

export default interface ServiceProviderCursor {
  addCursorFlag(flag: CursorFlag, value: boolean): any;

  /**
   * Set the read preference.
   *
   * @param {string | ReadPreference } mode - the new read preference.
   *
   * @returns {ServiceProviderCursor}
   */
  setReadPreference(mode: any): ServiceProviderCursor;

  /**
   * Set the cursor batch size.
   *
   * @param {number} size - The batch size.
   *
   * @returns {ServiceProviderCursor} The cursor.
   */
  batchSize(size: number): ServiceProviderCursor;

  /**
   * Close the cursor.
   *
   * @returns {ServiceProviderCursor} The cursor.
   */
  close(options: Document): Promise<unknown>;

  /**
   * Clone the cursor.
   *
   * @returns {ServiceProviderCursor} The cursor.
   */
  clone(): ServiceProviderCursor;

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
   * @returns {ServiceProviderCursor} The cursor.
   */
  collation(spec: Document): ServiceProviderCursor;

  /**
   * Add a comment to the cursor.
   *
   * @param {string} cmt - The comment.
   *
   * @returns {ServiceProviderCursor} The cursor.
   */
  comment(cmt: string): ServiceProviderCursor;

  /**
   * Get the count from the cursor.
   *
   * @returns {Promise<number>} The count.
   */
  count(): Promise<number>;


  forEach(f: (doc: Document) => void): Promise<void>;

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
   * @returns {ServiceProviderCursor} The cursor.
   */
  hint(index: string): ServiceProviderCursor;

  /**
   * Set the limit of documents to return.
   *
   * @param {number} value - The limit value.
   *
   * @returns {ServiceProviderCursor} The cursor.
   */
  limit(value: number): ServiceProviderCursor;

  map(f: (doc: Document) => Document): ServiceProviderCursor;

  /**
   * Set the max index bounds.
   *
   * @param {Document} indexBounds - The max bounds.
   *
   * @returns {ServiceProviderCursor} The cursor.
   */
  max(indexBounds: Document): ServiceProviderCursor;

  /**
   * Set the maxTimeMS value.
   *
   * @param {number} The maxTimeMS value.
   *
   * @returns {ServiceProviderCursor} The cursor.
   */
  maxTimeMS(value: number): ServiceProviderCursor;

  /**
   * Set the maxAwaitTimeMS value.
   *
   * @param {number} The maxAwaitTimeMS value.
   *
   * @returns {ServiceProviderCursor} The cursor.
   */
  maxAwaitTimeMS(value: number): ServiceProviderCursor;

  /**
   * Set the min index bounds.
   *
   * @param {Document} indexBounds - The min bounds.
   *
   * @returns {ServiceProviderCursor} The cursor.
   */
  min(indexBounds: Document): ServiceProviderCursor;

  next(): Promise<any>;

  /**
   * Set the projection on the cursor.
   *
   * @param {Document} spec - The projection.
   *
   * @returns {ServiceProviderCursor} The cursor.
   */
  project(spec: Document): ServiceProviderCursor;

  /**
   * Set the cursor to return the index field.
   *
   * @param {boolean} enabled - Whether to enable return key.
   *
   * @returns {ServiceProviderCursor} The cursor.
   */
  returnKey(enabled: boolean): ServiceProviderCursor;

  /**
   * Set the skip value.
   *
   * @param {number} value - The number of docs to skip.
   *
   * @returns {ServiceProviderCursor} The cursor.
   */
  skip(value: number): ServiceProviderCursor;

  /**
   * Set the sort on the cursor.
   *
   * @param {Document} spec - The sort.
   *
   * @returns {ServiceProviderCursor} The cursor.
   */
  sort(spec: Document): ServiceProviderCursor;

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

  /**
   * Set the showRecordId flag to true.
   */
  showRecordId(recordId: boolean): ServiceProviderCursor;

  /**
   * Current buffered documents length.
   */
  bufferedCount(): number;
}

