import {
  shellApiClassNoHelp,
  toShellResult,
  returnType,
  ShellApiWithMongoClass,
  returnsPromise,
} from './decorators';
import type Mongo from './mongo';
import type {
  Document,
  ServiceProviderFindCursor,
  ServiceProviderAggregationCursor,
  ServiceProviderRunCommandCursor,
  ServiceProviderBaseCursor,
} from '@mongosh/service-provider-core';
import { asPrintable } from './enums';
import { CursorIterationResult } from './result';
import { iterate } from './helpers';

@shellApiClassNoHelp
export abstract class BaseCursor<
  CursorType extends ServiceProviderBaseCursor
> extends ShellApiWithMongoClass {
  _mongo: Mongo;
  _cursor: CursorType;
  _transform: ((doc: any) => any) | null = null;
  _blockingWarningDisabled = false;

  constructor(mongo: Mongo, cursor: CursorType) {
    super();
    this._mongo = mongo;
    this._cursor = cursor;
  }

  @returnsPromise
  async close(): Promise<void> {
    await this._cursor.close();
  }

  @returnsPromise
  async forEach(
    f: (doc: Document) => void | boolean | Promise<void> | Promise<boolean>
  ): Promise<void> {
    // Do not use the driver method because it does not have Promise support.
    for await (const doc of this) {
      if ((await f(doc)) === false) {
        break;
      }
    }
  }

  @returnsPromise
  async hasNext(): Promise<boolean> {
    return await this._cursor.hasNext();
  }

  @returnsPromise
  async tryNext(): Promise<Document | null> {
    return this._tryNext();
  }

  async _tryNext(): Promise<Document | null> {
    let result = await this._cursor.tryNext();
    if (result !== null && this._transform !== null) {
      result = await this._transform(result);
    }
    return result;
  }

  _canDelegateIterationToUnderlyingCursor(): boolean {
    return this._transform === null;
  }

  get [Symbol.for('@@mongosh.syntheticAsyncIterable')]() {
    return true;
  }

  async *[Symbol.asyncIterator]() {
    const baseIterator = this._cursor[Symbol.asyncIterator];
    if (baseIterator && this._canDelegateIterationToUnderlyingCursor()) {
      yield* baseIterator.call(this._cursor);
      return;
    }

    let doc;
    // !== null should suffice, but some stubs in our tests return 'undefined'
    // eslint-disable-next-line eqeqeq
    while ((doc = await this._tryNext()) != null) {
      yield doc;
    }
  }

  isClosed(): boolean {
    return this._cursor.closed;
  }

  isExhausted(): boolean {
    return this.isClosed() && this.objsLeftInBatch() === 0;
  }

  @returnsPromise
  async itcount(): Promise<number> {
    let count = 0;
    while (await this._tryNext()) {
      count++;
    }
    return count;
  }

  @returnType('this')
  pretty(): this {
    return this;
  }

  @returnType('this')
  map(f: (doc: Document) => Document): this {
    if (this._transform === null) {
      this._transform = f;
    } else {
      const g = this._transform;
      this._transform = (doc: any) => f(g(doc));
    }
    return this;
  }

  @returnsPromise
  async next(): Promise<Document | null> {
    let result = await this._cursor.next();
    if (result !== null && this._transform !== null) {
      result = await this._transform(result);
    }
    return result;
  }

  disableBlockWarnings(): this {
    this._blockingWarningDisabled = true;
    return this;
  }

  abstract batchSize(size: number): this;
  abstract toArray(): Promise<Document[]>;
  abstract maxTimeMS(value: number): this;
  abstract objsLeftInBatch(): number;
  abstract _it(): Promise<CursorIterationResult>;
}

@shellApiClassNoHelp
export abstract class AbstractFiniteCursor<
  CursorType extends
    | ServiceProviderAggregationCursor
    | ServiceProviderFindCursor
    | ServiceProviderRunCommandCursor
> extends BaseCursor<CursorType> {
  _currentIterationResult: CursorIterationResult | null = null;

  constructor(mongo: Mongo, cursor: CursorType) {
    super(mongo, cursor);
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  async [asPrintable](): Promise<CursorIterationResult | string> {
    return (
      await toShellResult(this._currentIterationResult ?? (await this._it()))
    ).printable;
  }

  override async _it(): Promise<CursorIterationResult> {
    const results = (this._currentIterationResult =
      new CursorIterationResult());
    await iterate(results, this, await this._mongo._displayBatchSize());
    results.cursorHasMore = !this.isExhausted();
    return results;
  }

  @returnType('this')
  override batchSize(size: number): this {
    this._cursor.batchSize(size);
    return this;
  }

  @returnsPromise
  override async toArray(): Promise<Document[]> {
    // toArray is always defined for driver cursors, but not necessarily
    // in tests
    if (
      typeof this._cursor.toArray === 'function' &&
      this._canDelegateIterationToUnderlyingCursor()
    ) {
      return await this._cursor.toArray();
    }

    const result = [];
    for await (const doc of this) {
      result.push(doc);
    }
    return result;
  }

  @returnType('this')
  maxTimeMS(value: number): this {
    this._cursor.maxTimeMS(value);
    return this;
  }

  objsLeftInBatch(): number {
    return this._cursor.bufferedCount();
  }
}
