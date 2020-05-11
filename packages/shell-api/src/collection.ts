import Mongo from './mongo';
import {
  shellApiClassDefault,
  hasAsyncChild,
  ShellApiClass,
  returnsPromise,
  returnType,
  serverVersions
} from './decorators';
import { ServerVersions } from './enums';
import { DatabaseOptions, Document } from '@mongosh/service-provider-core';
import {
  AggregationCursor,
  Cursor,
  Database,
  Explainable,
  BulkWriteResult,
  DeleteResult,
  InsertManyResult,
  InsertOneResult,
  UpdateResult
} from './index';
import { MongoshInvalidInputError } from '@mongosh/errors';

@shellApiClassDefault
@hasAsyncChild
export default class Collection extends ShellApiClass {
  mongo: Mongo;
  database: any; // to avoid circular ref
  name: string;
  constructor(mongo, database, name) {
    super();
    this.mongo = mongo;
    this.database = database;
    this.name = name;
  }

  toReplString(): any {
    return this.name;
  }

  /**
   * Internal helper for emitting collection API call events.
   *
   * @param methodName
   * @param methodArguments
   * @private
   */
  private _emitCollectionApiCall(methodName: string, methodArguments: Document = {}): void {
    this.mongo.internalState.emitApiCall({
      method: methodName,
      class: 'Collection',
      db: this.database.name,
      coll: this.name,
      arguments: methodArguments
    });
  }

