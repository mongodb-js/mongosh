import Mongo from './mongo';
import Collection from './collection';
import {
  shellApiClassDefault,
  returnsPromise,
  returnType,
  hasAsyncChild,
  ShellApiClass,
  serverVersions,
} from './decorators';
import { ServerVersions } from './enums';

import {
  Cursor as ServiceProviderCursor,
  Document,
  WriteConcern
} from '@mongosh/service-provider-core';
import { AggregationCursor } from './index';
import { MongoshInvalidInputError } from '@mongosh/errors';

@shellApiClassDefault
@hasAsyncChild
export default class Database extends ShellApiClass {
  mongo: Mongo;
  name: string;
  collections: any;

  constructor(mongo, name) {
    super();
    this.mongo = mongo;
    this.name = name;
    const collections = {};
    this.collections = collections;
    const proxy = new Proxy(this, {
      get: (target, prop): any => {
        if (prop in target) {
          return target[prop];
        }

        if (
          typeof prop !== 'string' ||
          prop.startsWith('_') ||
          !prop.trim()
        ) {
          return;
        }

        if (!collections[prop]) {
          collections[prop] = new Collection(mongo, proxy, prop);
        }

        return collections[prop];
      }
    });
    return proxy;
  }

  toReplString(): any {
    return this.name;
  }

  /**
   * Internal helper for emitting database API call events.
   *
   * @param methodName
   * @param methodArguments
   * @private
   */
  private _emitDatabaseApiCall(methodName: string, methodArguments: Document = {}): void {
    this.mongo.internalState.emitApiCall({
      method: methodName,
      class: 'Database',
      db: this.name,
      arguments: methodArguments
    });
  }

  @returnType('Mongo')
  getMongo(): Mongo {
    return this.mongo;
  }

  /**
   * Returns an array of collection names
   *
   * @return {Promise}
   */
  @returnsPromise
  async getCollectionNames(): Promise<any> {
    this._emitDatabaseApiCall('getCollectionNames');
    const infos = await this.getCollectionInfos({}, { nameOnly: true });
    return infos.map(collection => collection.name);
  }

  /**
   * Returns an array of collection infos
   *
   * @param {Document} filter - The filter.
   * @param {Document} options - The options.
   *
   * @return {Promise}
   */
  @returnsPromise
  @serverVersions(['3.0.0', ServerVersions.latest])
  async getCollectionInfos(filter: Document = {}, options: Document = {}): Promise<any> {
    this._emitDatabaseApiCall('getCollectionInfos', { filter, options });
    return await this.mongo.serviceProvider.listCollections(
      this.name,
      filter,
      options
    );
  }

  /**
   * Run a command against the db.
   *
   * @param {Object} cmd - the command spec.
   *
   * @returns {Promise} The promise of command results. TODO: command result object
   */
  @returnsPromise
  async runCommand(cmd: any): Promise<any> {
    this._emitDatabaseApiCall('runCommand', { cmd });
    return this.mongo.serviceProvider.runCommand(this.name, cmd);
  }

  /**
   * Run a command against the admin db.
   *
   * @param {Object} cmd - the command spec.
   *
   * @returns {Promise} The promise of command results. TODO: command result object
   */
  @returnsPromise
  @serverVersions(['3.4.0', ServerVersions.latest])
  adminCommand(cmd: any): Promise<any> {
    this._emitDatabaseApiCall( 'adminCommand', { cmd });
    return this.mongo.serviceProvider.runCommand('admin', cmd);
  }

  /**
   * Run an aggregation against the db.
   *
   * @param pipeline
   * @param options
   * @returns {Promise} The promise of aggregation results.
   */
  @returnsPromise
  @returnType('AggregationCursor')
  async aggregate(pipeline: Document[], options?: Document): Promise<AggregationCursor> {
    this._emitDatabaseApiCall('aggregate', { options, pipeline });

    const {
      providerOptions,
      dbOptions,
      explain
    } = this.mongo.internalState.adaptAggregateOptions(options);

    const providerCursor = this.mongo.serviceProvider.aggregateDb(
      this.name,
      pipeline,
      providerOptions,
      dbOptions
    ) as ServiceProviderCursor;
    const cursor = new AggregationCursor(this, providerCursor);

    if (explain) {
      return await cursor.explain('queryPlanner'); // TODO: set default or use optional argument
    }

    this.mongo.internalState.currentCursor = cursor;
    return cursor;
  }

  @returnType('Database')
  getSiblingDB(db: string): Database {
    this._emitDatabaseApiCall('getSiblingDB', { db });
    return this.mongo._getDb(db);
  }

  @returnType('Collection')
  getCollection(coll: string): Collection {
    this._emitDatabaseApiCall('getCollection', { coll });
    if (typeof coll !== 'string') {
      throw new MongoshInvalidInputError(
        `Collection name must be a string. Received ${typeof coll}.`);
    }

    if (!coll.trim()) {
      throw new MongoshInvalidInputError('Collection name cannot be empty.');
    }

    const collections: Record<string, Collection> = this.collections;

    if (!collections[coll]) {
      collections[coll] = new Collection(this.mongo, this, coll);
    }

    return collections[coll];
  }

  @returnsPromise
  async dropDatabase(writeConcern?: WriteConcern): Promise<any> {
    return await this.mongo.serviceProvider.dropDatabase(
      this.name,
      writeConcern
    );
  }
}
