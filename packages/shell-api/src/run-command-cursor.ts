import type Mongo from './mongo';
import { shellApiClassDefault } from './decorators';
import type { ServiceProviderRunCommandCursor } from '@mongosh/service-provider-core';
import { AbstractCursor } from './abstract-cursor';
import type { GenericServerSideSchema } from './helpers';

@shellApiClassDefault
export default class RunCommandCursor<
  M extends GenericServerSideSchema = GenericServerSideSchema
> extends AbstractCursor<ServiceProviderRunCommandCursor, M> {
  constructor(mongo: Mongo<M>, cursor: ServiceProviderRunCommandCursor) {
    super(mongo, cursor);
  }
}
