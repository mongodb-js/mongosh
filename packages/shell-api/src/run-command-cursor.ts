import type Mongo from './mongo';
import { shellApiClassDefault } from './decorators';
import type { ServiceProviderRunCommandCursor } from '@mongosh/service-provider-core';
import { AbstractFiniteCursor } from './abstract-cursor';

@shellApiClassDefault
export default class RunCommandCursor extends AbstractFiniteCursor<ServiceProviderRunCommandCursor> {
  constructor(mongo: Mongo, cursor: ServiceProviderRunCommandCursor) {
    super(mongo, cursor);
  }
}
