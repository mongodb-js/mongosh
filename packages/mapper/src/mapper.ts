/* eslint-disable @typescript-eslint/camelcase */
import {
  AggregationCursor,
  BulkWriteResult,
  Collection,
  Cursor,
  Database,
  DeleteResult,
  InsertManyResult,
  InsertOneResult,
  UpdateResult,
  CursorIterationResult,
  CommandResult,
  Explainable
} from '@mongosh/shell-api';

import {
  ServiceProvider,
  Document,
  DatabaseOptions,
  Cursor as ServiceProviderCursor,
  WriteConcern
} from '@mongosh/service-provider-core';

import { EventEmitter } from 'events';
import { MongoshInvalidInputError, MongoshInternalError } from '@mongosh/errors';

export default class Mapper {
  private serviceProvider: ServiceProvider;
  private currentCursor: Cursor | AggregationCursor;
  public databases: any;
	private messageBus: EventEmitter;
  public context: any;

  constructor(serviceProvider, messageBus?) {
    this.serviceProvider = serviceProvider;
    /* Internal state gets stored in mapper, state that is visible to the user
     * is stored in ctx */
    this.currentCursor = null;
    this.databases = { test: new Database(this, 'test') };
    this.messageBus = messageBus || new EventEmitter();
  }

  private _emitExplainableApiCall(explainable: Explainable, methodName: string, methodArguments: Document = {}): void {
    this._emitApiCall({
      method: methodName,
      class: 'Explainable',
      db: explainable._collection._database._name,
      coll: explainable._collection._name,
      arguments: methodArguments
    });
  }

  private _emitDatabaseApiCall(database: Database, methodName: string, methodArguments: Document = {}): void {
    this._emitApiCall({
      method: methodName,
      class: 'Database',
      db: database._name,
      arguments: methodArguments
    });
  }

  private _emitCollectionApiCall(collection: Collection, methodName: string, methodArguments: Document = {}): void {
    this._emitApiCall({
      method: methodName,
      class: 'Collection',
      db: collection._database._name,
      coll: collection._name,
      arguments: methodArguments
    });
  }

  private _emitApiCall(event: {
    method: string;
    class: string;
    arguments: Document;
    [otherProps: string]: any;
  }): void {
    this.messageBus.emit('mongosh:api-call', event);
  }

  private _getDatabase(name: string): Database {
    if (typeof name !== 'string') {
      throw new MongoshInvalidInputError(
        `Database name must be a string. Received ${typeof name}.`);
    }

    if (!name.trim()) {
      throw new MongoshInvalidInputError('Database name cannot be empty.');
    }

    if (!(name in this.databases)) {
      this.databases[name] = new Database(this, name);
    }

    return this.databases[name];
  }

  use(db: string): any {
    this.messageBus.emit( 'mongosh:use', { db });
    this.context.db = this._getDatabase(db);

    return `switched to db ${db}`;
  }

  async show(arg): Promise<CommandResult> {
    this.messageBus.emit( 'mongosh:show', { method: `show ${arg}` });

    switch (arg) {
      case 'databases':
      case 'dbs':
        return await this._showDatabases();
      case 'collections':
      case 'tables':
        return await this._showCollections();
      default:
        const validArguments = [
          'databases',
          'dbs',
          'collections',
          'tables'
        ];

        const err = new MongoshInvalidInputError(
          `'${arg}' is not a valid argument for "show".\nValid arguments are: ${validArguments.join(', ')}`
        );

        this.messageBus.emit('mongosh:error', err);
        throw err;
    }
  }

  private async _showCollections(): Promise<CommandResult> {
    const collectionNames = await this.database_getCollectionNames(this.context.db);

    return new CommandResult('ShowCollectionsResult', collectionNames);
  }

  private async _showDatabases(): Promise<CommandResult> {
    const result = await this.serviceProvider.listDatabases('admin');

    if (!('databases' in result)) {
      const err = new MongoshInternalError('Got invalid result from "listDatabases"');
      this.messageBus.emit('mongosh:error', err);
      throw err;
    }

    return new CommandResult('ShowDatabasesResult', result.databases);
  }

  async it(): Promise<any> {
    const results = new CursorIterationResult();

    if (
      !this.currentCursor ||
      this.currentCursor.isClosed()
    ) {
      return results;
    }

    for (let i = 0; i < 20; i++) { // TODO: ensure that assigning cursor doesn't iterate
      if (!await this.currentCursor.hasNext()) {
        break;
      }

      results.push(await this.currentCursor.next());
    }

    return results;
  }

