import Mongo from './mongo';
import {
  shellApiClassDefault,
  returnsPromise,
  returnType,
  hasAsyncChild,
  ShellApiClass
} from './decorators';
import {
  Cursor as ServiceProviderCursor,
  Document
} from '@mongosh/service-provider-core';
import { CursorIterationResult } from './result';

@shellApiClassDefault
@hasAsyncChild
export default class AggregationCursor extends ShellApiClass {
  _mongo: Mongo;
  _cursor: ServiceProviderCursor;
  constructor(mongo, cursor) {
    super();
    this._cursor = cursor;
    this._mongo = mongo;
  }

  async _it(): Promise<any> {
    const results = new CursorIterationResult();

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
  async _asPrintable(): Promise<any> {
    return await this._it();
  }

  @returnsPromise
  close(options: Document): Promise<void> {
    return this._cursor.close(options);
  }

  @returnsPromise
  forEach(f): Promise<void> {
    return this._cursor.forEach(f);
  }

  @returnsPromise
  hasNext(): Promise<boolean> {
    return this._cursor.hasNext();
  }

  isClosed(): boolean {
    return this._cursor.isClosed();
  }

  isExhausted(): Promise<boolean> {
    return this._cursor.isExhausted();
  }

  @returnsPromise
  itcount(): Promise<number> {
    return this._cursor.itcount();
  }

  @returnType('AggregationCursor')
  map(f): AggregationCursor {
    this._cursor.map(f);
    return this;
  }

  @returnsPromise
  next(): Promise<any> {
    return this._cursor.next();
  }

  @returnsPromise
  toArray(): Promise<Document[]> {
    return this._cursor.toArray();
  }

  @returnsPromise
  explain(verbosity: string): Promise<any> {
    return this._cursor.explain(verbosity);
  }

  @returnType('AggregationCursor')
  pretty(): AggregationCursor {
    return this;
  }
}

