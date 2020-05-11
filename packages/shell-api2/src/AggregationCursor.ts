import Mongo from './mongo';
import { shellApiClassDefault } from './main';
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

  close(options: Document): Promise<void> {
    return this.cursor.close(options);
  }

  forEach(f): Promise<void> {
    return this.cursor.forEach(f);
  }

  hasNext(): Promise<boolean> {
    return this.cursor.hasNext();
  }

  isClosed(): boolean {
    return this.cursor.isClosed();
  }

  isExhausted(): Promise<boolean> {
    return this.cursor.isExhausted();
  }

  itcount(): Promise<number> {
    return this.cursor.itcount();
  }

  map(f): AggregationCursor {
    this.cursor.map(f);
    return this;
  }

  next(): Promise<any> {
    return this.cursor.next();
  }

  toArray(): Promise<Document[]> {
    return this.cursor.toArray();
  }

  explain(verbosity: string): Promise<any> {
    return this.cursor.explain(verbosity);
  }
}

