import type Mongo from './mongo';
import { shellApiClassDefault } from './decorators';
import type { ServiceProviderAggregationCursor } from '@mongosh/service-provider-core';
import { AggregateOrFindCursor } from './aggregate-or-find-cursor';

@shellApiClassDefault
export default class AggregationCursor extends AggregateOrFindCursor<ServiceProviderAggregationCursor> {
  constructor(mongo: Mongo, cursor: ServiceProviderAggregationCursor) {
    super(mongo, cursor);
  }
}
