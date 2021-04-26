import type Mongo from './mongo';
import {
  shellApiClassDefault,
  hasAsyncChild
} from './decorators';
import type {
  AggregationCursor as ServiceProviderAggregationCursor
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
}
