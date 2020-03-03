const {
  formatTable,
  formatBytes
} = require('./format-utils');

const {
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
} = require('mongosh-shell-api');

class Mapper {
  constructor(serviceProvider) {
    this._serviceProvider = serviceProvider;
    /* Internal state gets stored in mapper, state that is visible to the user
     * is stored in ctx */
    this.currentCursor = null;
    this.awaitLoc = []; // track locations where await is needed
    this.checkAwait = false;
    this.cursorAssigned = false;
    this.databases = { test: new Database(this, 'test') };
    /* This will be rewritten so it's less fragile */
    const parseStack = (s) => {
      const r = s.match(/repl:1:(\d*)/);
      return Number(r[1]) - 1;
    };
    const requiresAwait = [
      'deleteOne',
      'insertOne' // etc etc
    ];
    const handler = {
      get: function(obj, prop) {
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

  setCtx(ctx) {
    this._ctx = ctx;
    this._ctx.db = this.databases.test;
  }

  use(_, db) {
    if (!(db in this.databases)) {
      this.databases[db] = new Database(this, db);
    }
    this._ctx.db = this.databases[db];
    return `switched to db ${db}`;
  }

  async show(_, arg) {
    switch (arg) {
      case 'databases':
      case 'dbs':
        const result = await this._serviceProvider.listDatabases('admin');
        if (!('databases' in result)) {
          throw new Error('Error: invalid result from listDatabases');
        }

        const tableEntries = result.databases.map(
          (db) => [db.name, formatBytes(db.sizeOnDisk)]
        );

        const table = formatTable(tableEntries);

        return new CommandResult({value: table});
      default:
        throw new Error(`Error: don't know how to show ${arg}`); // TODO: which error obj
    }
  }

  async it() {
    const results = new CursorIterationResult();

    if (this.currentCursor && !this.cursorAssigned) {
      for (let i = 0; i < 20; i++) {
        const hasNext = await this.currentCursor.hasNext();
        if (hasNext) {
          results.push(await this.currentCursor.next());
        } else {
          break;
        }
      }

      if (results.length > 0) {return results;}
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
   * @note: Shell API sets explain via options in object, data provider API via
   * cursor.
   * @note: CRUD API provides batchSize and maxAwaitTimeMS which the shell does not.
   *
   *
   * @param {Collection} collection - The collection class.
   * @param {Array} pipeline - The aggregation pipeline.
   * @param {Object} options - The pipeline options.
   *    <explain, allowDiskUse, cursor, maxTimeMS, bypassDocumentValidation,
   *    readConcern, collation, hint, comment, writeConcern>
   *
   * @returns {AggregationCursor} The promise of the aggregation cursor.
   */
  aggregate(collection, pipeline, options = {}) {
    const db = collection._database;
    const coll = collection._collection;

    const dbOptions = {};
    if ('readConcern' in options) {
      dbOptions.readConcern = options.readConcern;
    }
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }

    let cmd;
    if (coll === null) {
      cmd = this._serviceProvider.aggregateDb(
        db,
        pipeline,
        options,
        dbOptions
      );
    } else {
      cmd = this._serviceProvider.aggregate(
        db,
        coll,
        pipeline,
        options,
        dbOptions
      );
    }

    const cursor = new AggregationCursor(this, cmd);

    if ('explain' in options) {
      return cursor.explain(options.explain);
    }

    return this.currentCursor = cursor;
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
  async bulkWrite(collection, operations, options = {}) {
    const dbOptions = {};
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }

    const result = await this._serviceProvider.bulkWrite(
      collection._database,
      collection._collection,
      operations,
      options,
      dbOptions
    );

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
  count(collection, query = {}, options = {}) {
    const dbOpts = {};
    if ('readConcern' in options) {
      dbOpts.readConcern = options.readConcern;
    }
    return this._serviceProvider.count(
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
  countDocuments(collection, query, options = {}) {
    return this._serviceProvider.countDocuments(
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
  async deleteMany(collection, filter, options = {}) {
    const dbOptions = {};
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }

    const result = await this._serviceProvider.deleteMany(
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
  async deleteOne(collection, filter, options = {}) {
    if (this.checkAwait) return;
    const dbOptions = {};
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    const result = await this._serviceProvider.deleteOne(
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
  distinct(collection, field, query, options = {}) {
    return this._serviceProvider.distinct(
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
  estimatedDocumentCount(collection, options = {}) {
    return this._serviceProvider.estimatedDocumentCount(
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
  find(collection, query, projection) {
    const options = {};
    if (projection) {
      options.projection = projection;
    }
    return this.currentCursor = new Cursor(
      this,
      this._serviceProvider.find(
        collection._database,
        collection._collection,
        query,
        options
      )
    );
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
  findOne(collection, query, projection) {
    const options = {};
    if (projection) {
      options.projection = projection;
    }
    return new Cursor(
      this,
      this._serviceProvider.find(
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
  async findOneAndDelete(collection, filter, options = {}) {
    const result = await this._serviceProvider.findOneAndDelete(
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
  async findOneAndReplace(collection, filter, replacement, options = {}) {
    const findOneAndReplaceOptions = { ...options };
    if ('returnNewDocument' in findOneAndReplaceOptions) {
      findOneAndReplaceOptions.returnDocument = findOneAndReplaceOptions.returnNewDocument;
      delete findOneAndReplaceOptions.returnNewDocument;
    }
    const result = await this._serviceProvider.findOneAndReplace(
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
  async findOneAndUpdate(collection, filter, update, options = {}) {
    const findOneAndUpdateOptions = { ...options };
    if ('returnNewDocument' in findOneAndUpdateOptions) {
      findOneAndUpdateOptions.returnDocument = findOneAndUpdateOptions.returnNewDocument;
      delete findOneAndUpdateOptions.returnNewDocument;
    }
    const result = await this._serviceProvider.findOneAndUpdate(
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
  async insert(collection, docs, options = {}) {
    const d = Object.prototype.toString.call(docs) === '[object Array]' ? docs : [docs];
    const dbOptions = {};
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    const result = await this._serviceProvider.insertMany(
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
  async insertMany(collection, docs, options = {}) {
    const dbOptions = {};
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }

    const result = await this._serviceProvider.insertMany(
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
  async insertOne(collection, doc, options = {}) {
    if (this.checkAwait) return;
    const dbOptions = {};
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    const result = await this._serviceProvider.insertOne(
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
  isCapped(collection) {
    return this._serviceProvider.isCapped(
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
  remove(collection, query, options = {}) {
    const dbOptions = {};
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    let removeOptions = {};
    if (typeof options === 'boolean') {
      removeOptions.justOne = options;
    } else {
      removeOptions = options;
    }
    return this._serviceProvider.remove(
      collection._database,
      collection._collection,
      query,
      removeOptions,
      dbOptions
    );
  }

  // TODO
  save(collection, doc, options = {}) {
    const dbOptions = {};
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    return this._serviceProvider.save(
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
  async replaceOne(collection, filter, replacement, options = {}) {
    const dbOptions = {};
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    const result = await this._serviceProvider.replaceOne(
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
  runCommand(database, cmd) {
    return this._serviceProvider.runCommand(database._database, cmd);
  }

  async update(collection, filter, update, options = {}) {
    let result;
    if (options.multi) {
      result = await this._serviceProvider.updateMany(
        collection._collection,
        collection._database,
        filter,
        update,
        options,
      );
    } else {
      result = await this._serviceProvider.updateOne(
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
  async updateMany(collection, filter, update, options = {}) {
    const dbOptions = {};
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    const result = await this._serviceProvider.updateMany(
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
  async updateOne(collection, filter, update, options = {}) {
    const dbOptions = {};
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    const result = await this._serviceProvider.updateMany(
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

module.exports = Mapper;
