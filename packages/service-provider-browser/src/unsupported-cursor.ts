import { Document, Cursor } from '@mongosh/service-provider-core';

/**
 * Defines a cursor for an unsupported operation.
 */
class UnsupportedCursor implements Cursor {
  private readonly message: string;

  /**
   * Create the unsupported cursor with a rejection message.
   *
   * @param {String} message - The message.
   */
  constructor(message: string) {
    this.message = message;
  }

  addOption(option: number): Cursor {
    throw new Error("Method not implemented.");
  }

  allowPartialResults(): Cursor {
    throw new Error("Method not implemented.");
  }

  batchSize(size: number): Cursor {
    throw new Error("Method not implemented.");
  }

  close(options: Document): Promise<void> {
    throw new Error("Method not implemented.");
  }

  clone(): Cursor {
    throw new Error("Method not implemented.");
  }

  isClosed(): boolean {
    throw new Error("Method not implemented.");
  }

  collation(spec: Document): Cursor {
    throw new Error("Method not implemented.");
  }

  comment(cmt: string): Cursor {
    throw new Error("Method not implemented.");
  }

  count(): Promise<number> {
    throw new Error("Method not implemented.");
  }

  forEach(f: any): Promise<void> {
    throw new Error("Method not implemented.");
  }

  hasNext(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  hint(index: string): Cursor {
    throw new Error("Method not implemented.");
  }

  isExhausted(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  itcount(): Promise<number> {
    throw new Error("Method not implemented.");
  }

  limit(value: number): Cursor {
    throw new Error("Method not implemented.");
  }

  map(f: any): Cursor {
    throw new Error("Method not implemented.");
  }

  max(indexBounds: Document): Cursor {
    throw new Error("Method not implemented.");
  }

  maxTimeMS(value: number): Cursor {
    throw new Error("Method not implemented.");
  }

  min(indexBounds: Document): Cursor {
    throw new Error("Method not implemented.");
  }

  next(): Promise<any> {
    throw new Error("Method not implemented.");
  }

  noCursorTimeout(): Cursor {
    throw new Error("Method not implemented.");
  }

  oplogReplay(): Cursor {
    throw new Error("Method not implemented.");
  }

  projection(spec: Document): Cursor {
    throw new Error("Method not implemented.");
  }

  readPref(preference: string, tagSet?: Document[]): Cursor {
    throw new Error("Method not implemented.");
  }

  returnKey(enabled: boolean): Cursor {
    throw new Error("Method not implemented.");
  }

  size(): Promise<number> {
    throw new Error("Method not implemented.");
  }

  skip(value: number): Cursor {
    throw new Error("Method not implemented.");
  }

  sort(spec: Document): Cursor {
    throw new Error("Method not implemented.");
  }

  tailable(): Cursor {
    throw new Error("Method not implemented.");
  }

  explain(verbosity: string): Promise<any> {
    throw new Error("Method not implemented.");
  }

  /**
   * When the cursor is for an unsupported operation,
   * this method will reject.
   *
   * @returns {Promise} The rejected promise.
   */
  async toArray(): Promise<Document[]> {
    throw new Error(this.message);
  }
}

export default UnsupportedCursor;
