import {
  shellApiClassDefault,
  returnsPromise,
  returnType,
  deprecated,
  ShellApiWithMongoClass,
} from './decorators';
import type {
  ServiceProviderChangeStream,
  Document,
  ResumeToken,
} from '@mongosh/service-provider-core';
import { CursorIterationResult } from './result';
import { asPrintable } from './enums';
import {
  MongoshInvalidInputError,
  MongoshRuntimeError,
  MongoshUnimplementedError,
} from '@mongosh/errors';
import { iterate } from './helpers';
import type Mongo from './mongo';

@shellApiClassDefault
export default class ChangeStreamCursor extends ShellApiWithMongoClass {
  _mongo: Mongo;
  _cursor: ServiceProviderChangeStream<Document>;
  _currentIterationResult: CursorIterationResult | null = null;
  _on: string;

  constructor(
    cursor: ServiceProviderChangeStream<Document>,
    on: string,
    mongo: Mongo
  ) {
    super();
    this._cursor = cursor;
    this._on = on;
    this._mongo = mongo;
  }

  async _it(): Promise<CursorIterationResult> {
    if (this._cursor.closed) {
      throw new MongoshRuntimeError('ChangeStreamCursor is closed');
    }
    const result = (this._currentIterationResult = new CursorIterationResult());
    return iterate(result, this, await this._mongo._displayBatchSize());
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  [asPrintable](): string {
    return `ChangeStreamCursor on ${this._on}`;
  }

  @returnsPromise
  async close(): Promise<void> {
    await this._cursor.close();
  }

  @returnsPromise
  @deprecated
  async hasNext(): Promise<boolean> {
    await this._instanceState.printWarning(
      'If there are no documents in the batch, hasNext will block. Use tryNext if you want to check if there ' +
        'are any documents without waiting.'
    );
    return this._cursor.hasNext();
  }

  @returnsPromise
  async tryNext(): Promise<Document | null> {
    if (this._cursor.closed) {
      throw new MongoshRuntimeError('Cannot call tryNext on closed cursor');
    }
    return this._cursor.tryNext();
  }

  get [Symbol.for('@@mongosh.syntheticAsyncIterable')]() {
    return true;
  }

  async *[Symbol.asyncIterator]() {
    let doc;
    while ((doc = await this.tryNext()) !== null) {
      yield doc;
    }
  }

  isClosed(): boolean {
    return this._cursor.closed;
  }

  isExhausted(): never {
    throw new MongoshInvalidInputError(
      'isExhausted is not implemented for ChangeStreams because after closing a cursor, the remaining documents in the batch are no longer accessible. If you want to see if the cursor is closed use isClosed. If you want to see if there are documents left in the batch, use tryNext.'
    );
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
  async next(): Promise<Document> {
    await this._instanceState.printWarning(
      'If there are no documents in the batch, next will block. Use tryNext if you want to check if there are ' +
        'any documents without waiting.'
    );
    return this._cursor.next();
  }

  getResumeToken(): ResumeToken {
    return this._cursor.resumeToken;
  }

  map(): ChangeStreamCursor {
    throw new MongoshUnimplementedError(
      'Cannot call map on a change stream cursor'
    );
  }
  forEach(): Promise<void> {
    throw new MongoshUnimplementedError(
      'Cannot call forEach on a change stream cursor'
    );
  }
  toArray(): Promise<Document[]> {
    throw new MongoshUnimplementedError(
      'Cannot call toArray on a change stream cursor'
    );
  }
  objsLeftInBatch(): void {
    throw new MongoshUnimplementedError(
      'Cannot call objsLeftInBatch on a change stream cursor'
    );
  }

  @returnType('ChangeStreamCursor')
  pretty(): ChangeStreamCursor {
    return this;
  }
}
