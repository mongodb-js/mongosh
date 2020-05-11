import Mongo from './mongo';
import { shellApiClassDefault, returnsPromise, returnType } from './main';
import {
  Cursor as ServiceProviderCursor,
  Document
} from '@mongosh/service-provider-core';

@shellApiClassDefault
export default class AggregationCursor {
  mongo: Mongo;
  cursor: ServiceProviderCursor;
  constructor(mongo, cursor) {
    this.cursor = cursor;
    this.mongo = mongo;
  }

  toReplString() {
    return this.mongo.it();
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

