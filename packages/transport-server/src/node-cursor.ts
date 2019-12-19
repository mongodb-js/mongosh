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
  allowPartialResults() {
    this.cursor.addCursorFlag(Flag.Partial, true);
    return this;
  }

  batchSize(size) {
    this.cursor.setCursorBatchSize(size);
    return this;
  }
  close() {
    this.cursor.close();
    return this;
  }
  isClosed() {
    return this.cursor.isClosed();
  }
  collation(doc) {
    this.cursor.collation(doc);
    return this;
  }
  comment(cmt) {
    this.cursor.comment(cmt);
    return this;
  }
  count() {
    return this.cursor.count();
  }
  explain() {
    this.cursor.explain();
    return this;
  }
  forEach(f) {
    this.cursor.forEach(f);
    return this;
  }
  hasNext() {
    return this.cursor.hasNext();
  }
  hint(index) {
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
  limit(l) {
    this.cursor.limit(l);
    return this;
  }
  map(f) {
    this.cursor.map(f);
    return this;
  }
  max(indexBounds) {
    this.cursor.max(indexBounds);
    return this;
  }
  maxTimeMS(ms) {
    this.cursor.maxTimeMS(ms);
    return this;
  }
  min(indexBounds) {
    this.cursor.min(indexBounds);
    return this;
  }
  next() {
    return this.cursor.next();
  }
  modifiers() { // TODO
    return this.cursor.cmd;
  }
  noCursorTimeout() {
    this.cursor.addCursorFlag('noCursorTimeout', true);
    return this;
  }
  objsLeftInBatch() {
    // TODO
  }
  oplogReplay() {
    this.cursor.addCursorFlag('oplogReplay', true);
    return this;
  }
  projection(v) {
    this.cursor.project(v);
    return this;
  }
  pretty() {
    // TODO
  }
  readConcern(v) {
    // TODO
  }
  readPref(v) {
    this.cursor.setReadPreference(v);
    return this;
  }
  returnKey() {
    this.cursor.returnKey();
    return this;
  }
  showDiskLoc() {
    this.cursor.showRecordId(true);
    return this;
  }
  showRecordId() {
    this.cursor.showRecordId(true);
    return this;
  }
  size() {
    return this.cursor.count(); // TODO: size same as count?
  }
  skip(s) {
    this.cursor.skip(s);
    return this;
  }
  sort(s) {
    this.cursor.sort(s);
    return this;
  }
  tailable() {
    this.cursor.addCursorFlag('tailable', true);
    return this;
  }
  toArray() {
    return this.cursor.toArray();
  }
}

export default NodeCursor;
export { Flag };
