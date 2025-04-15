import type Mongo from './mongo';
import { shellApiClassDefault } from './decorators';
import type { ServiceProviderRunCommandCursor } from '@mongosh/service-provider-core';
import { AbstractCursor } from './abstract-cursor';

@shellApiClassDefault
export default class RunCommandCursor extends AbstractCursor<ServiceProviderRunCommandCursor> {
  constructor(mongo: Mongo, cursor: ServiceProviderRunCommandCursor) {
    super(mongo, cursor);
  }
}