  private async _aggregate(
    databaseName: string,
    collectionName: string,
    pipeline: Document[],
    options?: Document
  ): Promise<AggregationCursor|CommandResult> {
    const {
      providerOptions,
      dbOptions,
      explain
    } = this._adaptAggregateOptions(options);

    let providerCursor: ServiceProviderCursor;
    if (collectionName) {
      providerCursor = this.serviceProvider.aggregate(
        databaseName,
        collectionName,
        pipeline,
        providerOptions,
        dbOptions
      );
    } else {
      providerCursor = this.serviceProvider.aggregateDb(
        databaseName,
        pipeline,
        providerOptions,
        dbOptions
      );
    }

    const cursor = new AggregationCursor(this, providerCursor);

    if (explain) {
      return await cursor.explain();
    }

    this.currentCursor = cursor;
    return cursor;
  }
  /**
   * Run a command against the db.
   *
   * @param {Database} database - the db object.
   * @param {Object} cmd - the command spec.
   *
   * @returns {Promise} The promise of command results. TODO: command result object
   */
  database_runCommand(database: Database, cmd: Document): Promise<any> {
    this._emitDatabaseApiCall(database, 'runCommand', { cmd });
    return this.serviceProvider.runCommand(database._name, cmd);
  }

  database_adminCommand(database: Database, cmd: Document): Promise<any> {
    this._emitDatabaseApiCall(database, 'adminCommand', { cmd });
    return this.serviceProvider.runCommand('admin', cmd);
  }

  async database_aggregate(
    database: Database,
    command: any = {}
  ): Promise<AggregationCursor|CommandResult> {
    const collectionName = command.aggregate === 1 || command.aggregate === undefined ? null : command.aggregate;
    const pipeline = command.pipeline || [];
    const options = Object.keys(command).reduce((result, k) => {
      if (k !== 'aggregate' && k !== 'pipeline') result[k] = command[k];
      return result;
    }, {});

    this._emitDatabaseApiCall(database, 'aggregate', { pipeline, options });

    return this._aggregate(database._name, collectionName, pipeline, options);
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
  async database_getCollectionInfos(
    database: Database,
    filter: Document = {},
    options: Document = {}): Promise<any> {
    this._emitDatabaseApiCall(database, 'getCollectionInfos', { filter, options });
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
  async database_getCollectionNames(
    database: Database
  ): Promise<any> {
    this._emitDatabaseApiCall(database, 'getCollectionNames');

    const infos = await this.database_getCollectionInfos(
      database,
      {},
      { nameOnly: true }
    );

    return infos.map(collection => collection.name);
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
   * OR each stage can be passed as an argument.
   *
   * @returns {AggregationCursor} The promise of the aggregation cursor.
   */
  collection_aggregate(
    collection: Collection,
    ...args: any[]
  ): Promise<AggregationCursor|CommandResult> {
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
      collection,
      'aggregate',
      { options, pipeline }
    );

    return this._aggregate(
      collection._database._name,
      collection._name,
      pipeline,
      options
    );
  }

  private _adaptAggregateOptions(options: any = {}): {
    providerOptions: Document;
    dbOptions: DatabaseOptions;
    explain: boolean;
  } {
    const providerOptions = { ...options };

    const dbOptions: DatabaseOptions = {};
    let explain = false;

    if ('readConcern' in providerOptions) {
      dbOptions.readConcern = options.readConcern;
      delete providerOptions.readConcern;
    }

    if ('writeConcern' in providerOptions) {
      Object.assign(dbOptions, options.writeConcern);
      delete providerOptions.writeConcern;
    }

    if ('explain' in providerOptions) {
      explain = providerOptions.explain;
      delete providerOptions.explain;
    }

    return { providerOptions, dbOptions, explain };
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
  async collection_bulkWrite(
    collection: Collection,
    operations: Document,
    options: Document = {}
  ): Promise<BulkWriteResult> {
    const dbOptions: DatabaseOptions = {};
    const db = collection._database._name;
    const coll = collection._name;
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'bulkWrite',
        class: 'Collection',
        db, coll, arguments: { options }
      }
    );

    if ('writeConcern' in options) {
      Object.assign(dbOptions, options.writeConcern);
    }

    const result = await this.serviceProvider.bulkWrite(
      db,
      coll,
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
   * @param {Collection} collection - The collection class.
   * @param {Object} query - The filter.
   * @param {Object} options - The count options.
   *  <limit, skip, hint, maxTimeMS, readConcern, collation>
   * @returns {Integer} The promise of the count.
   */
  collection_count(collection, query = {}, options: any = {}): any {
    const dbOpts: any = {};
    const db = collection._database._name;
    const coll = collection._name;
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'count',
        class: 'Collection',
        db, coll, arguments: { query, options }
      }
    );

    if ('readConcern' in options) {
      dbOpts.readConcern = options.readConcern;
    }

    return this.serviceProvider.count(db, coll, query, options, dbOpts);
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
  collection_countDocuments(collection, query, options: any = {}): any {
    const db = collection._database._name;
    const coll = collection._name;
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'countDocuments',
        class: 'Collection',
        db, coll, arguments: { query, options }
      }
    );

    return this.serviceProvider.countDocuments(db, coll, query, options);
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
  async collection_deleteMany(collection, filter, options: any = {}): Promise<any> {
    const dbOptions: DatabaseOptions = {};
    const db = collection._database._name;
    const coll = collection._name;

    if (filter === undefined) {
      throw new MongoshInvalidInputError('Cannot pass an undefined argument to an update command');
    }
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'deleteMany',
        class: 'Collection',
        db, coll, arguments: { filter, options }
      }
    );

