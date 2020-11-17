import {
  shellApiClassDefault,
  returnsPromise,
  returnType,
  hasAsyncChild,
  ShellApiClass
} from './decorators';
import {
  ChangeStream,
  Document
} from '@mongosh/service-provider-core';
import { CursorIterationResult } from './result';
import { asPrintable } from './enums';
import { MongoshUnimplementedError } from '@mongosh/errors';
import { TIMEOUT, timeout } from './helpers';

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

  async _timeoutTailable(method: () => Promise<any>) {
    return timeout(
      () => true,
      method,
      `The method timed out. The shell ChangeStream will wait for the server to provide results for ${TIMEOUT}ms before returning, so there is likely no results for the change stream to return at the moment.`);
  }

  async _it(): Promise<CursorIterationResult> {
    const results = this._currentIterationResult = new CursorIterationResult();

    if (this.isClosed()) {
      return results;
    }

    for (let i = 0; i < 20; i++) {
      if (!await this.hasNext()) {
        break;
      }

      results.push(await this.next());
    }

    return results;
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
  hasNext(): Promise<boolean> {
    return this._timeoutTailable(() => this._cursor.hasNext());
  }

  isClosed(): boolean {
    return this._cursor.isClosed();
  }

  @returnsPromise
  async isExhausted(): Promise<boolean> {
    return this._cursor.isClosed() && !await this.hasNext();
  }

  @returnsPromise
  async itcount(): Promise<number> {
    let count = 0;

    while (await this.hasNext()) {
      await this.next();
      count++;
    }

    return count;
  }

  @returnsPromise
  next(): Promise<any> {
    return this._timeoutTailable(() => this._cursor.next());
  }

  getResumeToken(): void {
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
