import {
  AggregationCursor,
  BulkWriteResult,
  Cursor,
  Database,
  DeleteResult,
  InsertManyResult,
  InsertOneResult,
  UpdateResult,
  CursorIterationResult,
  CommandResult,
  ShowDbsResult,
  ShellApi,
  types,
  Collection
} from '@mongosh/shell-api';

import {
  ServiceProvider,
  Document
} from '@mongosh/service-provider-core';

import AsyncWriter from '@mongosh/async-rewriter';

import { EventEmitter } from 'events';

export default class Mapper {
  private serviceProvider: ServiceProvider;
  private currentCursor: Cursor | AggregationCursor;
  private databases: any;
	private messageBus: EventEmitter;
  public context: any;
  public cursorAssigned: any;
  public asyncWriter: AsyncWriter;

  constructor(serviceProvider, messageBus?) {
    this.serviceProvider = serviceProvider;
    /* Internal state gets stored in mapper, state that is visible to the user
     * is stored in ctx */
    this.currentCursor = null;
    this.cursorAssigned = false;
    this.databases = { test: new Database(this, 'test') };
    this.messageBus = messageBus || new EventEmitter();
    this.asyncWriter = new AsyncWriter(types); // TODO: this will go in context object
    this.asyncWriter.symbols.initializeApiObjects({ db: types.Database });
  }

  /**
   * Prepare a `contextObject` as global context and set it as context
   * for the mapper.
   *
   * The `contextObject` is prepared so that it can be used as global object
   * for the repl evaluation.
   *
   * @note The `contextObject` is mutated, it will retain all of its existing
   * properties but also have the global shell api objects and functions.
   *
   * @param {Object} - contextObject an object used as global context.
   */
  setCtx(contextObject: any): void {
    const shellApi = new ShellApi(this);

    const attributes = Object.keys(types.ShellApi.attributes);
    const ownProperties = Object.getOwnPropertyNames(shellApi);

    const publicAttributes = [
      ...attributes,
      ...ownProperties
    ]
      .filter((name) => (!name.startsWith('_')));

    publicAttributes.forEach((name) => {
      const attribute = shellApi[name];
      if (typeof(attribute) === 'function') {
        contextObject[name] = attribute.bind(shellApi);
      } else {
        contextObject[name] = attribute;
      }
    });

    contextObject.db = this.databases.test;
    this.context = contextObject;
    this.messageBus.emit('setCtx', this.context.db);
  }

  use(_, db): any {
    if (!(db in this.databases)) {
      this.databases[db] = new Database(this, db);
    }
    this.messageBus.emit('cmd:use', db);
    this.context.db = this.databases[db];

    return `switched to db ${db}`;
  }

  async show(_, arg): Promise<any> {
    switch (arg) {
      case 'databases':
      case 'dbs':
        const result = await this.serviceProvider.listDatabases('admin');
        if (!('databases' in result)) {
          const err = new Error('Error: invalid result from listDatabases');
          this.messageBus.emit('error', err);
          throw err;
        }

        this.messageBus.emit('cmd:show', result.databases);
        return new ShowDbsResult({ value: result.databases });
      case 'collections':
        const collectionNames = await this.getCollectionNames(this.context.db);

        return new CommandResult({ value: collectionNames.join('\n') });
      default:
        const err = new Error(`Error: don't know how to show ${arg}`); // TODO: which error obj
        this.messageBus.emit('error', err);
        throw err;
    }
  }

  async it(): Promise<any> {
    const results = new CursorIterationResult();

    if (
      !this.currentCursor ||
      this.cursorAssigned ||
      this.currentCursor.isClosed()
    ) {
      return results;
    }

    for (let i = 0; i < 20; i++) {
      if (!await this.currentCursor.hasNext()) {
        this.messageBus.emit('cmd:it', 'no cursor');
        break;
      }

      results.push(await this.currentCursor.next());
    }

    this.messageBus.emit('cmd:it', results.length);
    return results;
  }

