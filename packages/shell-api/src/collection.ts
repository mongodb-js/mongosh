import type Mongo from './mongo';
import type { Namespace } from './decorators';
import {
  addSourceToResults,
  returnsPromise,
  returnType,
  serverVersions,
  apiVersions,
  shellApiClassDefault,
  topologies,
  deprecated,
  ShellApiWithMongoClass,
} from './decorators';
import {
  asPrintable,
  namespaceInfo,
  ServerVersions,
  Topologies,
} from './enums';
import type {
  FindAndModifyShellOptions,
  FindAndModifyMethodShellOptions,
  RemoveShellOptions,
  MapReduceShellOptions,
  GenericCollectionSchema,
  GenericDatabaseSchema,
  GenericServerSideSchema,
  StringKey,
  SearchIndexDefinition,
} from './helpers';
import {
  adaptAggregateOptions,
  assertKeysDefined,
  dataFormat,
  validateExplainableVerbosity,
  processFindAndModifyOptions,
  processRemoveOptions,
  processMapReduceOptions,
  setHideIndex,
  maybeMarkAsExplainOutput,
  markAsExplainOutput,
  assertArgsDefinedType,
  isValidCollectionName,
  scaleIndividualShardStatistics,
  shouldRunAggregationImmediately,
  coerceToJSNumber,
  buildConfigChunksCollectionMatch,
  onlyShardedCollectionsInConfigFilter,
  aggregateBackgroundOptionNotSupportedHelp,
} from './helpers';
import type {
  AnyBulkWriteOperation,
  BulkWriteOptions,
  CountOptions,
  CountDocumentsOptions,
  ChangeStreamOptions,
  CreateIndexesOptions,
  DeleteOptions,
  DistinctOptions,
  Document,
  EstimatedDocumentCountOptions,
  ExplainVerbosityLike,
  FindOneAndDeleteOptions,
  FindOneAndReplaceOptions,
  FindOneAndUpdateOptions,
  FindOptions,
  InsertOneOptions,
  ReplaceOptions,
  RunCommandOptions,
  UpdateOptions,
  DropCollectionOptions,
  CheckMetadataConsistencyOptions,
  AggregateOptions,
  SearchIndexDescription,
} from '@mongosh/service-provider-core';
import type { RunCommandCursor, Database, DatabaseWithSchema } from './index';
import {
  AggregationCursor,
  BulkWriteResult,
  CommandResult,
  Cursor,
  DeleteResult,
  Explainable,
  InsertManyResult,
  InsertOneResult,
  UpdateResult,
} from './index';
import {
  CommonErrors,
  MongoshInvalidInputError,
  MongoshRuntimeError,
  MongoshInternalError,
} from '@mongosh/errors';
import Bulk from './bulk';
import { HIDDEN_COMMANDS } from '@mongosh/history';
import PlanCache from './plan-cache';
import ChangeStreamCursor from './change-stream-cursor';
import { ShellApiErrors } from './error-codes';

export type CollectionWithSchema<
  M extends GenericServerSideSchema = GenericServerSideSchema,
  D extends GenericDatabaseSchema = M[keyof M],
  C extends GenericCollectionSchema = D[keyof D],
  N extends StringKey<D> = StringKey<D>
> = Collection<M, D, C, N> & {
  [k in StringKey<D> as k extends `${N}.${infer S}` ? S : never]: Collection<
    M,
    D,
    D[k],
    k
  >;
};

@shellApiClassDefault
@addSourceToResults
export class Collection<
  M extends GenericServerSideSchema = GenericServerSideSchema,
  D extends GenericDatabaseSchema = M[keyof M],
  C extends GenericCollectionSchema = D[keyof D],
  N extends StringKey<D> = StringKey<D>
