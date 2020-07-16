import Collection from './collection';
import Mongo from './mongo';
import ExplainableCursor from './explainable-cursor';
import {
  hasAsyncChild,
  returnsPromise,
  returnType,
  ShellApiClass,
  shellApiClassDefault
} from './decorators';
import { validateExplainableVerbosity } from './helpers';
import { Document } from '@mongosh/service-provider-core';

@shellApiClassDefault
@hasAsyncChild
export default class Explainable extends ShellApiClass {
  _mongo: Mongo;
  _collection: Collection;
  _verbosity: string;
  constructor(mongo, collection, verbosity) {
    super();
    this._mongo = mongo;
    this._collection = collection;
    this._verbosity = verbosity;
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  _asPrintable(): string {
    return `Explainable(${this._collection.getFullName()})`;
  }

  /**
   * Internal helper for emitting collection API call events.
   *
   * @param methodName
   * @param methodArguments
   * @private
   */
  private _emitExplainableApiCall(methodName: string, methodArguments: Document = {}): void {
    this._mongo._internalState.emitApiCall({
      method: methodName,
      class: 'Explainable',
      db: this._collection._database._name,
      coll: this._collection._name,
      arguments: methodArguments
    });
  }

  getCollection(): Collection {
    this._emitExplainableApiCall('getCollection');
    return this._collection;
  }

  getVerbosity(): string {
    this._emitExplainableApiCall('getVerbosity');
    return this._verbosity;
  }

  setVerbosity(verbosity: string): void {
    validateExplainableVerbosity(verbosity);
    this._emitExplainableApiCall('setVerbosity', { verbosity });
    this._verbosity = verbosity;
  }

  @returnType('ExplainableCursor')
  find(query?: any, projection?: any): ExplainableCursor {
    this._emitExplainableApiCall('find', { query, projection });

    const cursor = this._collection.find(query, projection);
    return new ExplainableCursor(this._mongo, cursor, this._verbosity);
  }

  @returnsPromise
  async aggregate(pipeline?: any, options?: any): Promise<any> {
    this._emitExplainableApiCall('aggregate', { pipeline, options });

    const cursor = await this._collection.aggregate(pipeline, {
      ...options,
      explain: false
    });

    return await cursor.explain(this._verbosity);
  }
}
