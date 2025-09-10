import { shellApiClassDefault, returnsPromise, deprecated } from './decorators';
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
import { BaseCursor } from './abstract-cursor';

@shellApiClassDefault
export default class ChangeStreamCursor extends BaseCursor<ServiceProviderChangeStream> {
  _currentIterationResult: CursorIterationResult | null = null;
  _on: string;

  constructor(cursor: ServiceProviderChangeStream, on: string, mongo: Mongo) {
    super(mongo, cursor);
    this._on = on;
  }

  override async _it(): Promise<CursorIterationResult> {
    if (this._cursor.closed) {
      throw new MongoshRuntimeError('ChangeStreamCursor is closed');
    }
    const result = (this._currentIterationResult = new CursorIterationResult());
    return iterate(result, this, await this._mongo._displayBatchSize());
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  override [asPrintable](): Promise<string> {
    return Promise.resolve(`ChangeStreamCursor on ${this._on}`);
  }

  @returnsPromise
  @deprecated
  override async hasNext(): Promise<boolean> {
    if (!this._blockingWarningDisabled) {
      await this._instanceState.printWarning(
        'If there are no documents in the batch, hasNext will block. Use tryNext if you want to check if there ' +
          'are any documents without waiting, or cursor.disableBlockWarnings() if you want to disable this warning.'
      );
    }
    return super.hasNext();
  }

  @returnsPromise
  override async tryNext(): Promise<Document | null> {
    if (this._cursor.closed) {
      throw new MongoshRuntimeError('Cannot call tryNext on closed cursor');
    }
    return super.tryNext();
  }

  override isExhausted(): never {
    throw new MongoshInvalidInputError(
      'isExhausted is not implemented for ChangeStreams because after closing a cursor, the remaining documents in the batch are no longer accessible. If you want to see if the cursor is closed use isClosed. If you want to see if there are documents left in the batch, use tryNext.'
    );
  }

  @returnsPromise
  override async next(): Promise<Document> {
    if (!this._blockingWarningDisabled) {
      await this._instanceState.printWarning(
        'If there are no documents in the batch, next will block. Use tryNext if you want to check if there are ' +
          'any documents without waiting, or cursor.disableBlockWarnings() if you want to disable this warning.'
      );
    }
    return (await super.next()) as Document;
  }

  getResumeToken(): ResumeToken {
    return this._cursor.resumeToken;
  }

  override toArray(): never {
    throw new MongoshUnimplementedError(
      'Cannot call toArray on a change stream cursor'
    );
  }

  override batchSize(): never {
    throw new MongoshUnimplementedError(
      'Cannot call batchSize on a change stream cursor'
    );
  }

  override objsLeftInBatch(): never {
    throw new MongoshUnimplementedError(
      'Cannot call objsLeftInBatch on a change stream cursor'
    );
  }

  override maxTimeMS(): never {
    throw new MongoshUnimplementedError(
      'Cannot call maxTimeMS on a change stream cursor'
    );
  }
}