> extends ShellApiWithMongoClass {
  _mongo: Mongo<M>;
  _database: DatabaseWithSchema<M, D>;
  _name: N;

  constructor(
    mongo: Mongo<M>,
    database: DatabaseWithSchema<M, D> | Database<M, D>,
    name: N
  ) {
    super();
    this._mongo = mongo;
    this._database = database as DatabaseWithSchema<M, D>;
    this._name = name;
    const proxy = new Proxy(this, {
      get: (target, prop): any => {
        if (prop in target) {
          return (target as any)[prop];
        }

        if (
          typeof prop !== 'string' ||
          prop.startsWith('_') ||
          !isValidCollectionName(prop)
        ) {
          return;
        }
        return database.getCollection(`${name}.${prop}`);
      },
    });
    return proxy;
  }

  [namespaceInfo](): Namespace {
    return { db: this._database.getName(), collection: this._name };
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  [asPrintable](): string {
    return `${this._database.getName()}.${this._name}`;
  }

  /**
   * Internal helper for emitting collection API call events.
   *
   * @param methodName
   * @param methodArguments
   * @private
   */
  private _emitCollectionApiCall(
    methodName: string,
    methodArguments: Document = {}
  ): void {
    this._mongo._instanceState.emitApiCallWithArgs({
      method: methodName,
      class: 'Collection',
      db: this._database._name,
      coll: this._name,
      arguments: methodArguments,
    });
  }

  /**
   * Run an aggregation against the collection. Accepts array pipeline and options object OR stages as individual arguments.
   *
   * @returns {Promise} The promise of aggregation results.
   */
  async aggregate(
    pipeline: Document[],
    options: AggregateOptions & { explain: ExplainVerbosityLike }
  ): Promise<Document>;
  async aggregate(
    pipeline: Document[],
    options?: AggregateOptions
  ): Promise<AggregationCursor>;
  async aggregate(...stages: Document[]): Promise<AggregationCursor>;
  @returnsPromise
  @returnType('AggregationCursor')
  @apiVersions([1])
  async aggregate(...args: unknown[]): Promise<AggregationCursor | Document> {
    let options: AggregateOptions;
    let pipeline: Document[];
    if (args.length === 0 || Array.isArray(args[0])) {
      options = args[1] || {};
      pipeline = (args[0] as Document[]) || [];
    } else {
      options = {};
      pipeline = (args as Document[]) || [];
    }

    if ('background' in options) {
      await this._instanceState.printWarning(
        aggregateBackgroundOptionNotSupportedHelp
      );
    }
    this._emitCollectionApiCall('aggregate', { options, pipeline });
    const { aggOptions, dbOptions, explain } = adaptAggregateOptions(options);

    const providerCursor = this._mongo._serviceProvider.aggregate(
      this._database._name,
      this._name,
      pipeline,
      { ...(await this._database._baseOptions()), ...aggOptions },
      dbOptions
    );
    const cursor = new AggregationCursor(this._mongo, providerCursor);

    if (explain) {
      return await cursor.explain(explain);
    } else if (shouldRunAggregationImmediately(pipeline)) {
      await cursor.hasNext();
    }

    this._mongo._instanceState.currentCursor = cursor;
    return cursor;
  }

  /**
   * Execute a mix of write operations.
   *
   * @note: Shell API sets writeConcern via options in object, data provider API
   * expects it as a dbOption object.
   *
   * @param {Array} operations - The bulk write requests.
   * @param {Object} options - The bulk write options.
   *  <writeConcern, ordered>
   *
   * @returns {BulkWriteResult} The promise of the result.
   */
  @returnsPromise
  @serverVersions(['3.2.0', ServerVersions.latest])
  @apiVersions([1])
  async bulkWrite(
    operations: AnyBulkWriteOperation[],
    options: BulkWriteOptions = {}
  ): Promise<BulkWriteResult> {
    this._emitCollectionApiCall('bulkWrite', { options });

    const result = await this._mongo._serviceProvider.bulkWrite(
      this._database._name,
      this._name,
      operations,
      { ...(await this._database._baseOptions()), ...options }
    );

    return new BulkWriteResult(
      !!result.ok,
      result.insertedCount,
      result.insertedIds,
      result.matchedCount,
      result.modifiedCount,
      result.deletedCount,
      result.upsertedCount,
      result.upsertedIds
    );
  }

  /**
   * Deprecated count command.
   *
   * @note: Shell API passes readConcern via options, data provider API via
   * collection options.
   *
   * @param {Object} query - The filter.
   * @param {Object} options - The count options.
   *  <limit, skip, hint, maxTimeMS, readConcern, collation>
   * @returns {Integer} The promise of the count.
   */
  @returnsPromise
  @deprecated
  @serverVersions([ServerVersions.earliest, '4.0.0'])
  @apiVersions([])
  async count(query = {}, options: CountOptions = {}): Promise<number> {
    await this._instanceState.printDeprecationWarning(
      'Collection.count() is deprecated. Use countDocuments or estimatedDocumentCount.'
    );

    this._emitCollectionApiCall('count', { query, options });

    return this._mongo._serviceProvider.count(
      this._database._name,
      this._name,
      query,
      { ...(await this._database._baseOptions()), ...options }
    );
  }

  /**
   * Get an exact document count from the coll.
   *
   * @param {Object} query - The filter.
   * @param {Object} options - The count options.
   *  <limit, skip, hint, maxTimeMS>
   *
   * @returns {Integer} The promise of the count.
   */
  @returnsPromise
  @serverVersions(['4.0.3', ServerVersions.latest])
  @apiVersions([1])
  async countDocuments(
    query?: Document,
    options: CountDocumentsOptions = {}
  ): Promise<number> {
    this._emitCollectionApiCall('countDocuments', { query, options });
    return this._mongo._serviceProvider.countDocuments(
      this._database._name,
      this._name,
      query,
      { ...(await this._database._baseOptions()), ...options }
    );
  }

  /**
   * Delete multiple documents from the coll.
   *
   * @note: Shell API sets writeConcern via options in object, data provider API
   * expects it as a dbOption object.
   *
   * @param {Object} filter - The filter.
   * @param {Object} options - The delete many options.
   *  <collation, writeConcern>
   *
   * @returns {DeleteResult} The promise of the result.
   */
  @returnsPromise
  @apiVersions([1])
  async deleteMany(
    filter: Document,
    options: DeleteOptions = {}
  ): Promise<DeleteResult | Document> {
    assertArgsDefinedType([filter], [true], 'Collection.deleteMany');
    this._emitCollectionApiCall('deleteMany', { filter, options });

    const result = await this._mongo._serviceProvider.deleteMany(
      this._database._name,
      this._name,
      filter,
      { ...(await this._database._baseOptions()), ...options }
    );
    if (options.explain) {
      return markAsExplainOutput(result);
    }

    return new DeleteResult(!!result.acknowledged, result.deletedCount);
  }

  /**
   * Delete one document from the coll.
   *
   * @note: Shell API sets writeConcern via options in object, data provider API
   * expects it as a dbOption object.
   *
   * @param {Object} filter - The filter.
   * @param {Object} options - The delete one options.
   *  <collation, writeConcern>
   *
   * @returns {DeleteResult} The promise of the result.
   */
  @returnsPromise
  @apiVersions([1])
  async deleteOne(
    filter: Document,
    options: DeleteOptions = {}
  ): Promise<DeleteResult | Document> {
    assertArgsDefinedType([filter], [true], 'Collection.deleteOne');
    this._emitCollectionApiCall('deleteOne', { filter, options });

    const result = await this._mongo._serviceProvider.deleteOne(
      this._database._name,
      this._name,
      filter,
      { ...(await this._database._baseOptions()), ...options }
    );
    if (options.explain) {
      return markAsExplainOutput(result);
    }

    return new DeleteResult(!!result.acknowledged, result.deletedCount);
  }

  /**
   * Get distinct values for the field.
   *
   * @note Data Provider API also provides maxTimeMS option.
   *
   * @param {String} field - The field name.
   * @param {Object} query - The filter.
   * @param {Object} options - The distinct options.
   *  <collation>
   *
   * @returns {Array} The promise of the result.
   */
  async distinct(field: string): Promise<Document>;
  async distinct(field: string, query: Document): Promise<Document>;
  async distinct(
    field: string,
    query: Document,
    options: DistinctOptions
  ): Promise<Document>;
  @returnsPromise
  @apiVersions([])
  async distinct(
    field: string,
    query?: Document,
    options: DistinctOptions = {}
  ): Promise<Document> {
    this._emitCollectionApiCall('distinct', { field, query, options });
    return maybeMarkAsExplainOutput(
      await this._mongo._serviceProvider.distinct(
        this._database._name,
        this._name,
        field,
        query,
        { ...(await this._database._baseOptions()), ...options }
      ),
      options
    );
  }

  /**
   * Get an estimated document count from the coll.
   *
   * @param {Object} options - The count options.
   *  <maxTimeMS>
   *
   * @returns {Integer} The promise of the count.
   */
  @returnsPromise
  @serverVersions(['4.0.3', ServerVersions.latest])
  @apiVersions([1])
  async estimatedDocumentCount(
    options: EstimatedDocumentCountOptions = {}
  ): Promise<number> {
    this._emitCollectionApiCall('estimatedDocumentCount', { options });
    return this._mongo._serviceProvider.estimatedDocumentCount(
      this._database._name,
      this._name,
      { ...(await this._database._baseOptions()), ...options }
    );
  }

  /**
   * Find documents in the collection.
   *
   * @note: Shell API passes filter and projection to find, data provider API
   * uses a options object.
   *
   * @param {Object} query - The filter.
   * @param {Object} projection - The projection.
   *
   * @returns {Cursor} The promise of the cursor.
   */
  @returnType('Cursor')
  @apiVersions([1])
  @returnsPromise
  async find(
    query?: Document,
    projection?: Document,
    options: FindOptions = {}
  ): Promise<Cursor> {
    if (projection) {
      options.projection = projection;
    }

    this._emitCollectionApiCall('find', { query, options });
    const cursor = new Cursor(
      this._mongo,
      this._mongo._serviceProvider.find(
        this._database._name,
        this._name,
        query,
        { ...(await this._database._baseOptions()), ...options }
      )
    );

    this._mongo._instanceState.currentCursor = cursor;
    return cursor;
  }

  @returnsPromise
  @deprecated
  @apiVersions([1])
  async findAndModify(
    options: FindAndModifyMethodShellOptions
  ): Promise<Document | null> {
    assertArgsDefinedType([options], [true], 'Collection.findAndModify');
    assertKeysDefined(options, ['query']);
    this._emitCollectionApiCall('findAndModify', {
      options: { ...options, update: !!options.update },
    });
    const reducedOptions: Omit<
      FindAndModifyMethodShellOptions,
      'query' | 'update'
    > = { ...options };
    if (
      reducedOptions.projection !== undefined &&
      reducedOptions.fields !== undefined
    ) {
      throw new MongoshInvalidInputError(
        'Cannot specify both .fields and .projection for findAndModify()',
        CommonErrors.InvalidArgument
      );
    }
    reducedOptions.projection ??= reducedOptions.fields;
    delete (reducedOptions as any).query;
    delete (reducedOptions as any).update;
    delete (reducedOptions as any).fields;
    if (options.remove) {
      return this.findOneAndDelete(options.query, reducedOptions);
    }
    const { update } = options;
    if (!update) {
      throw new MongoshInvalidInputError(
        'Must specify options.update or options.remove',
        CommonErrors.InvalidArgument
      );
    }
    if (
      Array.isArray(update) ||
      Object.keys(update).some((key) => key.startsWith('$'))
    ) {
      return this.findOneAndUpdate(options.query, update, reducedOptions);
    }
    return this.findOneAndReplace(options.query, update, reducedOptions);
  }

  /**
   * Find one document in the collection.
   *
   * @note: findOne is just find with limit.
   *
   * @param {Object} query - The filter.
   * @param {Object} projection - The projection.
   *
   * @returns {Cursor} The promise of the cursor.
   */
  @returnsPromise
  @returnType('Document')
  @apiVersions([1])
  async findOne(
    query: Document = {},
    projection?: Document,
    options: FindOptions = {}
  ): Promise<C['schema'] | null> {
    if (projection) {
      options.projection = projection;
    }

    this._emitCollectionApiCall('findOne', { query, options });
    return new Cursor(
      this._mongo,
      this._mongo._serviceProvider.find(
        this._database._name,
        this._name,
        query,
        { ...(await this._database._baseOptions()), ...options }
      )
    )
      .limit(1)
      .tryNext();
  }

  @returnsPromise
  @apiVersions([1])
  async renameCollection(
    newName: string,
    dropTarget?: boolean
  ): Promise<Document> {
    assertArgsDefinedType([newName], ['string'], 'Collection.renameCollection');
    this._emitCollectionApiCall('renameCollection', { newName, dropTarget });

    try {
      await this._mongo._serviceProvider.renameCollection(
        this._database._name,
        this._name,
        newName,
        { ...(await this._database._baseOptions()), dropTarget: !!dropTarget }
      );

      return {
        ok: 1,
      };
    } catch (e: any) {
      if (e?.name === 'MongoError') {
        return {
          ok: 0,
          errmsg: e.errmsg,
          code: e.code,
          codeName: e.codeName,
        };
      }

      throw e;
    }
  }

  /**
   * Find one document and delete it.
   *
   * @param {Object} filter - The filter.
   * @param {Object} options - The find options.
   *  <projection, sort, collation, maxTimeMS>
   *
   * @returns {Document} The promise of the result.
   */
  @returnsPromise
  @returnType('Document')
  @serverVersions(['3.2.0', ServerVersions.latest])
  @apiVersions([1])
  async findOneAndDelete(
    filter: Document,
    options: FindOneAndDeleteOptions = {}
  ): Promise<Document | null> {
    assertArgsDefinedType([filter], [true], 'Collection.findOneAndDelete');
    this._emitCollectionApiCall('findOneAndDelete', { filter, options });
    const result = await this._mongo._serviceProvider.findOneAndDelete(
      this._database._name,
      this._name,
      filter,
      { ...(await this._database._baseOptions()), ...options }
    );

    if (options.explain && result) {
      return markAsExplainOutput(result);
    }
    return result?.value;
  }

  /**
   * Find one document and replace it.
   *
   * @note: Shell API uses option 'returnNewDocument' while data provider API
   * expects 'returnDocument'.
   * @note: Data provider API provides bypassDocumentValidation option that shell does not have.
   *
   * @param {Object} filter - The filter.
   * @param {Object} replacement - The replacement.
   * @param {Object} options - The find options.
   *  <projection, sort, upsert, maxTimeMS, returnNewDocument, collation>
   *
   * @returns {Document} The promise of the result.
   */
  @returnsPromise
  @returnType('Document')
  @serverVersions(['3.2.0', ServerVersions.latest])
  @apiVersions([1])
  async findOneAndReplace(
    filter: Document,
    replacement: Document,
    options: FindAndModifyShellOptions<FindOneAndReplaceOptions> = {}
  ): Promise<Document> {
    assertArgsDefinedType([filter], [true], 'Collection.findOneAndReplace');
    const findOneAndReplaceOptions = processFindAndModifyOptions({
      ...(await this._database._baseOptions()),
      ...options,
    });

    this._emitCollectionApiCall('findOneAndReplace', {
      filter,
      findOneAndReplaceOptions,
    });
    const result = await this._mongo._serviceProvider.findOneAndReplace(
      this._database._name,
      this._name,
      filter,
      replacement,
      findOneAndReplaceOptions
    );

    if (options.explain) {
      return markAsExplainOutput(result);
    }
    return result.value;
  }

  /**
   * Find one document and update it.
   *
   * @note: Shell API uses option 'returnNewDocument' while data provider API
   * expects 'returnDocument'.
   *
   * @param {Object} filter - The filter.
   * @param {(Object|Array)} update - The update.
   * @param {Object} options - The find options.
   *  <projection, sort,maxTimeMS,upsert,returnNewDocument,collation, arrayFilters>
   *
   * @returns {Document} The promise of the result.
   */
  @returnsPromise
  @returnType('Document')
  @serverVersions(['3.2.0', ServerVersions.latest])
  @apiVersions([1])
  async findOneAndUpdate(
    filter: Document,
    update: Document | Document[],
    options: FindAndModifyShellOptions<FindOneAndUpdateOptions> = {}
  ): Promise<Document> {
    assertArgsDefinedType([filter], [true], 'Collection.findOneAndUpdate');
    const findOneAndUpdateOptions = processFindAndModifyOptions({
      ...(await this._database._baseOptions()),
      ...options,
    });

    this._emitCollectionApiCall('findOneAndUpdate', {
      filter,
      findOneAndUpdateOptions,
    });
    const result = await this._mongo._serviceProvider.findOneAndUpdate(
      this._database._name,
      this._name,
      filter,
      update,
      findOneAndUpdateOptions
    );

    if (options.explain) {
      return markAsExplainOutput(result);
    }
    return result.value;
  }

  /**
   * Alias for insertMany.
   *
   * @note: Shell API sets writeConcern via options in object, data provider API
   * expects it as a dbOption object.
   *
   * @param {Object|Array} docs
   * @param {Object} options
   *    <writeConcern, ordered>
   * @return {InsertManyResult}
   */
  @returnsPromise
  @deprecated
  @serverVersions([ServerVersions.earliest, '3.6.0'])
  @apiVersions([1])
  async insert(
    docs: Document | Document[],
    options: BulkWriteOptions = {}
  ): Promise<InsertManyResult> {
    await this._instanceState.printDeprecationWarning(
      'Collection.insert() is deprecated. Use insertOne, insertMany, or bulkWrite.'
    );
    assertArgsDefinedType([docs], [true], 'Collection.insert');
    // When inserting documents into MongoDB that do not contain the _id field,
    // one will be added to each of the documents missing it by the Node driver,
    // mutating the document. To prevent this behaviour we pass not the original document,
    // but its copy, to keep the original document immutable.
    // https://github.com/mongodb/node-mongodb-native/blob/3.6/lib/collection.js#L487-L489
    const docsToInsert: Document[] = Array.isArray(docs)
      ? docs.map((doc) => ({ ...doc }))
      : [{ ...docs }];

    this._emitCollectionApiCall('insert', { options });
    const result = await this._mongo._serviceProvider.insertMany(
      this._database._name,
      this._name,
      docsToInsert,
      { ...(await this._database._baseOptions()), ...options }
    );

    return new InsertManyResult(!!result.acknowledged, result.insertedIds);
  }

  /**
   * Insert multiple documents.
   *
   * @note: Shell API sets writeConcern via options in object, data provider API
   * expects it as a dbOption object.
   * @note: Data provider API allows for bypassDocumentValidation as argument,
   * shell API doesn't.
   *
   * @param {Object|Array} docs
   * @param {Object} options
   *    <writeConcern, ordered>
   * @return {InsertManyResult}
   */
  @returnsPromise
  @serverVersions(['3.2.0', ServerVersions.latest])
  @apiVersions([1])
  async insertMany(
    docs: Document[],
    options: BulkWriteOptions = {}
  ): Promise<InsertManyResult> {
    assertArgsDefinedType([docs], [true], 'Collection.insertMany');
    const docsToInsert: Document[] = Array.isArray(docs)
      ? docs.map((doc) => ({ ...doc }))
      : docs;

    this._emitCollectionApiCall('insertMany', { options });
    const result = await this._mongo._serviceProvider.insertMany(
      this._database._name,
      this._name,
      docsToInsert,
      { ...(await this._database._baseOptions()), ...options }
    );

    return new InsertManyResult(!!result.acknowledged, result.insertedIds);
  }

  /**
   * Insert one document.
   *
   * @note: Shell API sets writeConcern via options in object, data provider API
   * expects it as a dbOption object.
   * @note: Data provider API allows for bypassDocumentValidation as argument,
   * shell API doesn't.
   *
   * @param {Object} doc
   * @param {Object} options
   *    <writeConcern>
   * @return {InsertOneResult}
   */
  @returnsPromise
  @serverVersions(['3.2.0', ServerVersions.latest])
  @apiVersions([1])
  async insertOne(
    doc: Document,
    options: InsertOneOptions = {}
  ): Promise<InsertOneResult> {
    assertArgsDefinedType([doc], [true], 'Collection.insertOne');

    this._emitCollectionApiCall('insertOne', { options });
    const result = await this._mongo._serviceProvider.insertOne(
      this._database._name,
      this._name,
      { ...doc },
      { ...(await this._database._baseOptions()), ...options }
    );

    return new InsertOneResult(!!result.acknowledged, result.insertedId);
  }

  /**
   * Is collection capped?
   *
   * @return {Boolean}
   */
  @returnsPromise
  @apiVersions([1])
  async isCapped(): Promise<boolean> {
    this._emitCollectionApiCall('isCapped');

    // Not implemented using the Node.js driver helper to make this easier for the java shell
    const colls = await this._database._listCollections(
      { name: this._name },
      { nameOnly: false }
    );
    if (colls.length === 0) {
      throw new MongoshRuntimeError(
        `collection ${this.getFullName()} not found`
      );
    }
    return !!colls[0]?.options?.capped;
  }

  /**
   * Deprecated remove command.
   *
   * @note: Shell API sets writeConcern via options in object, data provider API
   * expects it as a dbOption object.
   * @note: Shell API accepts second argument as a bool, indicating justOne.
   *
   * @param {Object} query
   * @param {Object|Boolean} options
   *    <justOne, writeConcern, collation>
   * @return {Promise}
   */
  @returnsPromise
  @deprecated
  @serverVersions([ServerVersions.earliest, '3.2.0'])
  @apiVersions([1])
  async remove(
    query: Document,
    options: boolean | RemoveShellOptions = {}
  ): Promise<DeleteResult | Document> {
    await this._instanceState.printDeprecationWarning(
      'Collection.remove() is deprecated. Use deleteOne, deleteMany, findOneAndDelete, or bulkWrite.'
    );
    assertArgsDefinedType([query], [true], 'Collection.remove');
    const removeOptions = processRemoveOptions(options);
    const method = removeOptions.justOne ? 'deleteOne' : 'deleteMany';
    delete removeOptions.justOne;

    this._emitCollectionApiCall('remove', { query, removeOptions });
    const result = await this._mongo._serviceProvider[method](
      this._database._name,
      this._name,
      query,
      { ...(await this._database._baseOptions()), ...removeOptions }
    );
    if (removeOptions.explain) {
      return markAsExplainOutput(result);
    }
    return new DeleteResult(!!result.acknowledged, result.deletedCount);
  }

  /**
   * Replace a document with another.
   *
   * @note: Shell API sets writeConcern via options in object, data provider API
   * expects it as a dbOption object.
   * @note: Data provider API allows for bypassDocumentValidation as argument,
   * shell API doesn't.
   *
   * @param {Object} filter - The filter.
   * @param {Object} replacement - The replacement document for matches.
   * @param {Object} options - The replace options.
   *    <upsert, writeConcern, collation, hint>
   *
   * @returns {UpdateResult} The promise of the result.
   */
  @returnsPromise
  @serverVersions(['3.2.0', ServerVersions.latest])
  @apiVersions([1])
  async replaceOne(
    filter: Document,
    replacement: Document,
    options: ReplaceOptions = {}
  ): Promise<UpdateResult> {
    assertArgsDefinedType([filter], [true], 'Collection.replaceOne');

    this._emitCollectionApiCall('replaceOne', { filter, options });
    const result = await this._mongo._serviceProvider.replaceOne(
      this._database._name,
      this._name,
      filter,
      replacement,
      { ...(await this._database._baseOptions()), ...options }
    );
    return new UpdateResult(
      !!result.acknowledged,
      result.matchedCount,
      result.modifiedCount,
      result.upsertedCount,
      result.upsertedId
    );
  }

  @returnsPromise
  @deprecated
  @serverVersions([ServerVersions.earliest, '3.2.0'])
  @apiVersions([1])
  async update(
    filter: Document,
    update: Document,
    options: UpdateOptions & { multi?: boolean } = {}
  ): Promise<UpdateResult | Document> {
    await this._instanceState.printDeprecationWarning(
      'Collection.update() is deprecated. Use updateOne, updateMany, or bulkWrite.'
    );
    assertArgsDefinedType([filter, update], [true, true], 'Collection.update');
    this._emitCollectionApiCall('update', { filter, options });
    let result;

    if (options.multi) {
      result = await this._mongo._serviceProvider.updateMany(
        this._database._name,
        this._name,
        filter,
        update,
        { ...(await this._database._baseOptions()), ...options }
      );
    } else {
      result = await this._mongo._serviceProvider.updateOne(
        this._database._name,
        this._name,
        filter,
        update,
        { ...(await this._database._baseOptions()), ...options }
      );
    }
    if (options.explain) {
      return markAsExplainOutput(result);
    }
    return new UpdateResult(
      !!result.acknowledged,
      result.matchedCount,
      result.modifiedCount,
      result.upsertedCount,
      result.upsertedId
    );
  }

  /**
   * Update many documents.
   *
   * @note: Shell API sets writeConcern via options in object, data provider API
   * expects it as a dbOption object.
   *
   * @param {Object} filter - The filter.
   * @param {(Object|Array)} update - The updates.
   * @param {Object} options - The update options.
   *  <upsert, writeConcern, collation, arrayFilters, hint>
   *
   * @returns {UpdateResult} The promise of the result.
   */
  @returnsPromise
  @serverVersions(['3.2.0', ServerVersions.latest])
  @apiVersions([1])
  async updateMany(
    filter: Document,
    update: Document,
    options: UpdateOptions = {}
  ): Promise<UpdateResult | Document> {
    assertArgsDefinedType([filter], [true], 'Collection.updateMany');
    this._emitCollectionApiCall('updateMany', { filter, options });
    const result = await this._mongo._serviceProvider.updateMany(
      this._database._name,
      this._name,
      filter,
      update,
      { ...(await this._database._baseOptions()), ...options }
    );
    if (options.explain) {
      return markAsExplainOutput(result);
    }

    return new UpdateResult(
      !!result.acknowledged,
      result.matchedCount,
      result.modifiedCount,
      result.upsertedCount,
      result.upsertedId
    );
  }

  /**
   * Update one document.
   *
   * @note: Shell API sets writeConcern via options in object, data provider API
   * expects it as a dbOption object.
   *
   * @param {Object} filter - The filter.
   * @param {(Object|Array)} update - The updates.
   * @param {Object} options - The update options.
   *  <upsert, writeConcern, collation, arrayFilters, hint>
   *
   * @returns {UpdateResult} The promise of the result.
   */
  @returnsPromise
  @serverVersions(['3.2.0', ServerVersions.latest])
  @apiVersions([1])
  async updateOne(
    filter: Document,
    update: Document,
    options: UpdateOptions = {}
  ): Promise<UpdateResult | Document> {
    assertArgsDefinedType([filter], [true], 'Collection.updateOne');
    this._emitCollectionApiCall('updateOne', { filter, options });
    const result = await this._mongo._serviceProvider.updateOne(
      this._database._name,
      this._name,
      filter,
      update,
      { ...(await this._database._baseOptions()), ...options }
    );
    if (options.explain) {
      return markAsExplainOutput(result);
    }

    return new UpdateResult(
      !!result.acknowledged,
      result.matchedCount,
      result.modifiedCount,
      result.upsertedCount,
      result.upsertedId
    );
  }

  /**
   * Compacts structured encryption data.
   *
   * @return {Promise}
   */
  @returnsPromise
  @apiVersions([])
  async compactStructuredEncryptionData(): Promise<Document> {
    if (!this._mongo._fleOptions) {
      throw new MongoshInvalidInputError(
        'The "compactStructuredEncryptionData" command requires Mongo instance configured with auto encryption.',
        CommonErrors.InvalidArgument
      );
    }

    this._emitCollectionApiCall('compactStructuredEncryptionData');
    return await this._database._runCommand({
      compactStructuredEncryptionData: this._name,
    });
  }

  /**
   * Converts a collection to capped
   *
   * @param {String} size - The maximum size, in bytes, for the capped collection.
   *
   * @return {Promise}
   */
  @returnsPromise
  @apiVersions([])
  async convertToCapped(size: number): Promise<Document> {
    this._emitCollectionApiCall('convertToCapped', { size });
    return await this._database._runCommand({
      convertToCapped: this._name,
      size,
    });
  }

  /**
   * Internal function which calls the Service Provider createIndexes function.
   * This function is used also by createIndex and ensureIndex
   *
   * @param {Document} keyPatterns - An array of documents that contains
   *  the field and value pairs where the field is the index key and the
   *  value describes the type of index for that field.
   * @param {Document} options - createIndexes options (
   *  name, background, sparse ...)
   * @return {Promise}
   */
  async _createIndexes(
    keyPatterns: Document[],
    options: CreateIndexesOptions = {},
    commitQuorum?: number | string
  ): Promise<string[]> {
    assertArgsDefinedType([keyPatterns], [true], 'Collection.createIndexes');
    if (typeof options !== 'object' || Array.isArray(options)) {
      throw new MongoshInvalidInputError(
        'The "options" argument must be an object.',
        CommonErrors.InvalidArgument
      );
    }
    const specs = keyPatterns.map((pattern) => ({
      ...options,
      key: pattern,
    }));
    const createIndexesOptions: CreateIndexesOptions = {
      ...(await this._database._baseOptions()),
      ...options,
    };
    if (undefined !== commitQuorum) {
      createIndexesOptions.commitQuorum = commitQuorum;
    }
    return await this._mongo._serviceProvider.createIndexes(
      this._database._name,
      this._name,
      specs,
      createIndexesOptions
    );
  }
  /**
   * Create indexes for a collection
   *
   * @param {Document} keyPatterns - An array of documents that contains
   *  the field and value pairs where the field is the index key and the
   *  value describes the type of index for that field.
   * @param {Document} options - createIndexes options (
   *  name, background, sparse ...)
   * @return {Promise}
   */
  @returnsPromise
  @serverVersions(['3.2.0', ServerVersions.latest])
  @apiVersions([1])
  async createIndexes(
    keyPatterns: Document[],
    options: CreateIndexesOptions = {},
    commitQuorum?: number | string
  ): Promise<string[]> {
    const specs = keyPatterns.map((pattern) => ({
      ...options,
      key: pattern,
    }));
    this._emitCollectionApiCall('createIndexes', { specs });
    return this._createIndexes(keyPatterns, options, commitQuorum);
  }

  /**
   * Create index for a collection
   *
   * @param {Document} keys - An document that contains
   *  the field and value pairs where the field is the index key and the
   *  value describes the type of index for that field.
   * @param {Document} options - createIndexes options (
   *  name, background, sparse ...)
   *
   * @return {Promise}
   */
  @returnsPromise
  @apiVersions([1])
  async createIndex(
    keys: Document,
    options: CreateIndexesOptions = {},
    commitQuorum?: number | string
  ): Promise<string> {
    assertArgsDefinedType([keys], [true], 'Collection.createIndex');
    if (typeof options !== 'object' || Array.isArray(options)) {
      throw new MongoshInvalidInputError(
        'The "options" argument must be an object.',
        CommonErrors.InvalidArgument
      );
    }
    this._emitCollectionApiCall('createIndex', { keys, options });
    const names = await this._createIndexes([keys], options, commitQuorum);
    if (!Array.isArray(names) || names.length !== 1) {
      throw new MongoshInternalError(
        `Expected createIndexes() to return array of length 1, saw ${names.toString()}`
      );
    }
    return names[0];
  }

  /**
   * Create index for a collection (alias for createIndex)
   *
   * @param {Document} keys - An document that contains
   *  the field and value pairs where the field is the index key and the
   *  value describes the type of index for that field.
   * @param {Document} options - createIndexes options (
   *  name, background, sparse ...)
   *
   * @return {Promise}
   */
  @returnsPromise
  @apiVersions([1])
  async ensureIndex(
    keys: Document,
    options: CreateIndexesOptions = {},
    commitQuorum?: number | string
  ): Promise<Document> {
    this._emitCollectionApiCall('ensureIndex', { keys, options });
    return await this._createIndexes([keys], options, commitQuorum);
  }

  /**
   * Returns an array that holds a list of documents that identify and
   * describe the existing indexes on the collection.
   *
   * @return {Promise}
   */
  @returnsPromise
  @serverVersions(['3.2.0', ServerVersions.latest])
  @apiVersions([1])
  async getIndexes(): Promise<Document[]> {
    this._emitCollectionApiCall('getIndexes');
    return await this._mongo._serviceProvider.getIndexes(
      this._database._name,
      this._name,
      await this._database._baseOptions()
    );
  }

  /**
   * Returns an array that holds a list of documents that identify and
   * describe the existing indexes on the collection. (alias for getIndexes)
   *
   * @return {Promise}
   */
  @returnsPromise
  @serverVersions(['3.2.0', ServerVersions.latest])
  @apiVersions([1])
  async getIndexSpecs(): Promise<Document[]> {
    this._emitCollectionApiCall('getIndexSpecs');
    return await this._mongo._serviceProvider.getIndexes(
      this._database._name,
      this._name,
      await this._database._baseOptions()
    );
  }

  /**
   * Returns an array that holds a list of documents that identify and
   * describe the existing indexes on the collection. (alias for getIndexes)
   *
   * @return {Promise}
   */
  @returnsPromise
  @apiVersions([1])
  async getIndices(): Promise<Document[]> {
    this._emitCollectionApiCall('getIndices');
    return await this._mongo._serviceProvider.getIndexes(
      this._database._name,
      this._name,
      await this._database._baseOptions()
    );
  }

  /**
   * Returns an array of key patterns for the indexes defined on the collection.
   *
   * @return {Promise}
   */
  @returnsPromise
  @serverVersions(['3.2.0', ServerVersions.latest])
  @apiVersions([1])
  async getIndexKeys(): Promise<Document[]> {
    this._emitCollectionApiCall('getIndexKeys');
    const indexes = await this._mongo._serviceProvider.getIndexes(
      this._database._name,
      this._name,
      await this._database._baseOptions()
    );
    return indexes.map((i) => i.key);
  }

  /**
   * Drops the specified index or indexes (except the index on the _id field)
   * from a collection.
   *
   * @param {string|string[]|Object|Object[]} indexes the indexes to be removed.
   * @return {Promise}
   */
  @returnsPromise
  @apiVersions([1])
  async dropIndexes(
    indexes: string | string[] | Document | Document[] = '*'
  ): Promise<Document> {
    this._emitCollectionApiCall('dropIndexes', { indexes });
    try {
      return await this._database._runCommand({
        dropIndexes: this._name,
        index: indexes,
      });
    } catch (error: any) {
      // If indexes is an array and we're failing because of that, we fall back to
      // trying to drop all the indexes individually because that's what's supported
      // on mongod 4.0. In the java-shell, error properties are unavailable,
      // so we are a bit more generous there in terms of situation in which we retry.
      if (
        (error?.codeName === 'IndexNotFound' ||
          error?.codeName === undefined) &&
        (error?.errmsg === 'invalid index name spec' ||
          error?.errmsg === undefined) &&
        Array.isArray(indexes) &&
        indexes.length > 0 &&
        /^4\.0\./.exec(await this._database.version())
      ) {
        const all = await Promise.all(
          (indexes as string[]).map(
            async (index) => await this.dropIndexes(index)
          )
        );
        const errored = all.find((result) => !result.ok);
        if (errored) return errored;
        // Return the entry with the highest nIndexesWas value.
        return all.sort((a, b) => b.nIndexesWas - a.nIndexesWas)[0];
      }

      throw error;
    }
  }

  /**
   * Drops the specified index from a collection.
   *
   * @param {string|Object} index the index to be removed.
   * @return {Promise}
   */
  @returnsPromise
  @apiVersions([1])
  async dropIndex(index: string | Document): Promise<Document> {
    assertArgsDefinedType([index], [true], 'Collection.dropIndex');
    this._emitCollectionApiCall('dropIndex', { index });
    if (index === '*') {
      throw new MongoshInvalidInputError(
        "To drop indexes in the collection using '*', use db.collection.dropIndexes().",
        CommonErrors.InvalidArgument
      );
    }

    if (Array.isArray(index)) {
      throw new MongoshInvalidInputError(
        'The index to drop must be either the index name or the index specification document.',
        CommonErrors.InvalidArgument
      );
    }
    return this.dropIndexes(index);
  }

  async _getSingleStorageStatValue(key: string): Promise<number> {
    const cursor = await this.aggregate([
      { $collStats: { storageStats: {} } },
      { $group: { _id: null, value: { $sum: `$storageStats.${key}` } } },
    ]);
    const [{ value }] = await cursor.toArray();
    return value;
  }

  /**
   * Returns the total size of all indexes for the collection.
   *
   * @return {Promise}
   */
  @returnsPromise
  @apiVersions([])
  async totalIndexSize(...args: any[]): Promise<number> {
    this._emitCollectionApiCall('totalIndexSize');
    if (args.length) {
      throw new MongoshInvalidInputError(
        '"totalIndexSize" takes no argument. Use db.collection.stats to get detailed information.',
        CommonErrors.InvalidArgument
      );
    }

    return this._getSingleStorageStatValue('totalIndexSize');
  }

  /**
   * Drops and recreate indexes for a collection.
   *
   * @return {Promise}
   */
  @returnsPromise
  @deprecated
  @topologies([Topologies.Standalone])
  @apiVersions([])
  async reIndex(): Promise<Document> {
    this._emitCollectionApiCall('reIndex');
    return await this._database._runCommand({
      reIndex: this._name,
    });
  }

  /**
   * Returns the collection database.
   *
   * @return {DatabaseWithSchema}
   */
  @returnType('DatabaseWithSchema')
  getDB(): DatabaseWithSchema<M, D> {
    this._emitCollectionApiCall('getDB');
    return this._database;
  }

  /**
   * Returns the collection mongo
   *
   * @return {Mongo}
   */
  @returnType('Mongo')
  getMongo(): Mongo<M> {
    this._emitCollectionApiCall('getMongo');
    return this._mongo;
  }

  /**
   * Get the collection dataSize.
   *
   * @return {Promise} returns Promise
   */
  @returnsPromise
  @apiVersions([])
  async dataSize(): Promise<number> {
    this._emitCollectionApiCall('dataSize');

    return this._getSingleStorageStatValue('size');
  }

  /**
   * Get the collection storageSize.
   *
   * @return {Promise} returns Promise
   */
  @returnsPromise
  @apiVersions([])
  async storageSize(): Promise<number> {
    this._emitCollectionApiCall('storageSize');

    return this._getSingleStorageStatValue('storageSize');
  }

  /**
   * Get the collection totalSize.
   *
   * @return {Promise} returns Promise
   */
  @returnsPromise
  @apiVersions([])
  async totalSize(): Promise<number> {
    this._emitCollectionApiCall('totalSize');

    return this._getSingleStorageStatValue('totalSize');
  }

  /**
   * Drop a collection.
   *
   * @return {Promise} returns Promise
   */
  @returnsPromise
  @apiVersions([1])
  async drop(options: DropCollectionOptions = {}): Promise<boolean> {
    this._emitCollectionApiCall('drop');

    let encryptedFieldsOptions = {};

    const encryptedFieldsMap = this._mongo._fleOptions?.encryptedFieldsMap;
    const encryptedFields: Document | undefined =
      encryptedFieldsMap?.[`${this._database._name}.${this._name}`];

    if (!encryptedFields && !options.encryptedFields) {
      try {
        const collectionInfos =
          await this._mongo._serviceProvider.listCollections(
            this._database._name,
            {
              name: this._name,
            },
            await this._database._baseOptions()
          );

        const encryptedFields: Document | undefined =
          collectionInfos?.[0]?.options?.encryptedFields;

        if (encryptedFields) {
          encryptedFieldsOptions = { encryptedFields };
        }
      } catch (error) {
        // pass, ignore all error messages
      }
    }

    try {
      return await this._mongo._serviceProvider.dropCollection(
        this._database._name,
        this._name,
        {
          ...(await this._database._baseOptions()),
          ...options,
          ...encryptedFieldsOptions,
        }
      );
    } catch (error: any) {
      if (error?.codeName === 'NamespaceNotFound') {
        this._mongo._instanceState.messageBus.emit('mongosh:warn', {
          method: 'drop',
          class: 'Collection',
          message: `Namespace not found: ${this._name}`,
        });
        return false;
      }
      throw error;
    }
  }

  /**
   * Collection exists.
   *
   * @return {Promise} returns Promise
   */
  @returnsPromise
  @apiVersions([1])
  async exists(): Promise<Document> {
    this._emitCollectionApiCall('exists');
    const collectionInfos = await this._mongo._serviceProvider.listCollections(
      this._database._name,
      {
        name: this._name,
      },
      await this._database._baseOptions()
    );

    return collectionInfos[0] || null;
  }

  getFullName(): string {
    this._emitCollectionApiCall('getFullName');
    return `${this._database._name}.${this._name}`;
  }

  getName(): N {
    this._emitCollectionApiCall('getName');
    return this._name;
  }

  @returnsPromise
  @apiVersions([1])
  async runCommand(
    commandName: string | Document,
    options?: RunCommandOptions
  ): Promise<Document> {
    assertArgsDefinedType(
      [commandName],
      [['string', 'object']],
      'Collection.runCommand'
    );
    if (options) {
      if (typeof commandName !== 'string') {
        throw new MongoshInvalidInputError(
          'Collection.runCommand takes a command string as its first arugment',
          CommonErrors.InvalidArgument
        );
      } else if (commandName in options) {
        throw new MongoshInvalidInputError(
          'The "commandName" argument cannot be passed as an option to "runCommand".',
          CommonErrors.InvalidArgument
        );
      }
    }

    const hiddenCommands = new RegExp(HIDDEN_COMMANDS);
    if (typeof commandName === 'string' && !hiddenCommands.test(commandName)) {
      this._emitCollectionApiCall('runCommand', { commandName });
    }
    const cmd =
      typeof commandName === 'string'
        ? {
            [commandName]: this._name,
            ...options,
          }
        : commandName;
    return await this._database._runCommand(cmd);
  }

  @returnType('Explainable')
  @apiVersions([1])
  explain(verbosity: ExplainVerbosityLike = 'queryPlanner'): Explainable {
    verbosity = validateExplainableVerbosity(verbosity);
    this._emitCollectionApiCall('explain', { verbosity });
    return new Explainable(this._mongo, this, verbosity);
  }

  /**
   * Running the $collStats stage on sharded timeseries clusters
   * fails on some versions of MongoDB. SERVER-72686
   * This function provides the deprecated fallback in those instances.
   */
  async _getLegacyCollStats(scale: number) {
    const result = await this._database._runReadCommand({
      collStats: this._name,
      scale: scale || 1,
    });

    if (!result) {
      throw new MongoshRuntimeError(
        `Error running collStats command on ${this.getFullName()}`,
        CommonErrors.CommandFailed
      );
    }

    return result;
  }

  /**
   * Build a single scaled collection stats result document from the
   * potentially multiple documents returned from the `$collStats` aggregation
   * result. We run the aggregation stage with scale 1 and scale it here
   * in order to accurately scale the summation of stats across various shards.
   */
  async _aggregateAndScaleCollStats(collStats: Document[], scale: number) {
    const result: Document = {
      ok: 1,
    };

    const shardStats: {
      [shardId: string]: Document;
    } = {};
    const counts: {
      [fieldName: string]: number;
    } = {};
    const indexSizes: {
      [indexName: string]: number;
    } = {};
    const clusterTimeseriesStats: {
      [statName: string]: number;
    } = {};

    let maxSize = 0;
    let unscaledCollSize = 0;

    let nindexes = 0;
    let timeseriesBucketsNs: string | undefined;
    let timeseriesTotalBucketSize = 0;

    for (const shardResult of collStats) {
      const shardStorageStats = shardResult.storageStats;

      // We don't know the order that we will encounter the count and size, so we save them
      // until we've iterated through all the fields before updating unscaledCollSize
      // Timeseries bucket collection does not provide 'count' or 'avgObjSize'.
      const countField = shardStorageStats.count;
      const shardObjCount = typeof countField !== 'undefined' ? countField : 0;

      for (const fieldName of Object.keys(shardStorageStats)) {
        if (
          ['ns', 'ok', 'lastExtentSize', 'paddingFactor'].includes(fieldName)
        ) {
          continue;
        }
        if (
          [
            'userFlags',
            'capped',
            'max',
            'paddingFactorNote',
            'indexDetails',
            'wiredTiger',
          ].includes(fieldName)
        ) {
          // Fields that are copied from the first shard only, because they need to
          // match across shards.
          result[fieldName] ??= shardStorageStats[fieldName];
        } else if (fieldName === 'timeseries') {
          const shardTimeseriesStats: Document = shardStorageStats[fieldName];
          for (const [timeseriesStatName, timeseriesStat] of Object.entries(
            shardTimeseriesStats
          )) {
            if (typeof timeseriesStat === 'string') {
              if (!timeseriesBucketsNs) {
                timeseriesBucketsNs = timeseriesStat;
              }
            } else if (timeseriesStatName === 'avgBucketSize') {
              timeseriesTotalBucketSize +=
                coerceToJSNumber(shardTimeseriesStats.bucketCount) *
                coerceToJSNumber(timeseriesStat);
            } else {
              // Simple summation for other types of stats.
              if (clusterTimeseriesStats[timeseriesStatName] === undefined) {
                clusterTimeseriesStats[timeseriesStatName] = 0;
              }
              clusterTimeseriesStats[timeseriesStatName] +=
                coerceToJSNumber(timeseriesStat);
            }
          }
        } else if (
          // NOTE: `numOrphanDocs` is new in 6.0. `totalSize` is new in 4.4.
          [
            'count',
            'size',
            'storageSize',
            'totalIndexSize',
            'totalSize',
            'numOrphanDocs',
          ].includes(fieldName)
        ) {
          if (counts[fieldName] === undefined) {
            counts[fieldName] = 0;
          }
          counts[fieldName] += coerceToJSNumber(shardStorageStats[fieldName]);
        } else if (fieldName === 'avgObjSize') {
          const shardAvgObjSize = coerceToJSNumber(
            shardStorageStats[fieldName]
          );
          unscaledCollSize += shardAvgObjSize * shardObjCount;
        } else if (fieldName === 'maxSize') {
          const shardMaxSize = coerceToJSNumber(shardStorageStats[fieldName]);
          maxSize = Math.max(maxSize, shardMaxSize);
        } else if (fieldName === 'indexSizes') {
          for (const indexName of Object.keys(shardStorageStats[fieldName])) {
            if (indexSizes[indexName] === undefined) {
              indexSizes[indexName] = 0;
            }
            indexSizes[indexName] += coerceToJSNumber(
              shardStorageStats[fieldName][indexName]
            );
          }
        } else if (fieldName === 'nindexes') {
          const shardIndexes = shardStorageStats[fieldName];

          if (nindexes === 0) {
            nindexes = shardIndexes;
          } else if (shardIndexes > nindexes) {
            // This hopefully means we're building an index.
            nindexes = shardIndexes;
          }
        }
      }

      if (shardResult.shard) {
        shardStats[shardResult.shard] = scaleIndividualShardStatistics(
          shardStorageStats,
          scale
        );
      }
    }

    const ns = `${this._database._name}.${this._name}`;
    const config = this._mongo.getDB('config' as StringKey<M>);
    if (collStats[0].shard) {
      result.shards = shardStats;
    }

    try {
      result.sharded = !!(await config.getCollection('collections').findOne({
        _id: timeseriesBucketsNs ?? ns,
        ...onlyShardedCollectionsInConfigFilter,
      }));
    } catch (e) {
      // A user might not have permissions to check the config. In which
      // case we default to the potentially inaccurate check for multiple
      // shard response documents to determine if the collection is sharded.
      result.sharded = collStats.length > 1;
    }

    for (const [countField, count] of Object.entries(counts)) {
      if (
        ['size', 'storageSize', 'totalIndexSize', 'totalSize'].includes(
          countField
        )
      ) {
        result[countField] = count / scale;
      } else {
        result[countField] = count;
      }
    }
    if (timeseriesBucketsNs && Object.keys(clusterTimeseriesStats).length > 0) {
      result.timeseries = {
        ...clusterTimeseriesStats,
        // Average across all the shards.
        avgBucketSize: clusterTimeseriesStats.bucketCount
          ? timeseriesTotalBucketSize / clusterTimeseriesStats.bucketCount
          : 0,
        bucketsNs: timeseriesBucketsNs,
      };
    }
    result.indexSizes = {};
    for (const [indexName, indexSize] of Object.entries(indexSizes)) {
      // Scale the index sizes with the scale option passed by the user.
      result.indexSizes[indexName] = indexSize / scale;
    }
    // The unscaled avgObjSize for each shard is used to get the unscaledCollSize because the
    // raw size returned by the shard is affected by the command's scale parameter
    if (counts.count > 0) {
      result.avgObjSize = unscaledCollSize / counts.count;
    } else {
      result.avgObjSize = 0;
    }
    if (result.capped) {
      result.maxSize = maxSize / scale;
    }
    result.ns = ns;
    result.nindexes = nindexes;
    if (collStats[0].storageStats.scaleFactor !== undefined) {
      // The `scaleFactor` property started being returned in 4.2.
      result.scaleFactor = scale;
    }
    result.ok = 1;

    return result;
  }

  async _getAggregatedCollStats(scale: number) {
    try {
      const collStats = await (
        await this.aggregate([
          {
            $collStats: {
              storageStats: {
                // We pass scale `1` and we scale the response ourselves.
                // We do this because we create one document response based on the multiple
                // documents the `$collStats` stage returns for sharded collections.
                scale: 1,
              },
            },
          },
        ])
      ).toArray();

      if (!collStats || collStats[0] === undefined) {
        throw new MongoshRuntimeError(
          `Error running $collStats aggregation stage on ${this.getFullName()}`,
          CommonErrors.CommandFailed
        );
      }

      return await this._aggregateAndScaleCollStats(collStats, scale);
    } catch (e: any) {
      if (
        e?.codeName === 'StaleConfig' ||
        e?.code === 13388 ||
        e?.codeName === 'FailedToParse'
      ) {
        // Fallback to the deprecated way of fetching that folks can still
        // fetch the stats of sharded timeseries collections. SERVER-72686
        // and atlas data federation (MONGOSH-1425)
        try {
          return await this._getLegacyCollStats(scale);
        } catch (legacyCollStatsError) {
          // Surface the original error when the fallback.
          throw e;
        }
      }
      throw e;
    }
  }

  @returnsPromise
  @apiVersions([])
  async stats(originalOptions: Document | number = {}): Promise<Document> {
    const options: Document =
      typeof originalOptions === 'number'
        ? { scale: originalOptions }
        : originalOptions;

    if (options.indexDetailsKey && options.indexDetailsName) {
      throw new MongoshInvalidInputError(
        'Cannot filter indexDetails on both indexDetailsKey and indexDetailsName',
        CommonErrors.InvalidArgument
      );
    }
    if (
      options.indexDetailsKey &&
      typeof options.indexDetailsKey !== 'object'
    ) {
      throw new MongoshInvalidInputError(
        `Expected options.indexDetailsKey to be a document, got ${typeof options.indexDetailsKey}`,
        CommonErrors.InvalidArgument
      );
    }
    if (
      options.indexDetailsName &&
      typeof options.indexDetailsName !== 'string'
    ) {
      throw new MongoshInvalidInputError(
        `Expected options.indexDetailsName to be a string, got ${typeof options.indexDetailsName}`,
        CommonErrors.InvalidArgument
      );
    }
    options.scale = options.scale || 1;
    options.indexDetails = options.indexDetails || false;

    this._emitCollectionApiCall('stats', { options });

    const result = await this._getAggregatedCollStats(options.scale);

    let filterIndexName = options.indexDetailsName;
    if (!filterIndexName && options.indexDetailsKey) {
      const indexes = await this._mongo._serviceProvider.getIndexes(
        this._database._name,
        this._name,
        await this._database._baseOptions()
      );
      indexes.forEach((spec) => {
        if (
          JSON.stringify(spec.key) === JSON.stringify(options.indexDetailsKey)
        ) {
          filterIndexName = spec.name;
        }
      });
    }

    /**
     * Remove indexDetails if options.indexDetails is true. From the old shell code.
     */
    const updateStats = (stats: Document): void => {
      if (!stats.indexDetails) {
        return;
      }
      if (!options.indexDetails) {
        delete stats.indexDetails;
        return;
      }
      if (!filterIndexName) {
        return;
      }
      for (const key of Object.keys(stats.indexDetails)) {
        if (key === filterIndexName) {
          continue;
        }
        delete stats.indexDetails[key];
      }
    };
    updateStats(result);

    for (const shardName of Object.keys(result.shards ?? {})) {
      updateStats(result.shards[shardName]);
    }
    return result;
  }

  @returnsPromise
  @apiVersions([])
  async latencyStats(options: Document = {}): Promise<Document[]> {
    this._emitCollectionApiCall('latencyStats', { options });
    return await (
      await this.aggregate([{ $collStats: { latencyStats: options } }])
    ).toArray();
  }

  @returnsPromise
  @returnType('Bulk')
  @apiVersions([1])
  async initializeOrderedBulkOp(): Promise<Bulk> {
    this._emitCollectionApiCall('initializeOrderedBulkOp');
    const innerBulk = await this._mongo._serviceProvider.initializeBulkOp(
      this._database._name,
      this._name,
      true,
      await this._database._baseOptions()
    );
    return new Bulk(this, innerBulk, true);
  }

  @returnsPromise
  @returnType('Bulk')
  @apiVersions([1])
  async initializeUnorderedBulkOp(): Promise<Bulk> {
    this._emitCollectionApiCall('initializeUnorderedBulkOp');
    const innerBulk = await this._mongo._serviceProvider.initializeBulkOp(
      this._database._name,
      this._name,
      false,
      await this._database._baseOptions()
    );
    return new Bulk(this, innerBulk);
  }

  @returnType('PlanCache')
  @apiVersions([])
  getPlanCache(): PlanCache {
    this._emitCollectionApiCall('getPlanCache');
    return new PlanCache(this);
  }

  @returnsPromise
  @deprecated
  @serverVersions([ServerVersions.earliest, '4.9.0'])
  @apiVersions([])
  // eslint-disable-next-line @typescript-eslint/ban-types
  async mapReduce(
    map: Function | string,
    reduce: Function | string,
    optionsOrOutString: MapReduceShellOptions
  ): Promise<Document> {
    await this._instanceState.printDeprecationWarning(
      'Collection.mapReduce() is deprecated. Use an aggregation instead.\nSee https://mongodb.com/docs/manual/core/map-reduce for details.'
    );
    assertArgsDefinedType(
      [map, reduce, optionsOrOutString],
      [true, true, true],
      'Collection.mapReduce'
    );
    this._emitCollectionApiCall('mapReduce', {
      map,
      reduce,
      out: optionsOrOutString,
    });

    let cmd = {
      mapReduce: this._name,
      map: map,
      reduce: reduce,
      ...processMapReduceOptions(optionsOrOutString),
    } as Document;

    if (cmd.explain) {
      const verbosity = cmd.explain;
      delete cmd.explain;
      cmd = {
        explain: cmd,
        verbosity,
      };
    }

    return await this._database._runCommand(cmd);
  }

  @returnsPromise
  @apiVersions([])
  async validate(options: boolean | Document = false): Promise<Document> {
    this._emitCollectionApiCall('validate', { options });
    if (typeof options === 'boolean') {
      options = { full: options };
    }
    return await this._database._runReadCommand({
      validate: this._name,
      ...options,
    });
  }

  @returnsPromise
  @topologies([Topologies.Sharded])
  @apiVersions([])
  async getShardVersion(): Promise<Document> {
    this._emitCollectionApiCall('getShardVersion', {});
    return await this._database._runAdminReadCommand({
      getShardVersion: `${this._database._name}.${this._name}`,
    });
  }

  /**
   * Helper for getting collection info for sharded collections.
   * @throws If the collection is not sharded.
   * @returns collection info based on given collStats.
   */
  async _getShardedCollectionInfo(
    config: DatabaseWithSchema<M, D>,
    collStats: Document[]
  ): Promise<Document> {
    const ns = `${this._database._name}.${this._name}`;
    const existingConfigCollectionsInfo = await config
      .getCollection('collections')
      .findOne({
        _id: ns,
        ...onlyShardedCollectionsInConfigFilter,
      });

    if (existingConfigCollectionsInfo !== null) {
      return existingConfigCollectionsInfo;
    }

    // If the collection info is not found, check if it is timeseries and use the bucket
    const timeseriesShardStats = collStats.find(
      (extractedShardStats) =>
        typeof extractedShardStats.storageStats.timeseries !== 'undefined'
    );

    if (!timeseriesShardStats) {
      throw new MongoshInvalidInputError(
        `Collection ${this._name} is not sharded`,
        ShellApiErrors.NotConnectedToShardedCluster
      );
    }

    const { storageStats } = timeseriesShardStats;

    const timeseries: Document = storageStats.timeseries;
    const timeseriesBucketNs: string = timeseries.bucketsNs;

    const timeseriesCollectionInfo = await config
      .getCollection('collections')
      .findOne({
        _id: timeseriesBucketNs,
        ...onlyShardedCollectionsInConfigFilter,
      });

    if (!timeseriesCollectionInfo) {
      throw new MongoshRuntimeError(
        `Error finding collection information for ${timeseriesBucketNs}`,
        CommonErrors.CommandFailed
      );
    }

    return timeseriesCollectionInfo;
  }

  @returnsPromise
  @topologies([Topologies.Sharded])
  @apiVersions([])
  async getShardDistribution(): Promise<
    CommandResult<GetShardDistributionResult>
  > {
    this._emitCollectionApiCall('getShardDistribution', {});

    const result = {} as Document;
    // TODO: can we get around casting here?
    const config = this._mongo.getDB(
      'config' as StringKey<M>
    ) as DatabaseWithSchema<M, D>;

    const collStats = await (
      await this.aggregate({ $collStats: { storageStats: {} } })
    ).toArray();

    const totals = { numChunks: 0, size: 0, count: 0 };
    const conciseShardsStats: {
      shardId: string;
      host: string;
      size: number;
      count: number;
      numChunks: number;
      avgObjSize: number;
    }[] = [];

    const configCollectionsInfo = await this._getShardedCollectionInfo(
      config,
      collStats
    );

    await Promise.all(
      collStats.map((extractedShardStats) =>
        (async (): Promise<void> => {
          const { shard } = extractedShardStats;
          // If we have an UUID, use that for lookups. If we have only the ns,
          // use that. (On 5.0+ servers, config.chunk has uses the UUID, before
          // that it had the ns).
          const countChunksQuery = {
            ...buildConfigChunksCollectionMatch(configCollectionsInfo),
            shard,
          };
          const [host, numChunks] = await Promise.all([
            config
              .getCollection('shards')
              .findOne({ _id: extractedShardStats.shard }),
            config.getCollection('chunks').countDocuments(countChunksQuery),
          ]);

          // Since 6.0, there can be orphan documents indicated by numOrphanDocs.
          // These orphan documents need to be accounted for in the size calculation.
          const orphanDocumentsSize =
            (extractedShardStats.storageStats.numOrphanDocs ?? 0) *
            (extractedShardStats.storageStats.avgObjSize ?? 0);
          const ownedSize =
            extractedShardStats.storageStats.size - orphanDocumentsSize;

          const shardStats = {
            shardId: shard,
            host: host !== null ? host.host : null,
            size: ownedSize,
            count: extractedShardStats.storageStats.count,
            numChunks: numChunks,
            avgObjSize: extractedShardStats.storageStats.avgObjSize,
          };

          // In sharded timeseries collections we do not have a count
          // so we intentionally pass NaN as a result to the client.
          const shardStatsCount: number = shardStats.count ?? NaN;

          const estimatedChunkDataPerChunk =
            shardStats.numChunks === 0
              ? 0
              : shardStats.size / shardStats.numChunks;
          const estimatedDocsPerChunk =
            shardStats.numChunks === 0
              ? 0
              : Math.floor(shardStatsCount / shardStats.numChunks);

          result[`Shard ${shardStats.shardId} at ${shardStats.host}`] = {
            data: dataFormat(coerceToJSNumber(shardStats.size)),
            docs: shardStatsCount,
            chunks: shardStats.numChunks,
            'estimated data per chunk': dataFormat(estimatedChunkDataPerChunk),
            'estimated docs per chunk': estimatedDocsPerChunk,
          };

          totals.size += coerceToJSNumber(ownedSize);
          totals.count += coerceToJSNumber(shardStatsCount);
          totals.numChunks += coerceToJSNumber(shardStats.numChunks);

          conciseShardsStats.push(shardStats);
        })()
      )
    );

    const totalValue = {
      data: dataFormat(totals.size),
      docs: totals.count,
      chunks: totals.numChunks,
    } as GetShardDistributionResult['Totals'];

    for (const shardStats of conciseShardsStats) {
      const estDataPercent =
        totals.size === 0
          ? 0
          : Math.floor((shardStats.size / totals.size) * 10000) / 100;
      const estDocPercent =
        totals.count === 0
          ? 0
          : Math.floor((shardStats.count / totals.count) * 10000) / 100;

      totalValue[`Shard ${shardStats.shardId}`] = [
        `${estDataPercent} % data`,
        `${estDocPercent} % docs in cluster`,
        `${dataFormat(shardStats.avgObjSize)} avg obj size on shard`,
      ];
    }
    result.Totals = totalValue;

    return new CommandResult<GetShardDistributionResult>(
      'StatsResult',
      result as GetShardDistributionResult
    );
  }

  @serverVersions(['3.1.0', ServerVersions.latest])
  @topologies([Topologies.ReplSet, Topologies.Sharded])
  @apiVersions([1])
  @returnsPromise
  async watch(
    pipeline: Document[] | ChangeStreamOptions = [],
    options: ChangeStreamOptions = {}
  ): Promise<ChangeStreamCursor> {
    if (!Array.isArray(pipeline)) {
      options = pipeline;
      pipeline = [];
    }
    this._emitCollectionApiCall('watch', { pipeline, options });
    const cursor = new ChangeStreamCursor(
      this._mongo._serviceProvider.watch(
        pipeline,
        {
          ...(await this._database._baseOptions()),
          ...options,
        },
        {},
        this._database._name,
        this._name
      ),
      this._name,
      this._mongo
    );
    // Cursors are not actually initialized in the driver until we try to read
    // from them. However, in the legacy shell as well as here the expectation
    // is that the change stream cursor will include all events starting from
    // the .watch() call itself. Therefore, we call .tryNext() here (and in the
    // .watch() methods of the Database and Mongo classes).
    // This should be fine, even though it means potentially ignoring one item
    // from the cursor, because:
    // - No events caused by this shell/connection can be missed, because it
    //   immediately follows the service provider .watch() call
    // - Events from another connection might be missed, but that is fine,
    //   because an event that is observed to occur after the service provider
    //   .watch() call and before the .tryNext() call could also have been
    //   observed before the .watch() call, i.e. there is a race condition
    //   here either way and we can use that to our advantage.
    // We only do this for change streams that do not specify from a specified
    // point in time, i.e. start from the current time.
    if (
      !options.resumeAfter &&
      !options.startAfter &&
      !options.startAtOperationTime
    ) {
      await cursor.tryNext();
    }
    this._mongo._instanceState.currentCursor = cursor;
    return cursor;
  }

  @serverVersions(['4.4.0', ServerVersions.latest])
  @returnsPromise
  @apiVersions([1])
  async hideIndex(index: string | Document): Promise<Document> {
    this._emitCollectionApiCall('hideIndex');
    return setHideIndex(this, index, true);
  }

  @serverVersions(['4.4.0', ServerVersions.latest])
  @returnsPromise
  @apiVersions([1])
  async unhideIndex(index: string | Document): Promise<Document> {
    this._emitCollectionApiCall('unhideIndex');
    return setHideIndex(this, index, false);
  }

  @serverVersions(['7.0.0', ServerVersions.latest])
  @returnsPromise
  @topologies([Topologies.ReplSet, Topologies.Sharded])
  @apiVersions([])
  async analyzeShardKey(
    key: Document,
    options: Document = {}
  ): Promise<Document> {
    assertArgsDefinedType([key], [true], 'Collection.analyzeShardKey');
    this._emitCollectionApiCall('analyzeShardKey', { key });
    return await this._database._runAdminReadCommand({
      analyzeShardKey: this.getFullName(),
      key,
      ...options,
    });
  }

  @serverVersions(['7.0.0', ServerVersions.latest])
  @returnsPromise
  @topologies([Topologies.ReplSet, Topologies.Sharded])
  @apiVersions([])
  async configureQueryAnalyzer(options: Document): Promise<Document> {
    this._emitCollectionApiCall('configureQueryAnalyzer', options);
    return await this._database._runAdminCommand({
      configureQueryAnalyzer: this.getFullName(),
      ...options,
    });
  }

  @serverVersions(['7.0.0', ServerVersions.latest])
  @topologies([Topologies.Sharded])
  @returnsPromise
  async checkMetadataConsistency(
    options: CheckMetadataConsistencyOptions = {}
  ): Promise<RunCommandCursor> {
    this._emitCollectionApiCall('checkMetadataConsistency', { options });

    return this._database._runCursorCommand({
      checkMetadataConsistency: this._name,
    });
  }

  @serverVersions(['6.0.0', ServerVersions.latest])
  @returnsPromise
  @apiVersions([])
  // TODO(MONGOSH-1471): use ListSearchIndexesOptions once available
  async getSearchIndexes(
    indexName?: string | Document,
    options?: Document
  ): Promise<Document[]> {
    if (typeof indexName === 'object' && indexName !== null) {
      options = indexName;
      indexName = undefined;
    }

    this._emitCollectionApiCall('getSearchIndexes', { options });
    return await this._mongo._serviceProvider.getSearchIndexes(
      this._database._name,
      this._name,
      indexName,
      { ...(await this._database._baseOptions()), ...options }
    );
  }

  async createSearchIndex(
    name: string,
    definition: SearchIndexDefinition
  ): Promise<string>;
  async createSearchIndex(
    name: string,
    type: 'search' | 'vectorSearch',
    definition: SearchIndexDefinition
  ): Promise<string>;
  async createSearchIndex(
    definition: SearchIndexDefinition,
    type?: 'search' | 'vectorSearch'
  ): Promise<string>;
  async createSearchIndex(description: SearchIndexDescription): Promise<string>;
  @serverVersions(['6.0.0', ServerVersions.latest])
  @returnsPromise
  @apiVersions([])
  async createSearchIndex(
    nameOrOptions?: string | SearchIndexDescription | SearchIndexDefinition,
    typeOrOptions?: 'search' | 'vectorSearch' | SearchIndexDefinition,
    definition?: SearchIndexDefinition
  ): Promise<string> {
    let indexDescription: SearchIndexDescription;

    if (
      typeof nameOrOptions === 'object' &&
      nameOrOptions !== null &&
      nameOrOptions.definition
    ) {
      indexDescription = nameOrOptions as SearchIndexDescription;
    } else {
      let indexName: string | undefined;
      let indexType: 'search' | 'vectorSearch' | undefined;

      if (typeof typeOrOptions === 'object' && typeOrOptions !== null) {
        definition = typeOrOptions;
      } else {
        indexType = typeOrOptions;
      }

      if (typeof nameOrOptions === 'object' && nameOrOptions !== null) {
        definition = nameOrOptions;
      } else {
        indexName = nameOrOptions;
      }

      indexDescription = {
        name: indexName ?? 'default',
        // Omitting type when it is 'search' for compat with older servers
        ...(indexType &&
          indexType !== 'search' && {
            type: indexType as 'search' | 'vectorSearch',
          }),
        definition: { ...definition },
      };
    }

    this._emitCollectionApiCall('createSearchIndex', indexDescription);
    const results = await this._mongo._serviceProvider.createSearchIndexes(
      this._database._name,
      this._name,
      [indexDescription]
    );
    return results[0];
  }

  @serverVersions(['6.0.0', ServerVersions.latest])
  @returnsPromise
  @apiVersions([])
  async createSearchIndexes(
    specs: SearchIndexDescription[]
  ): Promise<string[]> {
    this._emitCollectionApiCall('createSearchIndexes', { specs });
    return await this._mongo._serviceProvider.createSearchIndexes(
      this._database._name,
      this._name,
      // Omitting type when it is 'search' for compat with older servers
      specs.map(({ type, ...spec }) => ({
        ...spec,
        ...(type && type !== 'search' && { type }),
      }))
    );
  }

  @serverVersions(['6.0.0', ServerVersions.latest])
  @returnsPromise
  @apiVersions([])
  async dropSearchIndex(indexName: string): Promise<void> {
    this._emitCollectionApiCall('dropSearchIndex', { indexName });
    return await this._mongo._serviceProvider.dropSearchIndex(
      this._database._name,
      this._name,
      indexName
    );
  }

  @serverVersions(['6.0.0', ServerVersions.latest])
  @returnsPromise
  @apiVersions([])
  // TODO(MONGOSH-1471): use SearchIndexDescription once available
  async updateSearchIndex(
    indexName: string,
    definition: Document
  ): Promise<void> {
    this._emitCollectionApiCall('updateSearchIndex', { indexName, definition });
    return await this._mongo._serviceProvider.updateSearchIndex(
      this._database._name,
      this._name,
      indexName,
      definition
    );
  }
}

export type GetShardDistributionResult = {
  Totals: {
    data: string;
    docs: number;
    chunks: number;
  } & {
    [individualShardDistribution: `Shard ${string}`]: [
      `${number} % data`,
      `${number} % docs in cluster`,
      `${string} avg obj size on shard`
    ];
  };
  [individualShardResult: `Shard ${string} at ${string}`]: {
    data: string;
    docs: number;
    chunks: number;
    'estimated data per chunk': string;
    'estimated docs per chunk': number;
  };
};
