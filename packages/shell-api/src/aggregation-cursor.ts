import type Mongo from './mongo';
import {
  shellApiClassDefault
} from './decorators';
import type {
  AggregationCursor as ServiceProviderAggregationCursor
} from '@mongosh/service-provider-core';
import { AbstractCursor } from './abstract-cursor';

@shellApiClassDefault
export default class AggregationCursor extends AbstractCursor<ServiceProviderAggregationCursor> {
  constructor(mongo: Mongo, cursor: ServiceProviderAggregationCursor) {
    super(mongo, cursor);
  }
}
