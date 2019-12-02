const {
  AggregationCursor,
  BulkWriteResult,
  Cursor,
  Database,
  DeleteResult,
  InsertManyResult,
  InsertOneResult,
  UpdateResult
} = require('mongosh-shell-api');

class Mapper {
  constructor(serviceProvider) {
    this._serviceProvider = serviceProvider;
  }

  setCtx(ctx) {
    this._ctx = ctx;
    this._ctx.db = new Database(this, 'test');
  };


  use(_, db) {
    this._ctx.db = new Database(this, db);
    return `switched to db ${db}`;
  };

  /**
   * Run an aggregation pipeline.
   * TODO: In the mongo shell, if the cursor returned from the db.collection.aggregate() is not assigned to a variable using the var keyword, then the mongo shell automatically iterates the cursor up to 20 times. See Iterate a Cursor in the mongo Shell for handling cursors in the mongo shell.
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
  aggregate(collection, pipeline, options) {
    const db = collection.database;
    const coll = collection.collection;

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

    return cursor;
  };

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
  bulkWrite(collection, operations, options) {
    const dbOptions = {};
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    return new BulkWriteResult(
      this,
      this._serviceProvider.bulkWrite(
        collection.database,
        collection.collection,
        operations,
        options,
        dbOptions
      )
    );
  };

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
  count(collection, query, options) {
    const dbOpts = {};
    if ('readConcern' in options) {
      dbOpts.readConcern = options.readConcern;
    }
    return this._serviceProvider.count(
      collection.database,
      collection.collection,
      query,
      options,
      dbOpts
    );
  };

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
  countDocuments(collection, query, options) {
    return this._serviceProvider.countDocuments(
      collection.database,
      collection.collection,
      query,
      options
    )
  };

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
   * @returns {Promise} The promise of the result.
   */
  deleteMany(collection, filter, options) {
    const dbOptions = {};
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    return new DeleteResult(
      this,
      this._serviceProvider.deleteMany(
        collection.database,
        collection.collection,
        filter,
        options,
        dbOptions
      )
    );
  };

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
  deleteOne(collection, filter, options) {
    const dbOptions = {};
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    return new DeleteResult(
      this,
      this._serviceProvider.deleteOne(
        collection.database,
        collection.collection,
        filter,
        options,
        dbOptions
      )
    );
  };

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
  distinct(collection, field, query, options) {
    return this._serviceProvider.distinct(
      collection.database,
      collection.collection,
      field,
      query,
      options,
    );
  };

  /**
   * Get an estimated document count from the coll.
   *
   * @param {Collection} collection - The collection class.
   * @param {Object} options - The count options.
   *  <maxTimeMS>
   *
   * @returns {Integer} The promise of the count.
   */
  estimatedDocumentCount(collection, options) {
    return this._serviceProvider.estimatedDocumentCount(
      collection.database,
      collection.collection,
      options,
    );
  };

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
    return new Cursor(
      this,
      this._serviceProvider.find(
        collection.database,
        collection.collection,
        query,
        options
      ),
    );
  };

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
        collection.database,
        collection.collection,
        query,
        options
      ),
    ).limit(1);
  };

  // findAndModify(collection, document) {
  //   return this._serviceProvider.findAndModify(
  //     collection.database,
  //     collection.collection,
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
  findOneAndDelete(collection, filter, options) {
    return this._serviceProvider.findOneAndDelete(
      collection.database,
      collection.collection,
      filter,
      options,
    );
  };

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
  findOneAndReplace(collection, filter, replacement, options) {
    const findOneAndReplaceOptions = { ...options };
    if ('returnNewDocument' in findOneAndReplaceOptions) {
      findOneAndReplaceOptions.returnDocument = findOneAndReplaceOptions.returnNewDocument;
      delete findOneAndReplaceOptions.returnNewDocument;
    }
    return this._serviceProvider.findOneAndReplace(
      collection.database,
      collection.collection,
      filter,
      replacement,
      findOneAndReplaceOptions
    );
  };

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
  findOneAndUpdate(collection, filter, update, options) {
    const findOneAndUpdateOptions = { ...options };
    if ('returnNewDocument' in findOneAndUpdateOptions) {
      findOneAndUpdateOptions.returnDocument = findOneAndUpdateOptions.returnNewDocument;
      delete findOneAndUpdateOptions.returnNewDocument;
    }
    return this._serviceProvider.findOneAndUpdate(
      collection.database,
      collection.collection,
      filter,
      update,
      options,
    );
  };

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
  insert(collection, docs, options) {
    const d = Object.prototype.toString.call(docs) === '[object Array]' ? docs : [docs];
    const dbOptions = {};
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    return new InsertManyResult(
      this,
      this._serviceProvider.insertMany(
        collection.database,
        collection.collection,
        d,
        options,
        dbOptions
      )
    );
  };

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
  insertMany(collection, docs, options) {
    const dbOptions = {};
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    return new InsertManyResult(
      this,
      this._serviceProvider.insertMany(
        collection.database,
        collection.collection,
        docs,
        options,
        dbOptions
      )
    );
  };

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
  insertOne(collection, doc, options) {
    const dbOptions = {};
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    return new InsertOneResult(
      this,
      this._serviceProvider.insertOne(
        collection.database,
        collection.collection,
        doc,
        options,
        dbOptions
      )
    );
  };

  /**
   * Is collection capped?
   *
   * @param {Collection} collection
   * @return {Boolean}
   */
  isCapped(collection) {
    return this._serviceProvider.isCapped(
      collection.database,
      collection.collection,
    );
  };

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
  remove(collection, query, options) {
    const dbOptions = {};
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    let removeOptions = {};
    if (typeof options === 'boolean') {
      removeOptions.justOne =  options;
    } else {
      removeOptions = options;
    }
    return this._serviceProvider.remove(
      collection.database,
      collection.collection,
      query,
      removeOptions,
      dbOptions
    );
  };

  // TODO
  save(collection, doc, options) {
    const dbOptions = {};
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    return this._serviceProvider.save(
      collection.database,
      collection.collection,
      doc,
      options,
      dbOptions
    );
  };

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
  replaceOne(collection, filter, replacement, options) {
    const dbOptions = {};
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    return new UpdateResult(
      this,
      this._serviceProvider.replaceOne(
        collection.collection,
        collection.database,
        filter,
        replacement,
        options,
        dbOptions
      )
    );
  };

  /**
   * Run a command against the db.
   *
   * @param {Database} database - the db object.
   * @param {Object} cmd - the command spec.
   *
   * @returns {Promise} The promise of command results. TODO: command result object
   */
  runCommand(database, cmd) {
    return this._serviceProvider.runCommand(database.database, cmd);
  };

  update(collection, filter, update, options) {
    if (options.multi) {
      return this._serviceProvider.updateMany(
        collection.collection,
        collection.database,
        filter,
        update,
        options,
      );
    } else {
      return this._serviceProvider.updateOne(
        collection.collection,
        collection.database,
        filter,
        update,
        options,
      );
    }
  };

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
  updateMany(collection, filter, update, options) {
    const dbOptions = {};
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    return new UpdateResult(
      this,
      this._serviceProvider.updateMany(
        collection.collection,
        collection.database,
        filter,
        update,
        options,
        dbOptions
      )
    );
  };

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
  updateOne(collection, filter, update, options) {
    const dbOptions = {};
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    return new UpdateResult(
      this,
      this._serviceProvider.updateMany(
        collection.collection,
        collection.database,
        filter,
        update,
        options,
        dbOptions
      )
    );
  };
}

module.exports = Mapper;
