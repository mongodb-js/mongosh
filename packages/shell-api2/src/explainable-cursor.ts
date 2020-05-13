import { shellApiClassDefault } from './main';
import { Cursor } from './index';
import Mongo from './mongo';
import { Cursor as ServiceProviderCursor } from '@mongosh/service-provider-core';

@shellApiClassDefault
export default class ExplainableCursor extends Cursor { // TODO: this won't be visible in signatures
  mongo: Mongo;
  cursor: ServiceProviderCursor;
  verbosity: string;
  constructor(mongo, cursor, verbosity) {
    super(mongo, cursor);
    this.cursor = cursor;
    this.mongo = mongo;
    this.verbosity = verbosity;
  }

  async toReplString(): Promise<any> {
    return this.cursor.explain(this.verbosity);
  }
}
