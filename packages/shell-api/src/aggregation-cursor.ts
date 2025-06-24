import type Mongo from './mongo';
import { shellApiClassDefault } from './decorators';
import type { ServiceProviderAggregationCursor } from '@mongosh/service-provider-core';
import { AggregateOrFindCursor } from './aggregate-or-find-cursor';
import type { GenericServerSideSchema } from './helpers';

@shellApiClassDefault
export default class AggregationCursor<
  M extends GenericServerSideSchema = GenericServerSideSchema
> extends AggregateOrFindCursor<ServiceProviderAggregationCursor, M> {
  constructor(mongo: Mongo<M>, cursor: ServiceProviderAggregationCursor) {
    super(mongo, cursor);
  }
}
