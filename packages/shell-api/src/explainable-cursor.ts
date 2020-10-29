import { shellApiClassDefault, returnType } from './decorators';
import Cursor from './cursor';
import Mongo from './mongo';
import { asPrintable } from './enums';
import type { Document } from '@mongosh/service-provider-core';

@shellApiClassDefault
export default class ExplainableCursor extends Cursor {
  _baseCursor: Cursor;
  _verbosity: string;

  constructor(mongo: Mongo, cursor: Cursor, verbosity: string) {
    super(mongo, cursor._cursor);
    this._baseCursor = cursor;
    this._verbosity = verbosity;
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  async [asPrintable](): Promise<any> {
    return await this._baseCursor.explain(this._verbosity);
  }

  @returnType('ExplainableCursor')
  map(f: (doc: Document) => Document): ExplainableCursor {
    return super.map(f) as ExplainableCursor;
  }
}
