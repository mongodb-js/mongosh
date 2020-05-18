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
import { Document } from '@mongosh/service-provider-core';

@shellApiClassDefault
@hasAsyncChild
export default class Explainable extends ShellApiClass {
  mongo: Mongo;
  collection: Collection;
  verbosity: string;
  constructor(mongo, collection, verbosity) {
    super();
    this.mongo = mongo;
    this.collection = collection;
    this.verbosity = verbosity;
  }

  toReplString = (): string => {
    return `Explainable(${this.collection.getFullName()})`;
  };

  /**
   * Internal helper for emitting collection API call events.
   *
   * @param methodName
   * @param methodArguments
   * @private
   */
  private _emitExplainableApiCall(methodName: string, methodArguments: Document = {}): void {
    this.mongo.internalState.emitApiCall({
      method: methodName,
      class: 'Explainable',
      db: this.collection.database.name,
      coll: this.collection.name,
      arguments: methodArguments
    });
  }

  getCollection(): Collection {
    this._emitExplainableApiCall('getCollection');
    return this.collection;
  }

  getVerbosity(): string {
    this._emitExplainableApiCall('getVerbosity');
    return this.verbosity;
  }

  setVerbosity(verbosity: string): void {
    this.mongo.internalState.validateExplainableVerbosity(verbosity);
    this._emitExplainableApiCall('setVerbosity', { verbosity });
    this.verbosity = verbosity;
  }

  @returnType('ExplainableCursor')
  find(query?: any, projection?: any): ExplainableCursor {
    this._emitExplainableApiCall('find', { query, projection });

    const cursor = this.collection.find(query, projection);
    return new ExplainableCursor(this.mongo, cursor, this.verbosity);
  }

  @returnsPromise
  async aggregate(pipeline?: any, options?: any): Promise<any> {
    this._emitExplainableApiCall('aggregate', { pipeline, options });

    const cursor = await this.collection.aggregate(pipeline, {
      ...options,
      explain: false
    });

    return await cursor.explain(this.verbosity);
  }
}