  /**
   * Run an aggregation pipeline.
   *
   * @note: Passing a null coll will cause the aggregation to run on the DB.
   *
   * @note: Shell API sets writeConcern via options in object, data provider API
   * expects it as a dbOption object.
   * @note: Shell API sets readConcern via options in object, data provider API
   * expects it as a dbOption object.
   * @note: CRUD API provides batchSize and maxAwaitTimeMS which the shell does not.
   *
   *
   * @param {Collection} collection - The collection class.
   * @param {Array} pipeline - The aggregation pipeline.
   * @param {Object} options - The pipeline options.
   *    <allowDiskUse, cursor, maxTimeMS, bypassDocumentValidation,
   *    readConcern, collation, hint, comment, writeConcern>
   *
   * @returns {AggregationCursor} The promise of the aggregation cursor.
   */
  aggregate(collection, pipeline, options: any = {}): any {
    const db = collection._database._name;
    const coll = collection._name;

    const dbOptions: any = {};

    if ('readConcern' in options) {
      dbOptions.readConcern = options.readConcern;
    }
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }

    let cmd;
    if (coll === null) {
      cmd = this.serviceProvider.aggregateDb(
        db,
        pipeline,
        options,
        dbOptions
      );
    } else {
      cmd = this.serviceProvider.aggregate(
        db,
        coll,
        pipeline,
        options,
        dbOptions
      );
    }

    this.messageBus.emit('method:aggregate', coll, cmd);
    const cursor = new AggregationCursor(this, cmd);

    this.currentCursor = cursor;

