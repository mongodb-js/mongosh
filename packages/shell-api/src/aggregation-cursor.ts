import Mongo from './mongo';
import {
  shellApiClassDefault,
  returnsPromise,
  returnType,
  hasAsyncChild
} from './decorators';
import type {
  AggregationCursor as ServiceProviderAggregationCursor,
  Document
} from '@mongosh/service-provider-core';
import { AbstractCursor } from './abstract-cursor';

@shellApiClassDefault
@hasAsyncChild
export default class AggregationCursor extends AbstractCursor {
  _cursor: ServiceProviderAggregationCursor;

  constructor(mongo: Mongo, cursor: ServiceProviderAggregationCursor) {
    super(mongo);
    this._cursor = cursor;
  }

  @returnType('AggregationCursor')
  map(f: (doc: Document) => Document): this {
    return super.map(f);
  }

  @returnType('AggregationCursor')
  maxTimeMS(value: number): this {
    return super.maxTimeMS(value);
  }

  @returnsPromise
  async toArray(): Promise<Document[]> {
    return this._cursor.toArray();
  }

  @returnType('AggregationCursor')
  pretty(): this {
    return this;
  }

  @returnType('AggregationCursor')
  batchSize(size: number): this {
    return super.batchSize(size);
  }

  @returnType('AggregationCursor')
  projection(spec: Document): this {
    return super.projection(spec);
  }

  @returnType('AggregationCursor')
  skip(value: number): this {
    return super.skip(value);
  }

  @returnType('AggregationCursor')
  sort(spec: Document): this {
    return super.sort(spec);
  }
}
