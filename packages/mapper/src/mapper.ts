import {
  formatTable,
  formatBytes
} from './format-utils';

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
  CommandResult
} from 'mongosh-shell-api';

export default class Mapper {
  private serviceProvider: any;
  private currentCursor: any;
  private databases: any;

  public context: any;
  public cursorAssigned: any;
  public checkAwait: any;
  public awaitLoc: any;

  constructor(serviceProvider) {
    this.serviceProvider = serviceProvider;
    /* Internal state gets stored in mapper, state that is visible to the user
     * is stored in ctx */
    this.currentCursor = null;
    this.awaitLoc = []; // track locations where await is needed
    this.checkAwait = false;
    this.cursorAssigned = false;
    this.databases = { test: new Database(this, 'test') };
    /* This will be rewritten so it's less fragile */
    const parseStack = (s): number => {
      const r = s.match(/repl:1:(\d*)/);
      return Number(r[1]) - 1;
    };
    const requiresAwait = [
      'deleteOne',
      'insertOne' // etc etc
    ];
    const handler = {
      get: function(obj, prop): any {
        if (obj.checkAwait && requiresAwait.includes(prop)) {
          try {
            throw new Error();
          } catch (e) {
            const loc = parseStack(e.stack);
            if (!isNaN(loc)) {
              obj.awaitLoc.push(loc);
            }
          }
        }
        return obj[prop];
      }
    };
    return new Proxy(this, handler);
  }

  setCtx(ctx): void {
    this.context = ctx;
    this.context.db = this.databases.test;
  }

  use(_, db): any {
    if (!(db in this.databases)) {
      this.databases[db] = new Database(this, db);
    }
    this.context.db = this.databases[db];
    return `switched to db ${db}`;
  }

  async show(_, arg): Promise<any> {
    switch (arg) {
      case 'databases':
      case 'dbs':
        const result = await this.serviceProvider.listDatabases('admin');
        if (!('databases' in result)) {
          throw new Error('Error: invalid result from listDatabases');
        }

        const tableEntries = result.databases.map(
          (db) => [db.name, formatBytes(db.sizeOnDisk)]
        );

        const table = formatTable(tableEntries);

        return new CommandResult({ value: table });
      default:
        throw new Error(`Error: don't know how to show ${arg}`); // TODO: which error obj
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
      const hasNext = await this.currentCursor.hasNext();
      if (hasNext) {
        results.push(await this.currentCursor.next());
      } else {
        break;
      }
    }

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
    const db = collection._database;
    const coll = collection._collection;

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
  async bulkWrite(collection, operations, options: any = {}): Promise<any> {
    const dbOptions: any = {};
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }

    const result = await this.serviceProvider.bulkWrite(
      collection._database,
      collection._collection,
      operations,
      options,
      dbOptions
    );

    // TODO: implement BulkWriteResult and remove ts ignore
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    return new BulkWriteResult(
      result.result.ok // TODO
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
    if ('readConcern' in options) {
      dbOpts.readConcern = options.readConcern;
    }
    return this.serviceProvider.count(
      collection._database,
      collection._collection,
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
    return this.serviceProvider.countDocuments(
      collection._database,
      collection._collection,
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
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }

    const result = await this.serviceProvider.deleteMany(
      collection._database,
      collection._collection,
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
    if (this.checkAwait) return;
    const dbOptions: any = {};
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    const result = await this.serviceProvider.deleteOne(
      collection._database,
      collection._collection,
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
    return this.serviceProvider.distinct(
      collection._database,
      collection._collection,
      field,
      query,
      options,
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
    return this.serviceProvider.estimatedDocumentCount(
      collection._database,
      collection._collection,
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

    if (projection) {
      options.projection = projection;
    }

    this.currentCursor = new Cursor(
      this,
      this.serviceProvider.find(
        collection._database,
        collection._collection,
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
    if (projection) {
      options.projection = projection;
    }
    return new Cursor(
      this,
      this.serviceProvider.find(
        collection._database,
        collection._collection,
        query,
        options
      )
    ).limit(1).next();
  }

  // findAndModify(collection, document) {
  //   return this._serviceProvider.findAndModify(
  //     collection._database,
  //     collection._collection,
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
    const result = await this.serviceProvider.findOneAndDelete(
      collection._database,
      collection._collection,
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
    if ('returnNewDocument' in findOneAndReplaceOptions) {
      findOneAndReplaceOptions.returnDocument = findOneAndReplaceOptions.returnNewDocument;
      delete findOneAndReplaceOptions.returnNewDocument;
    }
    const result = await this.serviceProvider.findOneAndReplace(
      collection._database,
      collection._collection,
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
    if ('returnNewDocument' in findOneAndUpdateOptions) {
      findOneAndUpdateOptions.returnDocument = findOneAndUpdateOptions.returnNewDocument;
      delete findOneAndUpdateOptions.returnNewDocument;
    }
    const result = await this.serviceProvider.findOneAndUpdate(
      collection._database,
      collection._collection,
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
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    const result = await this.serviceProvider.insertMany(
      collection._database,
      collection._collection,
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
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }

    const result = await this.serviceProvider.insertMany(
      collection._database,
      collection._collection,
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
    if (this.checkAwait) return;
    const dbOptions: any = {};
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    const result = await this.serviceProvider.insertOne(
      collection._database,
      collection._collection,
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
    return this.serviceProvider.isCapped(
      collection._database,
      collection._collection,
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
      collection._database,
      collection._collection,
      query,
      removeOptions,
      dbOptions
    );
  }

  // TODO
  save(collection, doc, options: any = {}): Promise<any> {
    const dbOptions: any = {};
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    return this.serviceProvider.save(
      collection._database,
      collection._collection,
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
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    const result = await this.serviceProvider.replaceOne(
      collection._collection,
      collection._database,
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
    return this.serviceProvider.runCommand(database._database, cmd);
  }

  async update(collection, filter, update, options: any = {}): Promise<any> {
    let result;
    if (options.multi) {
      result = await this.serviceProvider.updateMany(
        collection._collection,
        collection._database,
        filter,
        update,
        options,
      );
    } else {
      result = await this.serviceProvider.updateOne(
        collection._collection,
        collection._database,
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
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    const result = await this.serviceProvider.updateMany(
      collection._collection,
      collection._database,
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
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    const result = await this.serviceProvider.updateMany(
      collection._collection,
      collection._database,
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
}
