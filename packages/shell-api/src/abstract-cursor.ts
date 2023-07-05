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
  FindCursor as ServiceProviderCursor,
  AggregationCursor as ServiceProviderAggregationCursor,
  RunCommandCursor as ServiceProviderRunCommandCursor,
} from '@mongosh/service-provider-core';
import { asPrintable } from './enums';
import { CursorIterationResult } from './result';
import { iterate } from './helpers';

@shellApiClassNoHelp
export abstract class AbstractCursor<
  CursorType extends
    | ServiceProviderAggregationCursor
    | ServiceProviderCursor
    | ServiceProviderRunCommandCursor
> extends ShellApiWithMongoClass {
  _mongo: Mongo;
  _cursor: CursorType;
  _transform: ((doc: any) => any) | null;

  _currentIterationResult: CursorIterationResult | null = null;

  constructor(mongo: Mongo, cursor: CursorType) {
    super();
    this._mongo = mongo;
    this._cursor = cursor;
    this._transform = null;
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  async [asPrintable](): Promise<CursorIterationResult> {
    return (
      await toShellResult(this._currentIterationResult ?? (await this._it()))
    ).printable;
  }

  async _it(): Promise<CursorIterationResult> {
    const results = (this._currentIterationResult =
      new CursorIterationResult());
    await iterate(results, this, await this._mongo._displayBatchSize());
    results.cursorHasMore = !this.isExhausted();
    return results;
  }

  @returnType('this')
  batchSize(size: number): this {
    this._cursor.batchSize(size);
    return this;
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
    return this._cursor.hasNext();
  }

  @returnsPromise
  async tryNext(): Promise<Document | null> {
    let result = await this._cursor.tryNext();
    if (result !== null && this._transform !== null) {
      result = await this._transform(result);
    }
    return result;
  }

  async *[Symbol.asyncIterator]() {
    let doc;
    // !== null should suffice, but some stubs in our tests return 'undefined'
    while ((doc = await this.tryNext()) != null) {
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
    while (await this.tryNext()) {
      count++;
    }
    return count;
  }

  @returnsPromise
  async toArray(): Promise<Document[]> {
    const result = [];
    for await (const doc of this) {
      result.push(doc);
    }
    return result;
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

  @returnType('this')
  maxTimeMS(value: number): this {
    this._cursor.maxTimeMS(value);
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

  objsLeftInBatch(): number {
    return this._cursor.bufferedCount();
  }
}
