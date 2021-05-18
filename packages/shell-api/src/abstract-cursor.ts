import {
  shellApiClassNoHelp,
  toShellResult,
  returnType,
  ShellApiWithMongoClass,
  returnsPromise
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
export abstract class AbstractCursor extends ShellApiWithMongoClass {
  _mongo: Mongo;
  abstract _cursor: ServiceProviderAggregationCursor | ServiceProviderCursor;
  _currentIterationResult: CursorIterationResult | null = null;
  _batchSize: number | null = null;
  _mapError: Error | null = null;

  constructor(mongo: Mongo) {
    super();
    this._mongo = mongo;
  }

  // Wrap a function with checks before and after that verify whether a .map()
  // callback has resulted in an exception. Such an error would otherwise result
  // in an uncaught exception, bringing the whole process down.
  // The downside to this is that errors will not actually be visible until
  // the caller tries to interact with this cursor in a way that triggers
  // these checks. Since that is also the behavior for errors coming from the
  // database server, it makes sense to match that.
  // Ideally, this kind of code could be lifted into the driver (NODE-3231 and
  // NODE-3232 are the tickets for that).
  async _withCheckMapError<Ret>(fn: () => Ret): Promise<Ret> {
    if (this._mapError) {
      // If an error has already occurred, we don't want to call the function
      // at all.
      throw this._mapError;
    }
    const ret = await fn();
    if (this._mapError) {
      // If an error occurred during the function, we don't want to forward its
      // results.
      throw this._mapError;
    }
    return ret;
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  async [asPrintable](): Promise<CursorIterationResult> {
    return (await toShellResult(this._currentIterationResult ?? await this._it())).printable;
  }

  async _it(): Promise<CursorIterationResult> {
    const results = this._currentIterationResult = new CursorIterationResult();
    await iterate(results, this, this._batchSize ?? await this._mongo._batchSize());
    results.cursorHasMore = !this.isExhausted();
    return results;
  }

  @returnType('this')
  batchSize(size: number): this {
    this._batchSize = size;
    return this;
  }

  @returnsPromise
  async close(options: Document): Promise<void> {
    await this._cursor.close(options);
  }

  @returnsPromise
  async forEach(f: (doc: Document) => void): Promise<void> {
    // Work around https://jira.mongodb.org/browse/NODE-3231
    let exception;
    const wrapped = (doc: Document): boolean | undefined => {
      try {
        f(doc);
        return undefined;
      } catch (err) {
        exception = err;
        return false; // Stop iteration.
      }
    };
    await this._cursor.forEach(wrapped);
    if (exception) {
      throw exception;
    }
  }

  @returnsPromise
  async hasNext(): Promise<boolean> {
    return this._withCheckMapError(() => this._cursor.hasNext());
  }

  @returnsPromise
  async tryNext(): Promise<Document | null> {
    return this._withCheckMapError(() => this._cursor.tryNext());
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
    return this._withCheckMapError(() => this._cursor.toArray());
  }

  @returnType('this')
  pretty(): this {
    return this;
  }

  @returnType('this')
  map(f: (doc: Document) => Document): this {
    // Work around https://jira.mongodb.org/browse/NODE-3232
    const wrapped = (doc: Document): Document => {
      if (this._mapError) {
        // These errors should never become visible to the user.
        return { __errored: true };
      }
      try {
        return f(doc);
      } catch (err) {
        this._mapError = err;
        return { __errored: true };
      }
    };
    this._cursor.map(wrapped);
    return this;
  }

  @returnType('this')
  maxTimeMS(value: number): this {
    this._cursor.maxTimeMS(value);
    return this;
  }

  @returnsPromise
  async next(): Promise<Document | null> {
    return this._withCheckMapError(() => this._cursor.next());
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
