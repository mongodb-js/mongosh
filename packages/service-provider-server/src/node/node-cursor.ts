import { Cursor as NativeCursor, CollationDocument } from 'mongodb';
import { Cursor } from '@mongosh/service-provider-core';
import { MongoshUnimplementedError, MongoshInvalidInputError } from '@mongosh/errors';

/**
 * Enum for the available cursor flags.
 */
const enum Flag {
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
   * @param {number} optionFlagNumber - The flag number.
   *
   * @returns {NodeCursor} The cursor.
   */
  addOption(optionFlagNumber: number): NodeCursor {
    const optionFlag = FLAGS[optionFlagNumber];

    if (!optionFlag) {
      throw new MongoshInvalidInputError(`Unknown option flag number: ${optionFlagNumber}.`);
    }

    if (optionFlag === Flag.SlaveOk) {
      throw new MongoshUnimplementedError('the slaveOk option is not yet supported.');
    }

    this.cursor.addCursorFlag(optionFlag, true);
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
  async close(options: Document): Promise<void> {
    await this.cursor.close(options as any);
  }

  /**
   * Clone the cursor.
   *
   * @returns {NodeCursor} The cursor.
   */
  clone(): Cursor {
    return this.cursor.clone();
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
  collation(spec: CollationDocument): NodeCursor {
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
  comment(cmt: string): NodeCursor {
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

  async forEach(f): Promise<void> {
    await this.cursor.forEach(f);
  }

  /**
   * Does the cursor have a next document?
   *
   * @returns {Promise<boolean>} If there is a next document.
   */
  async hasNext(): Promise<boolean> {
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

  /**
   * cursor.isExhausted() returns true if the cursor is closed and there are no
   * remaining objects in the batch.
   *
   * @returns Promise<boolean> - whether the cursor is exhausted
   */
  async isExhausted(): Promise<boolean> {
    return this.cursor.isClosed() && !await this.cursor.hasNext();
  }

  async itcount(): Promise<number> {
    let count = 0;

    while (await this.hasNext()) {
      await this.next();
      count++;
    }

    return count;
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

  map(f): NodeCursor {
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

  next(): Promise<any> {
    return this.cursor.next();
  }

  /**
   * Tell the cursor not to timeout.
   *
   * @returns {NodeCursor} The cursor.
   */
  noCursorTimeout(): NodeCursor {
    this.addFlag(Flag.NoTimeout);
    return this;
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

  /**
   * Set the read preference.
   *
   * @param {string} preference - The read preference.
   * @param {string} tagSet - The tag set.
   *
   * @returns {NodeCursor} The cursor.
   */
  readPref(mode: string, tagSet?: Document[]): NodeCursor {
    if (tagSet) {
      throw new MongoshUnimplementedError('the tagSet argument is not yet supported.');
    }

    this.cursor.setReadPreference(mode as any);

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
    this.cursor.returnKey(enabled as any);
    return this;
  }

  size(): Promise<number> {
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

  toArray(): Promise<any[]> {
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

  // TODO: we should probably move this in the mapper
  // layer
  async explain(verbosity: string): Promise<any> {
    // NOTE: the node driver always returns the full explain plan
    // for Cursor and the queryPlanner explain for AggregationCursor.

    const fullExplain: any = await this.cursor.explain();

    const explain: any = {
      ...fullExplain
    };

    if (
      verbosity !== 'executionStats' &&
      verbosity !== 'allPlansExecution' &&
      explain.executionStats
    ) {
      delete explain.executionStats;
    }

    if (verbosity === 'executionStats' &&
      explain.executionStats &&
      explain.executionStats.allPlansExecution) {
      delete explain.executionStats.allPlansExecution;
    }

    return explain;
  }
}

export default NodeCursor;
export { Flag };
