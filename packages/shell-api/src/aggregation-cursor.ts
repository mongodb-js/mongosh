import Mongo from './mongo';
import {
  shellApiClassDefault,
  returnsPromise,
  returnType,
  hasAsyncChild,
  ShellApiClass,
  toShellResult
} from './decorators';
import type {
  AggregationCursor as ServiceProviderAggregationCursor,
  ExplainVerbosityLike,
  Document
} from '@mongosh/service-provider-core';
import { CursorIterationResult } from './result';
import { asPrintable, DEFAULT_BATCH_SIZE } from './enums';
import { iterate, validateExplainableVerbosity } from './helpers';

@shellApiClassDefault
@hasAsyncChild
export default class AggregationCursor extends ShellApiClass {
  _mongo: Mongo;
  _cursor: ServiceProviderAggregationCursor;
  _currentIterationResult: CursorIterationResult | null = null;
  _batchSize = DEFAULT_BATCH_SIZE;

  constructor(mongo: Mongo, cursor: ServiceProviderAggregationCursor) {
    super();
    this._cursor = cursor;
    this._mongo = mongo;
  }

  async _it(): Promise<CursorIterationResult> {
    const results = this._currentIterationResult = new CursorIterationResult();
    await iterate(results, this._cursor, this._batchSize);
    results.hasMore = !this.isExhausted();
    return results;
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  async [asPrintable](): Promise<CursorIterationResult> {
    return (await toShellResult(this._currentIterationResult ?? await this._it())).printable;
  }

  @returnsPromise
  async close(options: Document): Promise<void> {
    await this._cursor.close(options);
  }

  @returnsPromise
  forEach(f: (doc: Document) => void): Promise<void> {
    return this._cursor.forEach(f);
  }

  @returnsPromise
  hasNext(): Promise<boolean> {
    return this._cursor.hasNext();
  }

  @returnsPromise
  tryNext(): Promise<Document | null> {
    return this._cursor.tryNext();
  }

  async* [Symbol.asyncIterator]() {
    let doc;
    while ((doc = await this.tryNext()) !== null) {
      yield doc;
    }
  }

  isClosed(): boolean {
    return this._cursor.closed;
  }

  async isExhausted(): Promise<boolean> {
    return this.isClosed() && this.objsLeftInBatch() === 0;
  }

  objsLeftInBatch(): number {
    return this._cursor.bufferedCount();
  }

  @returnsPromise
  async itcount(): Promise<number> {
    let count = 0;
    while (await this.tryNext()) {
      count++;
    }
    return count;
  }

  @returnType('AggregationCursor')
  map(f: (doc: Document) => Document): AggregationCursor {
    this._cursor.map(f);
    return this;
  }

  @returnsPromise
  next(): Promise<Document | null> {
    return this._cursor.next();
  }

  @returnsPromise
  toArray(): Promise<Document[]> {
    return this._cursor.toArray();
  }

  @returnsPromise
  explain(verbosity: ExplainVerbosityLike = 'queryPlanner'): Promise<any> {
    verbosity = validateExplainableVerbosity(verbosity);
    return this._cursor.explain(verbosity);
  }

  @returnType('AggregationCursor')
  pretty(): AggregationCursor {
    return this;
  }

  @returnType('AggregationCursor')
  batchSize(size: number): AggregationCursor {
    this._batchSize = size;
    return this;
  }
}
