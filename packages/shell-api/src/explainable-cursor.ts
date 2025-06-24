import { returnsPromise, shellApiClassDefault } from './decorators';
import Cursor from './cursor';
import type Mongo from './mongo';
import { asPrintable } from './enums';
import type { ExplainVerbosityLike } from '@mongosh/service-provider-core';
import type { GenericServerSideSchema } from './helpers';

@shellApiClassDefault
export default class ExplainableCursor<
  M extends GenericServerSideSchema = GenericServerSideSchema
> extends Cursor<M> {
  _baseCursor: Cursor<M>;
  _verbosity: ExplainVerbosityLike;
  _explained: any;

  constructor(
    mongo: Mongo<M>,
    cursor: Cursor<M>,
    verbosity: ExplainVerbosityLike
  ) {
    super(mongo, cursor._cursor);
    this._baseCursor = cursor;
    this._verbosity = verbosity;
    this._explained = null;
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  async [asPrintable](): Promise<any> {
    return await this.finish();
  }

  @returnsPromise
  async finish(): Promise<any> {
    // Cache the result so that we don't explain over and over again for the
    // same object.
    this._explained ??= await this._baseCursor.explain(this._verbosity);
    return this._explained;
  }
}
