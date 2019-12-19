import { Cursor as NativeCursor } from 'mongodb';
import { Cursor } from 'mongosh-transport-core';

/**
 * Enum for the available cursor flags.
 */
const enum Flag {
  Tailable = 'tailable',
  SlaveOk = 'slaveOk',
  OplogReplay = 'oplogReplay',
  NoTimeout = 'noTimeout',
  AwaitData = 'awaitData',
  Exhaust = 'exhaust',
  Partial = 'partial'
}

/**
 * The cursor flags.
 */
const FLAGS = {
  2: Flag.Tailable,
  4: Flag.SlaveOk,
  8: Flag.OplogReplay,
  16: Flag.NoTimeout,
  32: Flag.AwaitData,
  64: Flag.Exhaust,
  128: Flag.Partial
};

/**
 * Cursor implementation for the Node driver. Wraps the various
 * Node cursors.
 */
class NodeCursor implements Cursor {
  private readonly cursor: NativeCursor;

  /**
   * Create the new Node cursor.
   *
   * @param {NativeCursor} cursor - The native Node cursor.
   */
  constructor(cursor) {
    this.cursor = cursor;
  }

  /**
   * Add a cursor flag as an option to the cursor.
   *
   * @param {number} option - The flag number.
   *
   * @returns {NodeCursor} The cursor.
   */
  addOption(option: number): NodeCursor {
    const opt = FLAGS[option];
    if (opt === Flag.SlaveOk || !opt) {
      return this; // TODO
    }
    this.cursor.addCursorFlag(opt, true);
    return this;
  }

  /**
   * Set cursor to allow partial results.
   *
   * @returns {NodeCursor} The cursor.
   */
  allowPartialResults(): NodeCursor {
    return this.addFlag(Flag.Partial);
  }

  /**
   * Set the cursor batch size.
   *
   * @param {number} size - The batch size.
   *
   * @returns {NodeCursor} The cursor.
   */
  batchSize(size: number): NodeCursor {
    this.cursor.batchSize(size);
    return this;
  }

  /**
   * Close the cursor.
   *
   * @returns {NodeCursor} The cursor.
   */
  close(options: Document): NodeCursor {
    this.cursor.close(options);
    return this;
  }

  /**
   * Determine if the cursor has been closed.
   *
   * @returns {boolean} If the cursor is closed.
   */
  isClosed(): boolean {
    return this.cursor.isClosed();
  }

  /**
   * Set the collation on the cursor.
   *
   * @param {Document} spec - The collation.
   *
   * @returns {NodeCursor} The cursor.
   */
  collation(spec: Document): NodeCursor {
    this.cursor.collation(spec);
    return this;
  }

  /**
   * Add a comment to the cursor.
   *
   * @param {string} cmt - The comment.
   *
   * @returns {NodeCursor} The cursor.
   */
  comment(cmt: string) {
    this.cursor.comment(cmt);
    return this;
  }

  /**
   * Get the count from the cursor.
   *
   * @returns {Promise<number>} The count.
   */
  count(): Promise<number> {
    return this.cursor.count();
  }

  /**
   * Tell the cursor to execute an explain plan.
   *
   * @returns {NodeCursor} The cursor.
   */
  explain(): NodeCursor {
    this.cursor.explain();
    return this;
  }

  forEach(f) {
    this.cursor.forEach(f);
    return this;
  }

  /**
   * Does the cursor have a next document?
   *
   * @returns {boolean} If there is a next document.
   */
  hasNext(): boolean {
    return this.cursor.hasNext();
  }

  /**
   * Set a hint for indexes on the cursor.
   *
   * @param {string} index - The index hint.
   *
   * @returns {NodeCursor} The cursor.
   */
  hint(index: string): NodeCursor {
    this.cursor.hint(index);
    return this;
  }

  getQueryPlan() {
    this.cursor.explain('executionStats');
    return this;
  }

  isExhausted() {
    return this.cursor.isClosed() && !this.cursor.hasNext();
  }

  itcount() {
    return this.cursor.toArray().length;
  }

  /**
   * Set the limit of documents to return.
   *
   * @param {number} value - The limit value.
   *
   * @returns {NodeCursor} The cursor.
   */
  limit(value: number): NodeCursor {
    this.cursor.limit(value);
    return this;
  }

