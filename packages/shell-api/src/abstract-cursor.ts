import {
  shellApiClassNoHelp,
  toShellResult,
  returnType,
  ShellApiWithMongoClass,
  returnsPromise,
  apiVersions
} from './decorators';
import type Mongo from './mongo';
import type {
  Document,
  ExplainVerbosityLike,
  FindCursor as ServiceProviderCursor,
  AggregationCursor as ServiceProviderAggregationCursor,
} from '@mongosh/service-provider-core';
import { asPrintable } from './enums';
import { CursorIterationResult } from './result';
import { iterate, validateExplainableVerbosity, markAsExplainOutput } from './helpers';

@shellApiClassNoHelp
export abstract class AbstractCursor<CursorType extends ServiceProviderAggregationCursor | ServiceProviderCursor> extends ShellApiWithMongoClass {
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
    return (await toShellResult(this._currentIterationResult ?? await this._it())).printable;
  }

  async _it(): Promise<CursorIterationResult> {
    const results = this._currentIterationResult = new CursorIterationResult();
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
  async close(options: Document): Promise<void> {
    await this._cursor.close(options);
  }

  @returnsPromise
  async forEach(f: (doc: Document) => void | boolean | Promise<void> | Promise<boolean>): Promise<void> {
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

  async* [Symbol.asyncIterator]() {
    let doc;
    while ((doc = await this.tryNext()) !== null) {
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

  @returnType('this')
  projection(spec: Document): this {
    this._cursor.project(spec);
    return this;
  }

  @returnType('this')
  skip(value: number): this {
    this._cursor.skip(value);
    return this;
  }

  @returnType('this')
  sort(spec: Document): this {
    this._cursor.sort(spec);
    return this;
  }

  objsLeftInBatch(): number {
    return this._cursor.bufferedCount();
  }

  @returnsPromise
  @apiVersions([1])
  async explain(verbosity?: ExplainVerbosityLike): Promise<any> {
    // TODO: @maurizio we should probably move this in the Explain class?
    // NOTE: the node driver always returns the full explain plan
    // for Cursor and the queryPlanner explain for AggregationCursor.
    if (verbosity !== undefined) {
      verbosity = validateExplainableVerbosity(verbosity);
    }
    const fullExplain: any = await this._cursor.explain(verbosity);

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

    return markAsExplainOutput(explain);
  }
}