    return this.currentCursor;
  }

  /**
   * Execute a mix of write operations.
   *
   * @note: Shell API sets writeConcern via options in object, data provider API
   * expects it as a dbOption object.
   *
   * @param {Collection} collection - The collection class.
   * @param {Array} operations - The bulk write requests.
   * @param {Object} options - The bulk write options.
   *  <writeConcern, ordered>
   *
   * @returns {BulkWriteResult} The promise of the result.
   */
  async bulkWrite(
    collection: Collection,
    operations: Document,
    options: Document = {}
  ): Promise<BulkWriteResult> {
    const dbOptions: any = {};
    this.messageBus.emit('metho:bulkWrite', collection._name, operations);

    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }

    const result = await this.serviceProvider.bulkWrite(
      collection._database._name,
      collection._name,
      operations,
      options,
      dbOptions
    );

    return new BulkWriteResult(
      !!result.result.ok, // ackowledged
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
   * @param {Collection} collection - The collection class.
   * @param {Object} query - The filter.
   * @param {Object} options - The count options.
   *  <limit, skip, hint, maxTimeMS, readConcern, collation>
   * @returns {Integer} The promise of the count.
   */
  count(collection, query = {}, options: any = {}): any {
    const dbOpts: any = {};
    this.messageBus.emit('method:count', collection._name, query);

    if ('readConcern' in options) {
      dbOpts.readConcern = options.readConcern;
    }
    return this.serviceProvider.count(
      collection._database._name,
      collection._name,
      query,
      options,
      dbOpts
    );
  }

  /**
   * Get an exact document count from the coll.
   *
   * @param {Collection} collection - The collection class.
   * @param {Object} query - The filter.
   * @param {Object} options - The count options.
   *  <limit, skip, hint, maxTimeMS>
   *
   * @returns {Integer} The promise of the count.
   */
  countDocuments(collection, query, options: any = {}): any {
    this.messageBus.emit('method:countDocuments', collection._name, query, options);

    return this.serviceProvider.countDocuments(
      collection._database._name,
      collection._name,
      query,
      options
    );
  }

  /**
   * Delete multiple documents from the coll.
   *
   * @note: Shell API sets writeConcern via options in object, data provider API
   * expects it as a dbOption object.
   *
   * @param {Collection} collection - The collection class.
   * @param {Object} filter - The filter.
   * @param {Object} options - The delete many options.
   *  <collation, writeConcern>
   *
   * @returns {DeleteResult} The promise of the result.
   */
  async deleteMany(collection, filter, options: any = {}): Promise<any> {
    const dbOptions: any = {};
    this.messageBus.emit('method:deleteMany', collection._name, filter);

    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }

    const result = await this.serviceProvider.deleteMany(
      collection._database._name,
      collection._name,
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
   * @param {Collection} collection - The collection class.
   * @param {Object} filter - The filter.
   * @param {Object} options - The delete one options.
   *  <collation, writeConcern>
   *
   * @returns {DeleteResult} The promise of the result.
   */
  async deleteOne(collection, filter, options: any = {}): Promise<any> {
    const dbOptions: any = {};
    this.messageBus.emit('method:deleteOne', collection._name, filter);

    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    const result = await this.serviceProvider.deleteOne(
      collection._database._name,
      collection._name,
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
   * @param {Collection} collection - The collection class.
   * @param {String} field - The field name.
   * @param {Object} query - The filter.
   * @param {Object} options - The distinct options.
   *  <collation>
   *
   * @returns {Array} The promise of the result. TODO: make sure returned type is the same
   */
  distinct(collection, field, query, options: any = {}): any {
    this.messageBus.emit('method:distinct', collection._name, field, query);
    return this.serviceProvider.distinct(
      collection._database._name,
      collection._name,
      field,
      query,
      options
    );
  }

  /**
   * Get an estimated document count from the coll.
   *
   * @param {Collection} collection - The collection class.
   * @param {Object} options - The count options.
   *  <maxTimeMS>
   *
   * @returns {Integer} The promise of the count.
   */
  estimatedDocumentCount(collection, options = {}): Promise<any> {
    this.messageBus.emit('method:estimatedDocumentCount', collection._name);
    return this.serviceProvider.estimatedDocumentCount(
      collection._database._name,
      collection._name,
      options,
    );
  }

  /**
   * Find documents in the collection.
   *
   * @note: Shell API passes filter and projection to find, data provider API
   * uses a options object.
   *
   * @param {Collection} collection - The collection class.
   * @param {Object} query - The filter.
   * @param {Object} projection - The projection.
   *
   * @returns {Cursor} The promise of the cursor.
   */
  find(collection, query, projection): any {
    const options: any = {};
    this.messageBus.emit('method:find', collection._name, query, projection);

    if (projection) {
      options.projection = projection;
    }

    this.currentCursor = new Cursor(
      this,
      this.serviceProvider.find(
        collection._database._name,
        collection._name,
        query,
        options
      )
    );

    return this.currentCursor;
  }

  /**
   * Find one document in the collection.
   *
   * @note: findOne is just find with limit.
   *
   * @param {Collection} collection - The collection class.
   * @param {Object} query - The filter.
   * @param {Object} projection - The projection.
   *
   * @returns {Cursor} The promise of the cursor.
   */
  findOne(collection, query, projection): Promise<any> {
    const options: any = {};
    this.messageBus.emit('method:findOne', collection._name, query, projection);

    if (projection) {
      options.projection = projection;
    }
    return new Cursor(
      this,
      this.serviceProvider.find(
        collection._database._name,
        collection._name,
        query,
        options
      )
    ).limit(1).next();
  }

  // findAndModify(collection, document) {
  //   return this._serviceProvider.findAndModify(
  //     collection._database._name,
  //     collection._name,
  //     document,
  //   );
  // };

  /**
   * Find one document and delete it.
   *
   * @param {Collection} collection - The collection class.
   * @param {Object} filter - The filter.
   * @param {Object} options - The find options.
   *  <projection, sort, collation, maxTimeMS>
   *
   * @returns {Document} The promise of the result.
   */
  async findOneAndDelete(collection, filter, options = {}): Promise<any> {
    this.messageBus.emit('method:findOneAndDelete', collection._name, filter);
    const result = await this.serviceProvider.findOneAndDelete(
      collection._database._name,
      collection._name,
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
   * @param {Collection} collection - The collection class.
   * @param {Object} filter - The filter.
   * @param {Object} replacement - The replacement.
   * @param {Object} options - The find options.
   *  <projection, sort, upsert, maxTimeMS, returnNewDocument, collation>
   *
   * @returns {Document} The promise of the result.
   */
  async findOneAndReplace(collection, filter, replacement, options = {}): Promise<any> {
    const findOneAndReplaceOptions: any = { ...options };
    this.messageBus.emit('method:findOneAndReplace', collection._name, filter);

    if ('returnNewDocument' in findOneAndReplaceOptions) {
      findOneAndReplaceOptions.returnDocument = findOneAndReplaceOptions.returnNewDocument;
      delete findOneAndReplaceOptions.returnNewDocument;
    }
    const result = await this.serviceProvider.findOneAndReplace(
      collection._database._name,
      collection._name,
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
   * @param {Collection} collection - The collection class.
   * @param {Object} filter - The filter.
   * @param {(Object|Array)} update - The update.
   * @param {Object} options - The find options.
   *  <projection, sort,maxTimeMS,upsert,returnNewDocument,collation, arrayFilters>
   *
   * @returns {Document} The promise of the result.
   */
  async findOneAndUpdate(collection, filter, update, options = {}): Promise<any> {
    const findOneAndUpdateOptions: any = { ...options };
    this.messageBus.emit('method:findOneAndUpdate', collection._name, filter);

    if ('returnNewDocument' in findOneAndUpdateOptions) {
      findOneAndUpdateOptions.returnDocument = findOneAndUpdateOptions.returnNewDocument;
      delete findOneAndUpdateOptions.returnNewDocument;
    }
    const result = await this.serviceProvider.findOneAndUpdate(
      collection._database._name,
      collection._name,
      filter,
      update,
      options,
    );
    return result.value;
  }

  /**
   * Alias for insertMany.
   *
   * @note: Shell API sets writeConcern via options in object, data provider API
   * expects it as a dbOption object.
   *
   * @param {Collection} collection
   * @param {Object|Array} docs
   * @param {Object} options
   *    <writeConcern, ordered>
   * @return {InsertManyResult}
   */
  async insert(collection, docs, options: any = {}): Promise<any> {
    const d = Object.prototype.toString.call(docs) === '[object Array]' ? docs : [docs];
    const dbOptions: any = {};
    this.messageBus.emit('method:insert', collection._name, docs);

    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    const result = await this.serviceProvider.insertMany(
      collection._database._name,
      collection._name,
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
   * @param {Collection} collection
   * @param {Object|Array} docs
   * @param {Object} options
   *    <writeConcern, ordered>
   * @return {InsertManyResult}
   */
  async insertMany(collection, docs, options: any = {}): Promise<any> {
    const dbOptions: any = {};
    this.messageBus.emit('method:insertMany', collection._name, docs);

    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }

    const result = await this.serviceProvider.insertMany(
      collection._database._name,
      collection._name,
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
   * @param {Collection} collection
   * @param {Object} doc
   * @param {Object} options
   *    <writeConcern>
   * @return {InsertOneResult}
   */
  async insertOne(collection, doc, options: any = {}): Promise<any> {
    const dbOptions: any = {};
    this.messageBus.emit('method:insertOne');

    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    const result = await this.serviceProvider.insertOne(
      collection._database._name,
      collection._name,
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
   * @param {Collection} collection
   * @return {Boolean}
   */
  isCapped(collection): Promise<any> {
    this.messageBus.emit('method:isCapped', collection._name);
    return this.serviceProvider.isCapped(
      collection._database._name,
      collection._name,
    );
  }

  /**
   * Deprecated remove command.
   *
   * @note: Shell API sets writeConcern via options in object, data provider API
   * expects it as a dbOption object.
   * @note: Shell API accepts second argument as a bool, indicating justOne.
   *
   * @param {Collection} collection
   * @param {Object} query
   * @param {Object|Boolean} options
   *    <justOne, writeConcern, collation>
   * @return {Promise}
   */
  remove(collection, query, options: any = {}): Promise<any> {
    const dbOptions: any = {};
    this.messageBus.emit('method:remove', collection._name, query);

    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    let removeOptions: any = {};
    if (typeof options === 'boolean') {
      removeOptions.justOne = options;
    } else {
      removeOptions = options;
    }
    return this.serviceProvider.remove(
      collection._database._name,
      collection._name,
      query,
      removeOptions,
      dbOptions
    );
  }

  // TODO
  save(collection, doc, options: any = {}): Promise<any> {
    const dbOptions: any = {};
    this.messageBus.emit('method:save', collection._name, doc);

    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    return this.serviceProvider.save(
      collection._database._name,
      collection._name,
      doc,
      options,
      dbOptions
    );
  }

  /**
   * Replace a document with another.
   *
   * @note: Shell API sets writeConcern via options in object, data provider API
   * expects it as a dbOption object.
   * @note: Data provider API allows for bypassDocumentValidation as argument,
   * shell API doesn't.
   *
   * @param {Collection} collection
   * @param {Object} filter - The filter.
   * @param {Object} replacement - The replacement document for matches.
   * @param {Object} options - The replace options.
   *    <upsert, writeConcern, collation, hint>
   *
   * @returns {UpdateResult} The promise of the result.
   */
  async replaceOne(collection, filter, replacement, options: any = {}): Promise<any> {
    const dbOptions: any = {};
    this.messageBus.emit('method:replaceOne', collection._name, filter);

    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    const result = await this.serviceProvider.replaceOne(
      collection._database._name,
      collection._name,
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

  /**
   * Run a command against the db.
   *
   * @param {Database} database - the db object.
   * @param {Object} cmd - the command spec.
   *
   * @returns {Promise} The promise of command results. TODO: command result object
   */
  runCommand(database, cmd): Promise<any> {
    this.messageBus.emit('method:runCommand', database._name, cmd);
    return this.serviceProvider.runCommand(database._name, cmd);
  }

  async update(collection, filter, update, options: any = {}): Promise<any> {
    let result;
    this.messageBus.emit('method:update', collection._name, filter);
    if (options.multi) {
      result = await this.serviceProvider.updateMany(
        collection._name,
        collection._database._name,
        filter,
        update,
        options,
      );
    } else {
      result = await this.serviceProvider.updateOne(
        collection._name,
        collection._database._name,
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
   * @param {Collection} collection
   * @param {Object} filter - The filter.
   * @param {(Object|Array)} update - The updates.
   * @param {Object} options - The update options.
   *  <upsert, writeConcern, collation, arrayFilters, hint>
   *
   * @returns {UpdateResult} The promise of the result.
   */
  async updateMany(collection, filter, update, options: any = {}): Promise<any> {
    const dbOptions: any = {};
    this.messageBus.emit('method:updateMany', collection._name, filter);

    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    const result = await this.serviceProvider.updateMany(
      collection._database._name,
      collection._name,
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
   * @param {Collection} collection
   * @param {Object} filter - The filter.
   * @param {(Object|Array)} update - The updates.
   * @param {Object} options - The update options.
   *  <upsert, writeConcern, collation, arrayFilters, hint>
   *
   * @returns {UpdateResult} The promise of the result.
   */
  async updateOne(collection, filter, update, options: any = {}): Promise<any> {
    const dbOptions: any = {};
    this.messageBus.emit('method:updateOne', collection._name, filter);

    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    const result = await this.serviceProvider.updateMany(
      collection._database._name,
      collection._name,
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
   * @param {Collection} collection
   * @param {String} size - The maximum size, in bytes, for the capped collection.
   *
   * @return {Promise}
   */
  async convertToCapped(collection: Collection, size: number): Promise<any> {
    this.messageBus.emit(
      'method:convertToCapped',
      collection._name,
      size
    );

    return await this.serviceProvider.convertToCapped(
      collection._database._name,
      collection._name,
      size
    );
  }

  /**
   * Create indexes for a collection
   *
   * @param {Collection} collection
   * @param {Document} keyPatterns - An array of documents that contains
   *  the field and value pairs where the field is the index key and the
   *  value describes the type of index for that field.
   * @param {Document} options - createIndexes options (
   *  name, background, sparse ...)
   * @return {Promise}
   */
  async createIndexes(
    collection: Collection,
    keyPatterns: Document[],
    options: Document = {}
  ): Promise<any> {
    this.messageBus.emit(
      'method:createIndexes',
      collection._name,
      keyPatterns,
      options
    );

    if (typeof options !== 'object' || Array.isArray(options)) {
      throw new Error('options must be an object');
    }

    const specs = keyPatterns.map((pattern) => ({
      ...options, key: pattern
    }));

    return await this.serviceProvider.createIndexes(
      collection._database._name,
      collection._name,
      specs
    );
  }

  /**
   * Create index for a collection
   *
   * @param {Collection} collection
   * @param {Document} keys - An document that contains
   *  the field and value pairs where the field is the index key and the
   *  value describes the type of index for that field.
   * @param {Document} options - createIndexes options (
   *  name, background, sparse ...)
   *
   * @return {Promise}
   */
  async createIndex(
    collection: Collection,
    keys: Document,
    options: Document = {}
  ): Promise<any> {
    this.messageBus.emit(
      'method:createIndex',
      collection._name,
      keys,
      options
    );

    return await this.createIndexes(
      collection,
      [keys],
      options
    );
  }

  /**
   * Create index for a collection (alias for createIndex)
   *
   * @param {Collection} collection
   * @param {Document} keys - An document that contains
   *  the field and value pairs where the field is the index key and the
   *  value describes the type of index for that field.
   * @param {Document} options - createIndexes options (
   *  name, background, sparse ...)
   *
   * @return {Promise}
   */
  async ensureIndex(
    collection: Collection,
    keys: Document,
    options: Document
  ): Promise<any> {
    this.messageBus.emit(
      'method:ensureIndex',
      collection._name,
      keys,
      options
    );

    return await this.createIndex(
      collection,
      keys,
      options
    );
  }

  /**
   * Returns an array that holds a list of documents that identify and
   * describe the existing indexes on the collection.
   *
   * @param {Collection} collection
   *
   * @return {Promise}
   */
  async getIndexes(
    collection: Collection,
  ): Promise<any> {
    this.messageBus.emit(
      'method:getIndexes',
      collection._name
    );

    return await this.serviceProvider.getIndexes(
      collection._database._name,
      collection._name
    );
  }

  /**
   * Returns an array that holds a list of documents that identify and
   * describe the existing indexes on the collection. (alias for getIndexes)
   *
   * @param {Collection} collection
   *
   * @return {Promise}
   */
  async getIndexSpecs(
    collection: Collection,
  ): Promise<any> {
    this.messageBus.emit(
      'method:getIndexSpecs',
      collection._name
    );

    return await this.getIndexes(collection);
  }

  /**
   * Returns an array that holds a list of documents that identify and
   * describe the existing indexes on the collection. (alias for getIndexes)
   *
   * @param {Collection} collection
   *
   * @return {Promise}
   */
  async getIndices(
    collection: Collection,
  ): Promise<any> {
    this.messageBus.emit(
      'method:getIndices',
      collection._name
    );

    return await this.getIndexes(collection);
  }

  /**
   * Returns an array of key patters for the indexes defined on the collection.
   *
   * @param {Collection} collection
   *
   * @return {Promise}
   */
  async getIndexKeys(
    collection: Collection,
  ): Promise<any> {
    this.messageBus.emit(
      'method:getIndexKeys',
      collection._name
    );

    return (await this.getIndexes(collection)).map(i => i.key);
  }

  /**
   * Drops the specified index or indexes (except the index on the _id field)
   * from a collection.
   *
   * @param {Collection} collection
   * @param {string|string[]|Object|Object[]} indexes the indexes to be removed.
   * @return {Promise}
   */
  async dropIndexes(
    collection: Collection,
    indexes: string|string[]|Document|Document[]
  ): Promise<any> {
    this.messageBus.emit(
      'method:dropIndexes',
      collection._name,
      indexes
    );

    try {
      return await this.serviceProvider.dropIndexes(
        collection._database._name,
        collection._name,
        indexes
      );
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
   * @param {Collection} collection
   * @param {string|Object} index the index to be removed.
   * @return {Promise}
   */
  async dropIndex(
    collection: Collection,
    index: string|Document
  ): Promise<any> {
    this.messageBus.emit(
      'method:dropIndex',
      collection._name,
      index
    );

    if (index === '*') {
      throw new Error('To drop indexes in the collection using \'*\', use db.collection.dropIndexes()');
    }

    if (Array.isArray(index)) {
      throw new Error('The index to drop must be either the index name or the index specification document');
    }

    return await this.dropIndexes(collection, index);
  }

  /**
   * Returns an array of collection infos
   *
   * @param {String} database - The database.
   * @param {Document} filter - The filter.
   * @param {Document} options - The options.
   *
   * @return {Promise}
   */
  async getCollectionInfos(
    database: Database,
    filter: Document = {},
    options: Document = {}): Promise<any> {
    this.messageBus.emit(
      'method:getCollectionInfos',
      database._name,
      filter,
      options
    );

    return await this.serviceProvider.listCollections(
      database._name,
      filter,
      options
    );
  }

  /**
   * Returns an array of collection names
   *
   * @param {String} database - The database.
   * @param {Document} filter - The filter.
   * @param {Document} options - The options.
   *
   * @return {Promise}
   */
  async getCollectionNames(
    database: Database
  ): Promise<any> {
    this.messageBus.emit(
      'method:getCollectionNames',
      database._name
    );

    const infos = await this.getCollectionInfos(
      database,
      {},
      { nameOnly: true }
    );

    return infos.map(collection => collection.name);
  }

  /**
   * Returns the total size of all indexes for the collection.
   *
   * @param {Collection} collection
   * @return {Promise}
   */
  async totalIndexSize(
    collection: Collection,
    ...args: any[]
  ): Promise<any> {
    this.messageBus.emit(
      'method:totalIndexSize',
      collection._name
    );

    if (args.length) {
      throw new Error(
        'totalIndexSize takes no argument. Use db.collection.stats to get detailed information.'
      );
    }

    const stats = await this.stats(collection);

    return stats.totalIndexSize;
  }

  /**
   * Drops and recreate indexes for a collection.
   *
   * @param {Collection} collection
   * @return {Promise}
   */
  async reIndex(
    collection: Collection
  ): Promise<any> {
    this.messageBus.emit(
      'method:reIndex',
      collection._name
    );

    return await this.serviceProvider.reIndex(
      collection._database._name,
      collection._name
    );
  }

  /**
   * Returns the collection database.
   *
   * @param {Collection} collection
   * @return {Database}
   */
  getDB(
    collection: Collection
  ): Database {
    this.messageBus.emit('method:getDB', collection._name);

    return collection._database;
  }

  /**
   * Get all the collection statistics.
   *
   * @param {Collection} collection - The collection name.
   * @param {Object} options - The stats options.
   * @return {Promise} returns Promise
   */
  async stats(
    collection: Collection,
    options: Document = {}
  ): Promise<any> {
    this.messageBus.emit(
      'method:stats',
      collection._name,
      options
    );

    return await this.serviceProvider.stats(
      collection._database._name,
      collection._name,
      options
    );
  }

  /**
   * Get the collection dataSize.
   *
   * @param {Collection} collection - The collection name.
   * @return {Promise} returns Promise
   */
  async dataSize(
    collection: Collection,
  ): Promise<any> {
    this.messageBus.emit(
      'method:dataSize',
      collection._name
    );

    return (await this.stats(collection)).size;
  }

  /**
   * Get the collection storageSize.
   *
   * @param {Collection} collection - The collection name.
   * @return {Promise} returns Promise
   */
  async storageSize(
    collection: Collection,
  ): Promise<any> {
    this.messageBus.emit(
      'method:storageSize',
      collection._name
    );

    return (await this.stats(collection)).storageSize;
  }

  /**
   * Get the collection totalSize.
   *
   * @param {Collection} collection - The collection name.
   * @return {Promise} returns Promise
   */
  async totalSize(
    collection: Collection,
  ): Promise<any> {
    this.messageBus.emit(
      'method:totalSize',
      collection._name
    );

    const stats = await this.stats(collection);
    return (stats.storageSize || 0) + (stats.totalIndexSize || 0);
  }
}