  map(f) {
    this.cursor.map(f);
    return this;
  }

  /**
   * Set the max index bounds.
   *
   * @param {Document} indexBounds - The max bounds.
   *
   * @returns {NodeCursor} The cursor.
   */
  max(indexBounds: Document): NodeCursor {
    this.cursor.max(indexBounds);
    return this;
  }

  /**
   * Set the maxTimeMS value.
   *
   * @param {number} The maxTimeMS value.
   *
   * @returns {NodeCursor} The cursor.
   */
  maxTimeMS(value: number): NodeCursor {
    this.cursor.maxTimeMS(value);
    return this;
  }

  /**
   * Set the min index bounds.
   *
   * @param {Document} indexBounds - The min bounds.
   *
   * @returns {NodeCursor} The cursor.
   */
  min(indexBounds: Document): NodeCursor {
    this.cursor.min(indexBounds);
    return this;
  }

  next() {
    return this.cursor.next();
  }

  modifiers() { // TODO
    return this.cursor.cmd;
  }

  /**
   * Tell the cursor not to timeout.
   *
   * @returns {NodeCursor} The cursor.
   */
  noTimeout() {
    return this.addFlag(Flag.NoTimeout);
  }

  objsLeftInBatch() {
    // TODO
  }

  /**
   * Flag the cursor as an oplog replay.
   *
   * @returns {NodeCursor} The cursor.
   */
  oplogReplay(): NodeCursor {
    return this.addFlag(Flag.OplogReplay);
  }

  /**
   * Set the projection on the cursor.
   *
   * @param {Document} spec - The projection.
   *
   * @returns {NodeCursor} The cursor.
   */
  projection(spec: Document): NodeCursor {
    this.cursor.project(spec);
    return this;
  }

  pretty() {
    // TODO
  }

  readConcern(v) {
    // TODO
  }

  /**
   * Set the read preference.
   *
   * @param {string} preference - The read preference.
   *
   * @returns {NodeCursor} The cursor.
   */
  readPref(preference: string): NodeCursor {
    this.cursor.setReadPreference(preference);
    return this;
  }

  /**
   * Set the cursor to return the index field.
   *
   * @param {boolean} enabled - Whether to enable return key.
   *
   * @returns {NodeCursor} The cursor.
   */
  returnKey(enabled: boolean): NodeCursor {
    this.cursor.returnKey(enabled);
    return this;
  }

  /**
   * Enable showing disk location.
   *
   * @returns {NodeCursor} The cursor.
   */
  showDiskLoc(): NodeCursor {
    this.cursor.showRecordId(true);
    return this;
  }

  /**
   * Enable/disable showing the disk location.
   *
   * @param {boolean} enabled - The value.
   *
   * @returns {NodeCursor} The cursor.
   */
  showRecordId(enabled: boolean): NodeCursor {
    this.cursor.showRecordId(enabled);
    return this;
  }

  size() {
    return this.cursor.count(); // TODO: size same as count?
  }

  /**
   * Set the skip value.
   *
   * @param {number} value - The number of docs to skip.
   *
   * @returns {NodeCursor} The cursor.
   */
  skip(value: number): NodeCursor {
    this.cursor.skip(value);
    return this;
  }

  /**
   * Set the sort on the cursor.
   *
   * @param {Document} spec - The sort.
   *
   * @returns {NodeCursor} The cursor.
   */
  sort(spec: Document): NodeCursor {
    this.cursor.sort(spec);
    return this;
  }

  /**
   * Flag the cursor as tailable.
   *
   * @returns {NodeCursor} The cursor.
   */
  tailable(): NodeCursor {
    return this.addFlag(Flag.Tailable);
  }

  toArray() {
    return this.cursor.toArray();
  }

  /**
   * Add a flag and return the cursor.
   *
   * @param {Flag} flag - The cursor flag.
   *
   * @returns {NodeCursor} The cursor.
   */
  private addFlag(flag: Flag): NodeCursor {
    this.cursor.addCursorFlag(flag, true);
    return this;
  }
}

export default NodeCursor;
export { Flag };
