import { shellApiClassDefault } from './decorators';
import Cursor from './cursor';
import Mongo from './mongo';
import { Cursor as ServiceProviderCursor } from '@mongosh/service-provider-core';

@shellApiClassDefault
export default class ExplainableCursor extends Cursor {
  _mongo: Mongo;
  _cursor: ServiceProviderCursor;
  _verbosity: string;
  constructor(mongo, cursor, verbosity) {
    super(mongo, cursor);
    this._cursor = cursor;
    this._mongo = mongo;
    this._verbosity = verbosity;
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  async _asPrintable(): Promise<any> {
    return await this._cursor.explain(this._verbosity);
  }
}