    if ('writeConcern' in options) {
      Object.assign(dbOptions, options.writeConcern);
    }

    const result = await this.serviceProvider.deleteMany(
      db,
      coll,
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
  async collection_deleteOne(collection, filter, options: any = {}): Promise<any> {
    const dbOptions: DatabaseOptions = {};
    const db = collection._database._name;
    const coll = collection._name;
    if (filter === undefined) {
      throw new MongoshInvalidInputError('Cannot pass an undefined argument to an update command');
    }
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'deleteOne',
        class: 'Collection',
        db, coll, arguments: { filter, options }
      }
    );

    if ('writeConcern' in options) {
      Object.assign(dbOptions, options.writeConcern);
    }
    const result = await this.serviceProvider.deleteOne(
      db,
      coll,
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
  collection_distinct(collection, field, query, options: any = {}): any {
    const db = collection._database._name;
    const coll = collection._name;
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'distinct',
        class: 'Collection',
        db, coll, arguments: { field, query, options }
      }
    );

    return this.serviceProvider.distinct(db, coll, field, query, options);
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
  collection_estimatedDocumentCount(collection, options = {}): Promise<any> {
    const db = collection._database._name;
    const coll = collection._name;
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'estimatedDocumentCount',
        class: 'Collection',
        db, coll, arguments: { options }
      }
    );

    return this.serviceProvider.estimatedDocumentCount(db, coll, options,);
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
  collection_find(collection, query, projection): Cursor {
    const options: any = {};
    const db = collection._database._name;
    const coll = collection._name;

    if (projection) {
      options.projection = projection;
    }

    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'find',
        class: 'Collection',
        db, coll, arguments: { query, options }
      }
    );

    const cursor = new Cursor(
      this,
      this.serviceProvider.find(db, coll, query, options)
    );

    this.currentCursor = cursor;

    return cursor;
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
  collection_findOne(collection, query, projection): Promise<any> {
    const options: any = {};
    const db = collection._database._name;
    const coll = collection._name;

    if (projection) {
      options.projection = projection;
    }

    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'findOne',
        class: 'Collection',
        db, coll, arguments: { query, options }
      }
    );

    return new Cursor(
      this,
      this.serviceProvider.find(db, coll, query, options)
    ).limit(1).next();
  }

  async collection_findAndModify(
    collection: Collection,
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
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'findAndModify',
        class: 'Collection',
        db: collection._database._name,
        coll: collection._name,
        arguments: { options: { ...options, update: !!options.update } }
      }
    );

    const providerOptions = {
      ...options
    };

    delete providerOptions.query;
    delete providerOptions.sort;
    delete providerOptions.update;

    const result = await this.serviceProvider.findAndModify(
      collection._database._name,
      collection._name,
      options.query || {},
      options.sort,
      options.update,
      providerOptions
    );

    return result.value;
  }

  async collection_renameCollection(
    collection: Collection,
    newName: string,
    dropTarget?: boolean
  ): Promise<any> {
    if (typeof newName !== 'string') {
      throw new MongoshInvalidInputError('The "newName" argument must be a string.');
    }

    try {
      await this.serviceProvider.renameCollection(
        collection._database._name,
        collection._name,
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
   * @param {Collection} collection - The collection class.
   * @param {Object} filter - The filter.
   * @param {Object} options - The find options.
   *  <projection, sort, collation, maxTimeMS>
   *
   * @returns {Document} The promise of the result.
   */
  async collection_findOneAndDelete(collection, filter, options = {}): Promise<any> {
    const db = collection._database._name;
    const coll = collection._name;
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'findOneAndDelete',
        class: 'Collection',
        db, coll, arguments: { filter, options }
      }
    );

    if (filter === undefined) {
      throw new MongoshInvalidInputError('Cannot pass an undefined filter to an update command');
    }

    const result = await this.serviceProvider.findOneAndDelete(
      db,
      coll,
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
  async collection_findOneAndReplace(collection, filter, replacement, options = {}): Promise<any> {
    const findOneAndReplaceOptions: any = { ...options };
    const db = collection._database._name;
    const coll = collection._name;

    if ('returnNewDocument' in findOneAndReplaceOptions) {
      findOneAndReplaceOptions.returnDocument = findOneAndReplaceOptions.returnNewDocument;
      delete findOneAndReplaceOptions.returnNewDocument;
    }

    if (filter === undefined || replacement === undefined) {
      throw new MongoshInvalidInputError('Cannot pass an undefined argument to an update command');
    }

    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'findOneAndReplace',
        class: 'Collection',
        db,
        coll,
        arguments: { filter, findOneAndReplaceOptions }
      }
    );

    const result = await this.serviceProvider.findOneAndReplace(
      db,
      coll,
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
  async collection_findOneAndUpdate(collection, filter, update, options = {}): Promise<any> {
    const findOneAndUpdateOptions: any = { ...options };
    const db = collection._database._name;
    const coll = collection._name;

    if ('returnNewDocument' in findOneAndUpdateOptions) {
      findOneAndUpdateOptions.returnDocument = findOneAndUpdateOptions.returnNewDocument;
      delete findOneAndUpdateOptions.returnNewDocument;
    }

    if (filter === undefined || update === undefined) {
      throw new MongoshInvalidInputError('Cannot pass an undefined argument to an update command');
    }

    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'findOneAndUpdate',
        class: 'Collection',
        db,
        coll,
        arguments: { filter, findOneAndUpdateOptions }
      }
    );

    const result = await this.serviceProvider.findOneAndUpdate(
      db,
      coll,
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
   * @param {Collection} collection
   * @param {Object|Array} docs
   * @param {Object} options
   *    <writeConcern, ordered>
   * @return {InsertManyResult}
   */
  async collection_insert(collection, docs, options: any = {}): Promise<any> {
    const d = Object.prototype.toString.call(docs) === '[object Array]' ? docs : [docs];
    const dbOptions: DatabaseOptions = {};
    const db = collection._database._name;
    const coll = collection._name;

    if ('writeConcern' in options) {
      Object.assign(dbOptions, options.writeConcern);
    }
    if (docs === undefined) {
      throw new MongoshInvalidInputError('Cannot pass an undefined argument to an update command');
    }

    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'insert',
        class: 'Collection',
        db, coll, arguments: { options }
      }
    );

    const result = await this.serviceProvider.insertMany(
      db,
      coll,
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
  async collection_insertMany(collection, docs, options: any = {}): Promise<any> {
    const dbOptions: DatabaseOptions = {};
    const db = collection._database._name;
    const coll = collection._name;

    if (docs === undefined) {
      throw new MongoshInvalidInputError('Cannot pass an undefined argument to an update command');
    }
    if ('writeConcern' in options) {
      Object.assign(dbOptions, options.writeConcern);
    }

    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'insertMany',
        class: 'Collection',
        db, coll, arguments: { options }
      }
    );

    const result = await this.serviceProvider.insertMany(
      db,
      coll,
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
  async collection_insertOne(collection, doc, options: any = {}): Promise<any> {
    const dbOptions: DatabaseOptions = {};
    const db = collection._database._name;
    const coll = collection._name;

    if (doc === undefined) {
      throw new MongoshInvalidInputError('Cannot pass an undefined argument to an update command');
    }
    if ('writeConcern' in options) {
      Object.assign(dbOptions, options.writeConcern);
    }

    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'insertOne',
        class: 'Collection',
        db, coll, arguments: { options }
      }
    );

    const result = await this.serviceProvider.insertOne(
      db,
      coll,
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
  collection_isCapped(collection): Promise<any> {
    const db = collection._database._name;
    const coll = collection._name;
    this.messageBus.emit(
      'mongosh:api-call',
      { method: 'isCapped', class: 'Collection', db, coll }
    );

    return this.serviceProvider.isCapped(db, coll);
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
  collection_remove(collection, query, options: any = {}): Promise<any> {
    const dbOptions: DatabaseOptions = {};
    const db = collection._database._name;
    const coll = collection._name;

    if (query === undefined) {
      throw new MongoshInvalidInputError('Cannot pass an undefined argument to an update command');
    }
    if ('writeConcern' in options) {
      Object.assign(dbOptions, options.writeConcern);
    }

    let removeOptions: any = {};
    if (typeof options === 'boolean') {
      removeOptions.justOne = options;
    } else {
      removeOptions = options;
    }

    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'remove',
        class: 'Collection',
        db, coll, arguments: { query, removeOptions }
      }
    );

    return this.serviceProvider.remove(
      db,
      coll,
      query,
      removeOptions,
      dbOptions
    );
  }

  // TODO
  collection_save(collection, doc, options: any = {}): Promise<any> {
    const dbOptions: DatabaseOptions = {};
    const db = collection._database._name;
    const coll = collection._name;
    if (doc === undefined) {
      throw new MongoshInvalidInputError('Cannot pass an undefined argument to an update command');
    }
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'save',
        class: 'Collection',
        db, coll, arguments: { options }
      }
    );

    if ('writeConcern' in options) {
      Object.assign(dbOptions, options.writeConcern);
    }

    return this.serviceProvider.save(db, coll, doc, options, dbOptions);
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
  async collection_replaceOne(collection, filter, replacement, options: any = {}): Promise<any> {
    const dbOptions: DatabaseOptions = {};
    const db = collection._database._name;
    const coll = collection._name;
    if (filter === undefined) {
      throw new MongoshInvalidInputError('Cannot pass an undefined argument to an update command');
    }
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'replaceOne',
        class: 'Collection',
        db, coll, arguments: { filter, options }
      }
    );


    if ('writeConcern' in options) {
      Object.assign(dbOptions, options.writeConcern);
    }
    const result = await this.serviceProvider.replaceOne(
      db,
      coll,
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

  async collection_update(collection, filter, update, options: any = {}): Promise<any> {
    const db = collection._database._name;
    const coll = collection._name;
    if (filter === undefined) {
      throw new MongoshInvalidInputError('Cannot pass an undefined argument to an update command');
    }
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'update',
        class: 'Collection',
        db, coll, arguments: { filter, options }
      }
    );

    let result;

    if (options.multi) {
      result = await this.serviceProvider.updateMany(
        db,
        coll,
        filter,
        update,
        options,
      );
    } else {
      result = await this.serviceProvider.updateOne(
        db,
        coll,
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
  async collection_updateMany(collection, filter, update, options: any = {}): Promise<any> {
    if (filter === undefined) {
      throw new MongoshInvalidInputError('Cannot pass an undefined argument to an update command');
    }
    const dbOptions: DatabaseOptions = {};
    const db = collection._database._name;
    const coll = collection._name;
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'updateMany',
        class: 'Collection',
        db, coll, arguments: { filter, options }
      }
    );

    if ('writeConcern' in options) {
      Object.assign(dbOptions, options.writeConcern);
    }
    const result = await this.serviceProvider.updateMany(
      db,
      coll,
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
  async collection_updateOne(
    collection: Collection,
    filter: Document,
    update: Document,
    options: Document = {}
  ): Promise<any> {
    if (filter === undefined) {
      throw new MongoshInvalidInputError('Cannot pass an undefined argument to an update command');
    }
    this._emitCollectionApiCall(collection, 'updateOne', { filter, options });

    const dbOptions: DatabaseOptions = {};

    if ('writeConcern' in options) {
      Object.assign(dbOptions, options.writeConcern);
    }

    const result = await this.serviceProvider.updateOne(
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
  async collection_convertToCapped(collection: Collection, size: number): Promise<any> {
    const db = collection._database._name;
    const coll = collection._name;
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'convertToCapped',
        class: 'Collection',
        db, coll, arguments: { size }
      }
    );

    return await this.serviceProvider.convertToCapped(
      db,
      coll,
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
  async collection_createIndexes(
    collection: Collection,
    keyPatterns: Document[],
    options: Document = {}
  ): Promise<any> {
    if (keyPatterns === undefined) {
      throw new MongoshInvalidInputError('Cannot pass an undefined argument to an update command');
    }
    const db = collection._database._name;
    const coll = collection._name;

    if (typeof options !== 'object' || Array.isArray(options)) {
      throw new MongoshInvalidInputError('The "options" argument must be an object.');
    }

    const specs = keyPatterns.map((pattern) => ({
      ...options, key: pattern
    }));

    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'createIndexes',
        class: 'Collection',
        db, coll, arguments: { specs }
      }
    );

    return await this.serviceProvider.createIndexes(db, coll, specs);
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
  async collection_createIndex(
    collection: Collection,
    keys: Document,
    options: Document = {}
  ): Promise<any> {
    if (keys === undefined) {
      throw new MongoshInvalidInputError('Cannot pass an undefined argument to an update command');
    }
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'createIndex',
        class: 'Collection',
        db: collection._database._name,
        coll: collection._name,
        arguments: { keys, options }
      }
    );

    return await this.collection_createIndexes(
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
  async collection_ensureIndex(
    collection: Collection,
    keys: Document,
    options: Document
  ): Promise<any> {
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'ensureIndex',
        class: 'Collection',
        db: collection._database._name,
        coll: collection._name,
        arguments: { keys, options }
      }
    );

    return await this.collection_createIndex(
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
  async collection_getIndexes(
    collection: Collection,
  ): Promise<any> {
    const db = collection._database._name;
    const coll = collection._name;

    this.messageBus.emit(
      'mongosh:api-call',
      { method: 'getIndexes', class: 'Collection', db, coll }
    );

    return await this.serviceProvider.getIndexes(db, coll);
  }

  /**
   * Returns an array that holds a list of documents that identify and
   * describe the existing indexes on the collection. (alias for getIndexes)
   *
   * @param {Collection} collection
   *
   * @return {Promise}
   */
  async collection_getIndexSpecs(
    collection: Collection,
  ): Promise<any> {
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'getIndexSpecs',
        class: 'Collection',
        db: collection._database._name,
        coll: collection._name
      }
    );

    return await this.collection_getIndexes(collection);
  }

  /**
   * Returns an array that holds a list of documents that identify and
   * describe the existing indexes on the collection. (alias for getIndexes)
   *
   * @param {Collection} collection
   *
   * @return {Promise}
   */
  async collection_getIndices(
    collection: Collection,
  ): Promise<any> {
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'getIndices',
        class: 'Collection',
        db: collection._database._name,
        coll: collection._name
      }
    );

    return await this.collection_getIndexes(collection);
  }

  /**
   * Returns an array of key patterns for the indexes defined on the collection.
   *
   * @param {Collection} collection
   *
   * @return {Promise}
   */
  async collection_getIndexKeys(
    collection: Collection,
  ): Promise<any> {
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'getIndexKeys',
        class: 'Collection',
        db: collection._database._name,
        coll: collection._name
      }
    );

    return (await this.collection_getIndexes(collection)).map(i => i.key);
  }

  /**
   * Drops the specified index or indexes (except the index on the _id field)
   * from a collection.
   *
   * @param {Collection} collection
   * @param {string|string[]|Object|Object[]} indexes the indexes to be removed.
   * @return {Promise}
   */
  async collection_dropIndexes(
    collection: Collection,
    indexes: string|string[]|Document|Document[]
  ): Promise<any> {
    if (indexes === undefined) {
      throw new MongoshInvalidInputError('Cannot pass an undefined argument to an update command');
    }
    const db = collection._database._name;
    const coll = collection._name;
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'dropIndexes',
        class: 'Collection',
        db, coll, arguments: { indexes }
      }
    );

    try {
      return await this.serviceProvider.dropIndexes(db, coll, indexes);
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
  async collection_dropIndex(
    collection: Collection,
    index: string|Document
  ): Promise<any> {
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'dropIndex',
        class: 'Collection',
        db: collection._database._name,
        coll: collection._name,
        arguments: { index }
      }
    );

    if (index === '*') {
      throw new MongoshInvalidInputError('To drop indexes in the collection using \'*\', use db.collection.dropIndexes().');
    }

    if (Array.isArray(index)) {
      throw new MongoshInvalidInputError('The index to drop must be either the index name or the index specification document.');
    }

    return await this.collection_dropIndexes(collection, index);
  }

  /**
   * Returns the total size of all indexes for the collection.
   *
   * @param {Collection} collection
   * @return {Promise}
   */
  async collection_totalIndexSize(
    collection: Collection,
    ...args: any[]
  ): Promise<any> {
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'totalIndexSize',
        class: 'Collection',
        db: collection._database._name,
        coll: collection._name
      }
    );

    if (args.length) {
      throw new MongoshInvalidInputError(
        '"totalIndexSize" takes no argument. Use db.collection.stats to get detailed information.'
      );
    }

    const stats = await this.collection_stats(collection);

    return stats.totalIndexSize;
  }

  /**
   * Drops and recreate indexes for a collection.
   *
   * @param {Collection} collection
   * @return {Promise}
   */
  async collection_reIndex(
    collection: Collection
  ): Promise<any> {
    const db = collection._database._name;
    const coll = collection._name;
    this.messageBus.emit(
      'mongosh:api-call',
      { method: 'reIndex', class: 'Collection', db, coll }
    );

    return await this.serviceProvider.reIndex(db, coll);
  }

  /**
   * Returns the collection database.
   *
   * @param {Collection} collection
   * @return {Database}
   */
  collection_getDB(
    collection: Collection
  ): Database {
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'getDB',
        class: 'Collection',
        db: collection._database._name,
        coll: collection._name
      }
    );

    return collection._database;
  }

  /**
   * Get all the collection statistics.
   *
   * @param {Collection} collection - The collection name.
   * @param {Object} options - The stats options.
   * @return {Promise} returns Promise
   */
  async collection_stats(
    collection: Collection,
    options: Document = {}
  ): Promise<any> {
    const db = collection._database._name;
    const coll = collection._name;
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'stats',
        class: 'Collection',
        db, coll, arguments: { options }
      }
    );

    return await this.serviceProvider.stats(db, coll, options);
  }

  /**
   * Get the collection dataSize.
   *
   * @param {Collection} collection - The collection name.
   * @return {Promise} returns Promise
   */
  async collection_dataSize(
    collection: Collection,
  ): Promise<any> {
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'dataSize',
        class: 'Collection',
        db: collection._database._name,
        coll: collection._name
      }
    );

    return (await this.collection_stats(collection)).size;
  }

  /**
   * Get the collection storageSize.
   *
   * @param {Collection} collection - The collection name.
   * @return {Promise} returns Promise
   */
  async collection_storageSize(
    collection: Collection,
  ): Promise<any> {
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'storageSize',
        class: 'Collection',
        db: collection._database._name,
        coll: collection._name
      }
    );

    return (await this.collection_stats(collection)).storageSize;
  }

  /**
   * Get the collection totalSize.
   *
   * @param {Collection} collection - The collection.
   * @return {Promise} returns Promise
   */
  async collection_totalSize(
    collection: Collection,
  ): Promise<any> {
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'totalSize',
        class: 'Collection',
        db: collection._database._name,
        coll: collection._name
      }
    );

    const stats = await this.collection_stats(collection);
    return (stats.storageSize || 0) + (stats.totalIndexSize || 0);
  }

  /**
   * Drop a collection.
   *
   * @param {Collection} collection - The collection.
   * @return {Promise} returns Promise
   */
  async collection_drop(
    collection: Collection,
  ): Promise<boolean> {
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'drop',
        class: 'Collection',
        db: collection._database._name,
        coll: collection._name
      }
    );

    try {
      return await this.serviceProvider.dropCollection(
        collection._database._name,
        collection._name
      );
    } catch (error) {
      if (error.codeName === 'NamespaceNotFound') {
        this.messageBus.emit(
          'mongosh:warn',
          {
            method: 'drop',
            class: 'Collection',
            message: `Namespace not found: ${collection._name}`
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
   * @param {Collection} collection - The collection name.
   * @return {Promise} returns Promise
   */
  async collection_exists(collection: Collection): Promise<any> {
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'exists',
        class: 'Collection',
        db: collection._database._name,
        coll: collection._name
      }
    );

    const collectionInfos = await this.serviceProvider.listCollections(
      collection._database._name,
      {
        name: collection._name
      }
    );

    return collectionInfos[0] || null;
  }

  collection_getFullName(collection: Collection): string {
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'getFullName',
        class: 'Collection',
        db: collection._database._name,
        coll: collection._name
      }
    );

    return `${collection._database._name}.${collection._name}`;
  }

  collection_getName(collection: Collection): string {
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'getName',
        class: 'Collection',
        db: collection._database._name,
        coll: collection._name
      }
    );

    return `${collection._name}`;
  }

  async collection_runCommand(
    collection: Collection,
    commandName: string,
    options?: Document
  ): Promise<any> {
    if (typeof commandName !== 'string') {
      throw new MongoshInvalidInputError('The "commandName" argument must be a string.');
    }

    if (options && commandName in options) {
      throw new MongoshInvalidInputError('The "commandName" argument cannot be passed as an option to "runCommand".');
    }

    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'runCommand',
        class: 'Collection',
        db: collection._database._name,
        coll: collection._name,
        arguments: { commandName }
      }
    );

    return await this.database_runCommand(
      collection._database,
      {
        ...options,
        [commandName]: collection._name
      }
    );
  }

  private _validateExplainableVerbosity(verbosity: string): void {
    const allowedVerbosity = [
      'queryPlanner',
      'executionStats',
      'allPlansExecution'
    ];

    if (!allowedVerbosity.includes(verbosity)) {
      throw new MongoshInvalidInputError(
        `verbosity can only be one of ${allowedVerbosity.join(', ')}. Received ${verbosity}.`
      );
    }
  }

  collection_explain(collection: Collection, verbosity = 'queryPlanner'): Explainable {
    this._validateExplainableVerbosity(verbosity);

    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'explain',
        class: 'Collection',
        db: collection._database._name,
        coll: collection._name,
        arguments: { verbosity }
      }
    );

    return new Explainable(this, collection, verbosity);
  }

  explainable_getCollection(explainable: Explainable): Collection {
    this._emitExplainableApiCall(explainable, 'getCollection');

    return explainable._collection;
  }

  explainable_getVerbosity(explainable: Explainable): string {
    this._emitExplainableApiCall(explainable, 'getVerbosity');

    return explainable._verbosity;
  }

  explainable_setVerbosity(explainable: Explainable, verbosity: string): void {
    this._validateExplainableVerbosity(verbosity);

    this._emitExplainableApiCall(explainable, 'setVerbosity', { verbosity });

    explainable._verbosity = verbosity;
  }

  // TODO: turn this into proper types and constructors in shell api.
  private _makeExplainableCursor<T extends AggregationCursor|Cursor>(
    cursor: T,
    verbosity?: string
  ): T {
    cursor.shellApiType = (): string => 'ExplainableCursor';
    cursor.toReplString = (): Promise<any> => {
      return cursor.explain(verbosity);
    };

    return cursor;
  }

  explainable_find(explainable: Explainable, query?: any, projection?: any): Cursor {
    this._emitExplainableApiCall(explainable, 'find', { query, projection });

    // TODO: turn ExplainableCursor in a proper type.
    const cursor = explainable._collection.find(query, projection) as Cursor;
    return this._makeExplainableCursor(
      cursor,
      explainable._verbosity
    );
  }

  async explainable_aggregate(explainable: Explainable, pipeline?: any, options?: any): Promise<any> {
    this._emitExplainableApiCall(explainable, 'aggregate', { pipeline, options });

    const cursor = await explainable._collection.aggregate(pipeline, {
      ...options,
      explain: false
    }) as AggregationCursor;

    return await cursor.explain(explainable._verbosity);
  }

  database_getSiblingDB(database: Database, name: string): Database {
    return this._getDatabase(name);
  }

  database_getCollection(database: Database, name: string): Collection {
    if (typeof name !== 'string') {
      throw new MongoshInvalidInputError(
        `Collection name must be a string. Received ${typeof name}.`);
    }

    if (!name.trim()) {
      throw new MongoshInvalidInputError('Collection name cannot be empty.');
    }

    const collections: Record<string, Collection> = (database as any)._collections;

    if (!collections[name]) {
      collections[name] = new Collection(this, database, name);
    }

    return collections[name];
  }

  async database_dropDatabase(database: Database, writeConcern?: WriteConcern): Promise<any> {
    return await this.serviceProvider.dropDatabase(
      database._name,
      writeConcern
    );
  }
}
