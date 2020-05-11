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
  mongo: Mongo;
  cursor: ServiceProviderCursor;
  constructor(mongo, cursor) {
    super();
    this.cursor = cursor;
    this.mongo = mongo;
  }

  async _it(): Promise<any> {
    const results = new CursorIterationResult();

    if (this.isClosed()) {
      return results;
    }

    for (let i = 0; i < 20; i++) { // TODO: ensure that assigning cursor doesn't iterate
      if (!await this.hasNext()) {
        break;
      }

      results.push(await this.next());
    }

    return results;
  }


  async toReplString(): Promise<any> {
    return await this._it();
  }

  @returnsPromise
  close(options: Document): Promise<void> {
    return this.cursor.close(options);
  }

  @returnsPromise
  forEach(f): Promise<void> {
    return this.cursor.forEach(f);
  }

  @returnsPromise
  hasNext(): Promise<boolean> {
    return this.cursor.hasNext();
  }

  isClosed(): boolean {
    return this.cursor.isClosed();
  }

  isExhausted(): Promise<boolean> {
    return this.cursor.isExhausted();
  }

  @returnsPromise
  itcount(): Promise<number> {
    return this.cursor.itcount();
  }

  @returnType('AggregationCursor')
  map(f): AggregationCursor {
    this.cursor.map(f);
    return this;
  }

  @returnsPromise
  next(): Promise<any> {
    return this.cursor.next();
  }

  @returnsPromise
  toArray(): Promise<Document[]> {
    return this.cursor.toArray();
  }

  @returnsPromise
  explain(verbosity: string): Promise<any> {
    return this.cursor.explain(verbosity);
  }
}

