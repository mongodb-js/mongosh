import {
  shellApiClassDefault,
  returnsPromise,
  returnType,
  hasAsyncChild,
  ShellApiClass
} from './decorators';
import {
  ChangeStream,
  Document,
  ResumeToken
} from '@mongosh/service-provider-core';
import { CursorIterationResult } from './result';
import { asPrintable } from './enums';
import { MongoshInternalError, MongoshUnimplementedError } from '@mongosh/errors';
import { iterate } from './helpers';

@shellApiClassDefault
@hasAsyncChild
export default class ChangeStreamCursor extends ShellApiClass {
  _cursor: ChangeStream;
  _currentIterationResult: CursorIterationResult | null = null;
  _on: string;
  constructor(cursor: ChangeStream, on: string) {
    super();
    this._cursor = cursor;
    this._on = on;
  }

  async _it(): Promise<CursorIterationResult> {
    if (this._cursor.cursor === undefined) {
      throw new MongoshInternalError('No internal ChangeStreamCursor');
    }
    const result = this._currentIterationResult = new CursorIterationResult();
    return iterate(result, this._cursor.cursor);
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  async [asPrintable](): Promise<string> {
    return `ChangeStreamCursor on ${this._on}`;
  }

  @returnsPromise
  async close(): Promise<void> {
    await this._cursor.close();
  }

  @returnsPromise
  async hasNext(): Promise<void> {
    // TODO: warn
    return this._cursor.hasNext();
  }

  @returnsPromise
  async tryNext(): Promise<Document | null> {
    if (this._cursor.cursor === undefined) {
      throw new MongoshInternalError('No internal ChangeStreamCursor');
    }
    return this._cursor.cursor.tryNext();
  }

  isClosed(): boolean {
    return this._cursor.closed;
  }

  @returnsPromise
  async isExhausted(): Promise<boolean> {
    if (this._cursor.cursor === undefined) {
      throw new MongoshInternalError('No internal ChangeStreamCursor');
    }
    // TODO: warn
    return this.isClosed() && await this.tryNext() === null;
  }

  @returnsPromise
  async itcount(): Promise<number> {
    let count = 0;
    while (await this.tryNext()) {
      count++;
    }
    return count;
  }

  @returnsPromise
  async next(): Promise<void> {
    // TODO warn
    return this._cursor.next();
  }

  getResumeToken(): ResumeToken {
    return this._cursor.resumeToken;
  }

  map(): ChangeStreamCursor {
    throw new MongoshUnimplementedError('Cannot call map on a change stream cursor');
  }
  forEach(): Promise<void> {
    throw new MongoshUnimplementedError('Cannot call forEach on a change stream cursor');
  }
  toArray(): Promise<Document[]> {
    throw new MongoshUnimplementedError('Cannot call toArray on a change stream cursor');
  }
  objsLeftInBatch(): void {
    throw new MongoshUnimplementedError('Cannot call objsLeftInBatch on a change stream cursor');
  }

  @returnType('ChangeStreamCursor')
  pretty(): ChangeStreamCursor {
    return this;
  }
}
