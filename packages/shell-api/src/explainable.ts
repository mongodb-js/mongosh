import type { CollectionWithSchema } from './collection';
import type Mongo from './mongo';
import ExplainableCursor from './explainable-cursor';
import {
  returnsPromise,
  returnType,
  apiVersions,
  shellApiClassDefault,
  serverVersions,
  ShellApiWithMongoClass,
} from './decorators';
import { asPrintable, ServerVersions } from './enums';
import type {
  RemoveShellOptions,
  FindAndModifyShellOptions,
  FindAndModifyMethodShellOptions,
  MapReduceShellOptions,
} from './helpers';
import {
  validateExplainableVerbosity,
  processRemoveOptions,
  processMapReduceOptions,
  markAsExplainOutput,
} from './helpers';
import type {
  Document,
  ExplainVerbosityLike,
  CountOptions,
  DistinctOptions,
  UpdateOptions,
  FindOneAndDeleteOptions,
  FindOneAndReplaceOptions,
  FindOneAndUpdateOptions,
  FindOptions,
} from '@mongosh/service-provider-core';

@shellApiClassDefault
export default class Explainable extends ShellApiWithMongoClass {
  _mongo: Mongo;
  _collection: CollectionWithSchema;
  _verbosity: ExplainVerbosityLike;
  constructor(
    mongo: Mongo,
    collection: CollectionWithSchema,
    verbosity: ExplainVerbosityLike
  ) {
    super();
    this._mongo = mongo;
    this._collection = collection;
    this._verbosity = verbosity;
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  [asPrintable](): string {
    return `Explainable(${this._collection.getFullName()})`;
  }

  /**
   * Internal helper for emitting collection API call events.
   *
   * @param methodName
   * @param methodArguments
   * @private
   */
  private _emitExplainableApiCall(
    methodName: string,
    methodArguments: Document = {}
  ): void {
    this._mongo._instanceState.emitApiCallWithArgs({
      method: methodName,
      class: 'Explainable',
      db: this._collection._database._name,
      coll: this._collection._name,
      arguments: methodArguments,
    });
  }

  getCollection(): CollectionWithSchema {
    this._emitExplainableApiCall('getCollection');
    return this._collection;
  }

  getVerbosity(): ExplainVerbosityLike {
    this._emitExplainableApiCall('getVerbosity');
    return this._verbosity;
  }

  setVerbosity(verbosity: ExplainVerbosityLike): void {
    verbosity = validateExplainableVerbosity(verbosity);
    this._emitExplainableApiCall('setVerbosity', { verbosity });
    this._verbosity = verbosity;
  }

  @returnType('ExplainableCursor')
  @apiVersions([1])
  @returnsPromise
  async find(
    query?: Document,
    projection?: Document,
    options: FindOptions = {}
  ): Promise<ExplainableCursor> {
    this._emitExplainableApiCall('find', { query, projection });

    const cursor = await this._collection.find(query, projection, options);
    return new ExplainableCursor(this._mongo, cursor, this._verbosity);
  }

  async aggregate(pipeline: Document[], options: Document): Promise<Document>;
  async aggregate(...stages: Document[]): Promise<Document>;
  @returnsPromise
  @apiVersions([1])
  async aggregate(...args: any[]): Promise<Document> {
    this._emitExplainableApiCall('aggregate', { args });
    let options: Document;
    let pipeline: Document[];
    if (Array.isArray(args[0])) {
      pipeline = args[0];
      options = args[1] ?? {};
    } else {
      pipeline = args;
      options = {};
    }

    return await this._collection.aggregate(pipeline, {
      ...options,
      explain: this._verbosity,
    });
  }

  @returnsPromise
  @apiVersions([1])
  async count(query = {}, options: CountOptions = {}): Promise<Document> {
    this._emitExplainableApiCall('count', { query, options });
    // This is the only one that currently lacks explicit driver support.
    return markAsExplainOutput(
      await this._collection._database._runReadCommand({
        explain: {
          count: `${this._collection._name}`,
          query,
          ...options,
        },
        verbosity: this._verbosity,
      })
    );
  }

  async distinct(field: string): Promise<Document>;
  async distinct(field: string, query: Document): Promise<Document>;
  async distinct(
    field: string,
    query: Document,
    options: DistinctOptions
  ): Promise<Document>;
  @returnsPromise
  @apiVersions([1])
  async distinct(
    field: string,
    query?: Document,
    options: DistinctOptions = {}
  ): Promise<Document> {
    this._emitExplainableApiCall('distinct', { field, query, options });
    return this._collection.distinct(field, query ?? {}, {
      ...options,
      explain: this._verbosity,
    });
  }

  @returnsPromise
  @apiVersions([1])
  async findAndModify(
    options: FindAndModifyMethodShellOptions
  ): Promise<Document | null> {
    this._emitExplainableApiCall('findAndModify', { options });
    return this._collection.findAndModify({
      ...options,
      explain: this._verbosity,
    });
  }

  @returnsPromise
  @apiVersions([1])
  async findOneAndDelete(
    filter: Document,
    options: FindOneAndDeleteOptions = {}
  ): Promise<Document | null> {
    this._emitExplainableApiCall('findOneAndDelete', { filter, options });
    return this._collection.findOneAndDelete(filter, {
      ...options,
      explain: this._verbosity,
    });
  }

  @returnsPromise
  @apiVersions([1])
  async findOneAndReplace(
    filter: Document,
    replacement: Document,
    options: FindAndModifyShellOptions<FindOneAndReplaceOptions> = {}
  ): Promise<Document> {
    this._emitExplainableApiCall('findOneAndReplace', { filter, options });
    return this._collection.findOneAndReplace(filter, replacement, {
      ...options,
      explain: this._verbosity,
    });
  }

  @returnsPromise
  @apiVersions([1])
  async findOneAndUpdate(
    filter: Document,
    update: Document,
    options: FindAndModifyShellOptions<FindOneAndUpdateOptions> = {}
  ): Promise<Document> {
    this._emitExplainableApiCall('findOneAndUpdate', { filter, options });
    return this._collection.findOneAndUpdate(filter, update, {
      ...options,
      explain: this._verbosity,
    });
  }

  @returnsPromise
  @apiVersions([1])
  async remove(
    query: Document,
    options: boolean | RemoveShellOptions = {}
  ): Promise<Document> {
    this._emitExplainableApiCall('remove', { query, options });
    options = { ...processRemoveOptions(options), explain: this._verbosity };
    return this._collection.remove(query, options);
  }

  @returnsPromise
  @apiVersions([1])
  async update(
    filter: Document,
    update: Document,
    options: UpdateOptions = {}
  ): Promise<Document> {
    this._emitExplainableApiCall('update', { filter, update, options });
    return this._collection.update(filter, update, {
      ...options,
      explain: this._verbosity,
    });
  }

  @returnsPromise
  @serverVersions(['4.4.0', ServerVersions.latest])
  @apiVersions([])
  async mapReduce(
    map: Function | string,
    reduce: Function | string,
    optionsOrOutString: MapReduceShellOptions
  ): Promise<Document> {
    this._emitExplainableApiCall('mapReduce', {
      map,
      reduce,
      optionsOrOutString,
    });
    const options = {
      ...processMapReduceOptions(optionsOrOutString),
      explain: this._verbosity,
    };
    return this._collection.mapReduce(map, reduce, options);
  }
}