  /**
   * Run an aggregation against the collection. Accepts array pipeline and options object OR stages as individual arguments.
   *
   * @returns {Promise} The promise of aggregation results.
   */
  @returnsPromise
  @returnType('AggregationCursor')
  async aggregate(...args: any[]): Promise<AggregationCursor> {
    let options;
    let pipeline;
    if (args.length === 0 || Array.isArray(args[0])) {
      options = args[1] || {};
      pipeline = args[0] || [];
    } else {
      options = {};
      pipeline = args;
    }
    this._emitCollectionApiCall(
      'aggregate',
      { options, pipeline }
    );
    const {
      providerOptions,
      dbOptions,
      explain
    } = this.mongo.internalState.adaptAggregateOptions(options);

    const providerCursor = this.mongo.serviceProvider.aggregate(
      this.database.name,
      this.name,
      pipeline,
      providerOptions,
      dbOptions
    );
    const cursor = new AggregationCursor(this, providerCursor);

    if (explain) {
      return await cursor.explain('queryPlanner'); // TODO: set default or use optional argument
    }

    this.mongo.internalState.currentCursor = cursor;
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
  async bulkWrite(
    operations: Document,
    options: Document = {}
  ): Promise<BulkWriteResult> {
    this.mongo.internalState.checkUndefinedUpdate(options);
    const dbOptions: DatabaseOptions = {};
    this._emitCollectionApiCall(
      'bulkWrite',
      { options }
    );

    if ('writeConcern' in options) {
      Object.assign(dbOptions, options.writeConcern);
    }

    const result = await this.mongo.serviceProvider.bulkWrite(
      this.database.name,
      this.name,
      operations,
      options,
      dbOptions
    );

    return new BulkWriteResult(
      !!result.result.ok, // acknowledged
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
  @serverVersions([ServerVersions.earliest, '4.0.0'])
  async count(query = {}, options: any = {}): Promise<number> {
    const dbOpts: any = {};
    this._emitCollectionApiCall(
      'count',
      { query, options }
    );

    if ('readConcern' in options) {
      dbOpts.readConcern = options.readConcern;
    }

    return this.mongo.serviceProvider.count(this.database.name, this.name, query, options, dbOpts);
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
  async countDocuments(query, options: any = {}): Promise<number> {
    this._emitCollectionApiCall('countDocuments', { query, options });
    return this.mongo.serviceProvider.countDocuments(this.database.name, this.name, query, options);
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
  async deleteMany(filter, options: any = {}): Promise<DeleteResult> {
    this.mongo.internalState.checkUndefinedUpdate(filter);
    const dbOptions: DatabaseOptions = {};
    this._emitCollectionApiCall('deleteMany', { filter, options });

    if ('writeConcern' in options) {
      Object.assign(dbOptions, options.writeConcern);
    }

    const result = await this.mongo.serviceProvider.deleteMany(
      this.database.name,
      this.name,
      filter,
      options,
      dbOptions
    );

    return new DeleteResult(
      result.result.ok,
      result.deletedCount
    );
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
  async deleteOne(filter, options: any = {}): Promise<DeleteResult> {
    this.mongo.internalState.checkUndefinedUpdate(filter);
    const dbOptions: DatabaseOptions = {};
    this._emitCollectionApiCall('deleteOne', { filter, options });

    if ('writeConcern' in options) {
      Object.assign(dbOptions, options.writeConcern);
    }
    const result = await this.mongo.serviceProvider.deleteOne(
      this.database.name,
      this.name,
      filter,
      options,
      dbOptions
    );

    return new DeleteResult(
      result.result.ok,
      result.deletedCount
    );
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
  @returnsPromise
  async distinct(field, query, options: any = {}): Promise<any> {
    this._emitCollectionApiCall('distinct', { field, query, options });
    return this.mongo.serviceProvider.distinct(this.database.name, this.name, field, query, options);
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
  async estimatedDocumentCount(options = {}): Promise<any> {
    this._emitCollectionApiCall('estimatedDocumentCount', { options });
    return this.mongo.serviceProvider.estimatedDocumentCount(this.database.name, this.name, options,);
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
  find(query?, projection?): Cursor {
    const options: any = {};
    if (projection) {
      options.projection = projection;
    }

    this._emitCollectionApiCall('find', { query, options });
    const cursor = new Cursor(
      this,
      this.mongo.serviceProvider.find(this.database.name, this.name, query, options)
    );

    this.mongo.internalState.currentCursor = cursor;
    return cursor;
  }

  @returnsPromise
  async findAndModify(
    options: {
      query?: Document;
      sort?: Document | Document[];
      remove?: boolean;
      update?: Document | Document[];
      new?: boolean;
      fields?: Document;
      upsert?: boolean;
      bypassDocumentValidation?: boolean;
      writeConcern?: Document;
      collation?: Document;
      arrayFilters?: Document[];
    } = {}
  ): Promise<any> {
    this.mongo.internalState.checkUndefinedUpdate(options.query);
    this._emitCollectionApiCall(
      'findAndModify',
      { options: { ...options, update: !!options.update } }
    );
    const providerOptions = {
      ...options
    };

    delete providerOptions.query;
    delete providerOptions.sort;
    delete providerOptions.update;

    const result = await this.mongo.serviceProvider.findAndModify(
      this.database.name,
      this.name,
      options.query || {},
      options.sort,
      options.update,
      providerOptions
    );

    return result.value;
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
  async findOne(query?, projection?): Promise<Document> {
    const options: any = {};
    if (projection) {
      options.projection = projection;
    }

    this._emitCollectionApiCall('findOne', { query, options });
    return new Cursor(
      this,
      this.mongo.serviceProvider.find(this.database.name, this.name, query, options)
    ).limit(1).next();
  }

  @returnsPromise
  async renameCollection(
    newName: string,
    dropTarget?: boolean
  ): Promise<any> {
    this.mongo.internalState.checkUndefinedUpdate(newName);
    if (typeof newName !== 'string') {
      throw new MongoshInvalidInputError('The "newName" argument must be a string.');
    }
    this._emitCollectionApiCall('renameCollection', { newName, dropTarget });

    try {
      await this.mongo.serviceProvider.renameCollection(
        this.database.name,
        this.name,
        newName,
        { dropTarget: !!dropTarget }
      );

      return {
        ok: 1
      };
    } catch (e) {
      if (e.name === 'MongoError') {
        return {
          ok: 0,
          errmsg: e.errmsg,
          code: e.code,
          codeName: e.codeName
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
  @serverVersions(['3.2.0', ServerVersions.latest])
  async findOneAndDelete(filter, options = {}): Promise<Document> {
    this.mongo.internalState.checkUndefinedUpdate(filter);
    this._emitCollectionApiCall('findOneAndDelete', { filter, options });
    const result = await this.mongo.serviceProvider.findOneAndDelete(
      this.database.name,
      this.name,
      filter,
      options,
    );

    return result.value;
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
  @serverVersions(['3.2.0', ServerVersions.latest])
  async findOneAndReplace(filter, replacement, options = {}): Promise<any> {
    this.mongo.internalState.checkUndefinedUpdate(filter);
    const findOneAndReplaceOptions: any = { ...options };

    if ('returnNewDocument' in findOneAndReplaceOptions) {
      findOneAndReplaceOptions.returnDocument = findOneAndReplaceOptions.returnNewDocument;
      delete findOneAndReplaceOptions.returnNewDocument;
    }

    this._emitCollectionApiCall('findOneAndReplace', { filter, findOneAndReplaceOptions });
    const result = await this.mongo.serviceProvider.findOneAndReplace(
      this.database.name,
      this.name,
      filter,
      replacement,
      findOneAndReplaceOptions
    );
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
  @serverVersions(['3.2.0', ServerVersions.latest])
  async findOneAndUpdate(filter, update, options = {}): Promise<any> {
    this.mongo.internalState.checkUndefinedUpdate(filter);
    const findOneAndUpdateOptions: any = { ...options };

    if ('returnNewDocument' in findOneAndUpdateOptions) {
      findOneAndUpdateOptions.returnDocument = findOneAndUpdateOptions.returnNewDocument;
      delete findOneAndUpdateOptions.returnNewDocument;
    }

    this._emitCollectionApiCall('findOneAndUpdate', { filter, findOneAndUpdateOptions });
    const result = await this.mongo.serviceProvider.findOneAndUpdate(
      this.database.name,
      this.name,
      filter,
      update,
      findOneAndUpdateOptions,
    );
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
  async insert(docs, options: any = {}): Promise<InsertManyResult> {
    this.mongo.internalState.checkUndefinedUpdate(docs);
    const d = Object.prototype.toString.call(docs) === '[object Array]' ? docs : [docs];
    const dbOptions: DatabaseOptions = {};

    if ('writeConcern' in options) {
      Object.assign(dbOptions, options.writeConcern);
    }

    this._emitCollectionApiCall('insert', { options });
    const result = await this.mongo.serviceProvider.insertMany(
      this.database.name,
      this.name,
      d,
      options,
      dbOptions
    );

    return new InsertManyResult(
      result.result.ok,
      result.insertedIds
    );
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
  async insertMany(docs, options: any = {}): Promise<InsertManyResult> {
    this.mongo.internalState.checkUndefinedUpdate(docs);
    const dbOptions: DatabaseOptions = {};

    if ('writeConcern' in options) {
      Object.assign(dbOptions, options.writeConcern);
    }

    this._emitCollectionApiCall('insertMany', { options });
    const result = await this.mongo.serviceProvider.insertMany(
      this.database.name,
      this.name,
      docs,
      options,
      dbOptions
    );

    return new InsertManyResult(
      result.result.ok,
      result.insertedIds
    );
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
  async insertOne(doc, options: any = {}): Promise<InsertOneResult> {
    this.mongo.internalState.checkUndefinedUpdate(doc);
    const dbOptions: DatabaseOptions = {};

    if ('writeConcern' in options) {
      Object.assign(dbOptions, options.writeConcern);
    }

    this._emitCollectionApiCall('insertOne', { options });
    const result = await this.mongo.serviceProvider.insertOne(
      this.database.name,
      this.name,
      doc,
      options,
      dbOptions
    );

    return new InsertOneResult(
      result.result.ok,
      result.insertedId
    );
  }

  /**
   * Is collection capped?
   *
   * @return {Boolean}
   */
  @returnsPromise
  async isCapped(): Promise<boolean> {
    this._emitCollectionApiCall('isCapped');
    return this.mongo.serviceProvider.isCapped(this.database.name, this.name);
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
  @serverVersions([ServerVersions.earliest, '3.2.0'])
  remove(query, options: any = {}): Promise<any> {
    this.mongo.internalState.checkUndefinedUpdate(query);
    const dbOptions: DatabaseOptions = {};


    if ('writeConcern' in options) {
      Object.assign(dbOptions, options.writeConcern);
    }

    let removeOptions: any = {};
    if (typeof options === 'boolean') {
      removeOptions.justOne = options;
    } else {
      removeOptions = options;
    }

    this._emitCollectionApiCall('remove', { query, removeOptions });
    return this.mongo.serviceProvider.remove(
      this.database.name,
      this.name,
      query,
      removeOptions,
      dbOptions
    );
  }

  @returnsPromise
  @serverVersions([ServerVersions.earliest, '4.0.0'])
  save(doc, options: any = {}): Promise<any> {
    this.mongo.internalState.checkUndefinedUpdate(doc);
    const dbOptions: DatabaseOptions = {};

    this._emitCollectionApiCall('save', { options });
    if ('writeConcern' in options) {
      Object.assign(dbOptions, options.writeConcern);
    }

    return this.mongo.serviceProvider.save(this.database.name, this.name, doc, options, dbOptions);
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
  async replaceOne(filter, replacement, options: any = {}): Promise<UpdateResult> {
    this.mongo.internalState.checkUndefinedUpdate(filter);
    const dbOptions: DatabaseOptions = {};

    this._emitCollectionApiCall('replaceOne', { filter, options });
    if ('writeConcern' in options) {
      Object.assign(dbOptions, options.writeConcern);
    }
    const result = await this.mongo.serviceProvider.replaceOne(
      this.database.name,
      this.name,
      filter,
      replacement,
      options,
      dbOptions
    );
    return new UpdateResult(
      result.result.ok,
      result.matchedCount,
      result.modifiedCount,
      result.upsertedCount,
      result.upsertedId
    );
  }

  @returnsPromise
  @serverVersions([ServerVersions.earliest, '3.2.0'])
  async update(filter, update, options: any = {}): Promise<UpdateResult> {
    this.mongo.internalState.checkUndefinedUpdate(update);
    this._emitCollectionApiCall('update', { filter, options });
    let result;

    if (options.multi) {
      result = await this.mongo.serviceProvider.updateMany(
        this.database.name,
        this.name,
        filter,
        update,
        options,
      );
    } else {
      result = await this.mongo.serviceProvider.updateOne(
        this.database.name,
        this.name,
        filter,
        update,
        options,
      );
    }
    return new UpdateResult(
      result.result.ok,
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
  async updateMany(filter, update, options: any = {}): Promise<UpdateResult> {
    this.mongo.internalState.checkUndefinedUpdate(filter);
    const dbOptions: DatabaseOptions = {};
    this._emitCollectionApiCall('updateMany', { filter, options });
    if ('writeConcern' in options) {
      Object.assign(dbOptions, options.writeConcern);
    }
    const result = await this.mongo.serviceProvider.updateMany(
      this.database.name,
      this.name,
      filter,
      update,
      options,
      dbOptions
    );

    return new UpdateResult(
      result.result.ok,
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
  async updateOne(
    filter: Document,
    update: Document,
    options: Document = {}
  ): Promise<UpdateResult> {
    this.mongo.internalState.checkUndefinedUpdate(filter);
    const dbOptions: DatabaseOptions = {};
    this._emitCollectionApiCall('updateOne', { filter, options });
    if ('writeConcern' in options) {
      Object.assign(dbOptions, options.writeConcern);
    }
    const result = await this.mongo.serviceProvider.updateOne(
      this.database.name,
      this.name,
      filter,
      update,
      options,
      dbOptions
    );

    return new UpdateResult(
      result.result.ok,
      result.matchedCount,
      result.modifiedCount,
      result.upsertedCount,
      result.upsertedId
    );
  }

  /**
   * Converts a collection to capped
   *
   * @param {String} size - The maximum size, in bytes, for the capped collection.
   *
   * @return {Promise}
   */
  @returnsPromise
  async convertToCapped(size: number): Promise<any> {
    this._emitCollectionApiCall('convertToCapped', { size });
    return await this.mongo.serviceProvider.convertToCapped(
      this.database.name,
      this.name,
      size
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
  async createIndexes(
    keyPatterns: Document[],
    options: Document = {}
  ): Promise<any> {
    this.mongo.internalState.checkUndefinedUpdate(keyPatterns);
    if (typeof options !== 'object' || Array.isArray(options)) {
      throw new MongoshInvalidInputError('The "options" argument must be an object.');
    }

    const specs = keyPatterns.map((pattern) => ({
      ...options, key: pattern
    }));

    this._emitCollectionApiCall('createIndexes', { specs });

    return await this.mongo.serviceProvider.createIndexes(this.database.name, this.name, specs);
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
  async createIndex(
    keys: Document,
    options: Document = {}
  ): Promise<any> {
    this.mongo.internalState.checkUndefinedUpdate(keys);
    if (typeof options !== 'object' || Array.isArray(options)) {
      throw new MongoshInvalidInputError('The "options" argument must be an object.');
    }
    this._emitCollectionApiCall('createIndex', { keys, options });

    const spec = { ...options, key: keys };
    return await this.mongo.serviceProvider.createIndexes(this.database.name, this.name, [spec]);
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
  async ensureIndex(
    keys: Document,
    options: Document = {}
  ): Promise<any> {
    this.mongo.internalState.checkUndefinedUpdate(keys);
    if (typeof options !== 'object' || Array.isArray(options)) {
      throw new MongoshInvalidInputError('The "options" argument must be an object.');
    }
    this._emitCollectionApiCall('ensureIndex', { keys, options });

    const spec = { ...options, key: keys };
    return await this.mongo.serviceProvider.createIndexes(this.database.name, this.name, [spec]);
  }

  /**
   * Returns an array that holds a list of documents that identify and
   * describe the existing indexes on the collection.
   *
   * @return {Promise}
   */
  @returnsPromise
  @serverVersions(['3.2.0', ServerVersions.latest])
  async getIndexes(): Promise<any> {
    this._emitCollectionApiCall('getIndexes');
    return await this.mongo.serviceProvider.getIndexes(this.database.name, this.name);
  }

  /**
   * Returns an array that holds a list of documents that identify and
   * describe the existing indexes on the collection. (alias for getIndexes)
   *
   * @return {Promise}
   */
  @returnsPromise
  @serverVersions(['3.2.0', ServerVersions.latest])
  async getIndexSpecs(): Promise<any> {
    this._emitCollectionApiCall('getIndexSpecs');
    return await this.mongo.serviceProvider.getIndexes(this.database.name, this.name);
  }

  /**
   * Returns an array that holds a list of documents that identify and
   * describe the existing indexes on the collection. (alias for getIndexes)
   *
   * @return {Promise}
   */
  @returnsPromise
  async getIndices(): Promise<any> {
    this._emitCollectionApiCall('getIndices');
    return await this.mongo.serviceProvider.getIndexes(this.database.name, this.name);
  }

  /**
   * Returns an array of key patterns for the indexes defined on the collection.
   *
   * @return {Promise}
   */
  @returnsPromise
  @serverVersions(['3.2.0', ServerVersions.latest])
  async getIndexKeys(): Promise<any> {
    this._emitCollectionApiCall('getIndexKeys');
    const indexes = await this.mongo.serviceProvider.getIndexes(this.database.name, this.name);
    return indexes.map(i => i.key);
  }

  /**
   * Drops the specified index or indexes (except the index on the _id field)
   * from a collection.
   *
   * @param {string|string[]|Object|Object[]} indexes the indexes to be removed.
   * @return {Promise}
   */
  @returnsPromise
  async dropIndexes(indexes: string|string[]|Document|Document[]): Promise<any> {
    this.mongo.internalState.checkUndefinedUpdate(indexes);
    this._emitCollectionApiCall('dropIndexes', { indexes });
    try {
      return await this.mongo.serviceProvider.dropIndexes(this.database.name, this.name, indexes);
    } catch (error) {
      if (error.codeName === 'IndexNotFound') {
        return {
          ok: error.ok,
          errmsg: error.errmsg,
          code: error.code,
          codeName: error.codeName
        };
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
  async dropIndex(index: string|Document): Promise<any> {
    this.mongo.internalState.checkUndefinedUpdate(index);
    this._emitCollectionApiCall('dropIndex', { index });
    if (index === '*') {
      throw new MongoshInvalidInputError('To drop indexes in the collection using \'*\', use db.collection.dropIndexes().');
    }

    if (Array.isArray(index)) {
      throw new MongoshInvalidInputError('The index to drop must be either the index name or the index specification document.');
    }

    try {
      return await this.mongo.serviceProvider.dropIndexes(this.database.name, this.name, index);
    } catch (error) {
      if (error.codeName === 'IndexNotFound') {
        return {
          ok: error.ok,
          errmsg: error.errmsg,
          code: error.code,
          codeName: error.codeName
        };
      }

      throw error;
    }
  }

  /**
   * Returns the total size of all indexes for the collection.
   *
   * @return {Promise}
   */
  @returnsPromise
  async totalIndexSize(...args: any[]): Promise<any> {
    this._emitCollectionApiCall('totalIndexSize');
    if (args.length) {
      throw new MongoshInvalidInputError(
        '"totalIndexSize" takes no argument. Use db.collection.stats to get detailed information.'
      );
    }

    const stats = await this.mongo.serviceProvider.stats(this.database.name, this.name, {});
    return stats.totalIndexSize;
  }

  /**
   * Drops and recreate indexes for a collection.
   *
   * @return {Promise}
   */
  @returnsPromise
  async reIndex(): Promise<any> {
    this._emitCollectionApiCall('reIndex');
    return await this.mongo.serviceProvider.reIndex(this.database.name, this.name);
  }

  /**
   * Returns the collection database.
   *
   * @return {Database}
   */
  @returnType('Database')
  getDB(): Database {
    this._emitCollectionApiCall('getDB');
    return this.database;
  }

  /**
   * Get all the collection statistics.
   *
   * @param {Object} options - The stats options.
   * @return {Promise} returns Promise
   */
  @returnsPromise
  async stats(options: Document = {}): Promise<any> {
    this._emitCollectionApiCall('stats', { options });
    return await this.mongo.serviceProvider.stats(this.database.name, this.name, options);
  }

  /**
   * Get the collection dataSize.
   *
   * @return {Promise} returns Promise
   */
  @returnsPromise
  async dataSize(): Promise<any> {
    this._emitCollectionApiCall('dataSize');
    const stats = await this.mongo.serviceProvider.stats(this.database.name, this.name, {});
    return stats.size;
  }

  /**
   * Get the collection storageSize.
   *
   * @return {Promise} returns Promise
   */
  @returnsPromise
  async storageSize(): Promise<any> {
    this._emitCollectionApiCall('storageSize');
    const stats = await this.mongo.serviceProvider.stats(this.database.name, this.name, {});
    return stats.storageSize;
  }

  /**
   * Get the collection totalSize.
   *
   * @return {Promise} returns Promise
   */
  @returnsPromise
  async totalSize(): Promise<any> {
    this._emitCollectionApiCall('totalSize');
    const stats = await this.mongo.serviceProvider.stats(this.database.name, this.name, {});
    return (stats.storageSize || 0) + (stats.totalIndexSize || 0);
  }

  /**
   * Drop a collection.
   *
   * @return {Promise} returns Promise
   */
  @returnsPromise
  async drop(): Promise<boolean> {
    this._emitCollectionApiCall('drop');

    try {
      return await this.mongo.serviceProvider.dropCollection(
        this.database.name,
        this.name
      );
    } catch (error) {
      if (error.codeName === 'NamespaceNotFound') {
        this.mongo.internalState.messageBus.emit(
          'mongosh:warn',
          {
            method: 'drop',
            class: 'Collection',
            message: `Namespace not found: ${this.name}`
          }
        );
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
  async exists(): Promise<any> {
    this._emitCollectionApiCall('exists');
    const collectionInfos = await this.mongo.serviceProvider.listCollections(
      this.database.name,
      {
        name: this.name
      }
    );

    return collectionInfos[0] || null;
  }

  getFullName(): string {
    this._emitCollectionApiCall('getFullName');
    return `${this.database.name}.${this.name}`;
  }

  getName(): string {
    this._emitCollectionApiCall('getName');
    return `${this.name}`;
  }

  @returnsPromise
  async runCommand(commandName: string, options?: Document): Promise<any> {
    if (typeof commandName !== 'string') {
      throw new MongoshInvalidInputError('The "commandName" argument must be a string.');
    }

    if (options && commandName in options) {
      throw new MongoshInvalidInputError('The "commandName" argument cannot be passed as an option to "runCommand".');
    }

    this._emitCollectionApiCall('runCommand', { commandName });
    return await this.mongo.serviceProvider.runCommand(
      this.database.name,
      {
        ...options,
        [commandName]: this.name
      }
    );
  }

  @returnType('Explainable')
  explain(verbosity = 'queryPlanner'): Explainable {
    this.mongo.internalState.validateExplainableVerbosity(verbosity);
    this._emitCollectionApiCall('explain', { verbosity });
    return new Explainable(this.mongo, this, verbosity);
  }
}
