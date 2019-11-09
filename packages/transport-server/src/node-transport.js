const { MongoClient } = require('mongodb');

/**
 * Default driver options we always use.
 */
const DEFAULT_OPTIONS = Object.freeze({
  useNewUrlParser: true,
  useUnifiedTopology: true
});

/**
 * Encapsulates logic for communicating with a MongoDB instance via
 * the Node Driver.
 */
class NodeTransport {
  /**
   * Create a NodeTransport from a URI.
   *
   * @param {String} uri - The URI.
   *
   * @returns {NodeTransport} The Node transport.
   */
  static async fromURI(uri) {
    const mongoClient = new MongoClient(uri, DEFAULT_OPTIONS);
    await mongoClient.connect();
    return new NodeTransport(mongoClient);
  }

  /**
   * Instantiate a new Node transport with the Node driver's connected
   * MongoClient instance.
   *
   * @param {MongoClient} mongoClient - The Node drivers' MongoClient instance.
   */
  constructor(mongoClient) {
    this.mongoClient = mongoClient;
  }

  /**
   * Run an aggregation pipeline.
   *
   * @note: Passing a null collection will cause the
   *   aggregation to run on the DB.
   *
   * @note: Shell API sets writeConcern via options in object,
   * node driver flat.
   * @note: Shell API sets readConcern via options in object,
   * node driver flat.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Array} pipeline - The aggregation pipeline.
   * @param {Object} options - The pipeline options.
   *
   * @returns {Promise} The promise of the aggregation cursor.
   */
  aggregate(database, collection, pipeline = [], options = {}) {
    const dbOptions = {};
    if ('readConcern' in options) {
      dbOptions.readConcern = options.readConcern;
    }
    if ('writeConcern' in options) {
      dbOptions.writeConcern = options.writeConcern;
    }
    if (collection === null) {
      return this._db(database, dbOptions).aggregate(pipeline, options);
    }
    return this._db(database, dbOptions).collection(collection).
      aggregate(pipeline, options);
  }

  /**
   * Execute a mix of write operations.
   *
   * @note: Shell API sets writeConcern via options in object,
   * node driver flat.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} requests - The bulk write requests.
   * @param {Object} options - The bulk write options.
   *
   * @returns {Promise} The promise of the result.
   */
  bulkWrite(database, collection, requests = {}, options = {}) {
    const bulkOptions = {};
    if ('writeConcern' in options) {
      Object.assign(bulkOptions, options.writeConcern);
    }
    if ('ordered' in options) {
      bulkOptions.ordered = options.ordered;
    }
    return this._db(database).collection(collection).
      bulkWrite(requests, options);
  }

  /**
   * Deprecated count command.
   *
   * @note: Shell API passes readConcern via options, node via collection
   * @note: Shell API passes collation as option, node driver via cursor.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} query - The filter.
   * @param {Object} options - The count options.
   *
   * @returns {Promise} The promise of the count.
   */
  count(database, collection, query = {}, options = {}) {
    const collOpts = {};
    if ('readConcern' in options) {
      collOpts.readConcern = options.readConcern;
    }
    const cursor = this._db(database).collection(collection, collOpts).count(query)
    if ('collation' in options) {
      return cursor.collation(options.collation);
    }
    return cursor;
  }

  /**
   * Get an exact document count from the collection.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} filter - The filter.
   * @param {Object} options - The count options.
   *
   * @returns {Promise} The promise of the count.
   */
  countDocuments(database, collection, filter = {}, options = {}) {
    return this._db(database).collection(collection).
      countDocuments(filter, options);
  }

  /**
   * Delete multiple documents from the collection.
   *
   * @note: Shell API sets writeConcern via options in object,
   * node driver flat.
   * @note: Shell API passes collation as option, node driver via cursor.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} filter - The filter.
   * @param {Object} options - The delete many options.
   *
   * @returns {Promise} The promise of the result.
   */
  deleteMany(database, collection, filter = {}, options = {}) {
    const cmdOpts = {};
    if ('writeConcern' in options) {
      Object.assign(cmdOpts, options.writeConcern);
    }
    const cursor = this._db(database).collection(collection).
      deleteMany(filter, cmdOpts);

    if ('collation' in options) {
      return cursor.collation(options.collation);
    }
    return cursor;
  }

  /**
   * Delete one document from the collection.
   *
   * @note: Shell API sets writeConcern via options in object,
   * node driver flat.
   * @note: Shell API passes collation as option, node driver via cursor.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} filter - The filter.
   * @param {Object} options - The delete one options.
   *
   * @returns {Promise} The promise of the result.
   */
  deleteOne(database, collection, filter = {}, options = {}) {
    const cmdOpts = {};
    if ('writeConcern' in options) {
      Object.assign(cmdOpts, options.writeConcern);
    }
    const cursor = this._db(database).collection(collection).
      deleteOne(filter, cmdOpts);
    if ('collation' in options) {
      return cursor.collation(options.collation);
    }
    return cursor;
  }

  /**
   * Get distinct values for the field.
   *
   * @note: Shell API passes collation as option, node driver via cursor.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {String} fieldName - The field name.
   * @param {Object} filter - The filter.
   * @param {Object} options - The distinct options.
   *
   * @returns {Promise} The promise of the cursor.
   */
  distinct(database, collection, fieldName, filter = {}, options = {}) {
    const cursor = this._db(database).collection(collection).
      distinct(fieldName, filter, options);

    if ('collation' in cursor) {
      return cursor.collation(options.collation);
    }
    return cursor;
  }

  /**
   * Get an estimated document count from the collection.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} options - The count options.
   *
   * @returns {Promise} The promise of the count.
   */
  estimatedDocumentCount(database, collection, options = {}) {
    return this._db(database).collection(collection).
      estimatedDocumentCount(options);
  }

  /**
   * Find documents in the collection.
   *
   * @note: Shell API passes filter and projection to find,
   * node driver uses filter and options.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} filter - The filter.
   * @param {Object} projection - The projection.
   *
   * @returns {Promise} The promise of the cursor.
   */
  find(database, collection, filter = {}, projection = {}) {
    const options = {};
    if (projection) {
      options.projection = projection;
    }
    return this._db(database).collection(collection).
      find(filter, options);
  }

  /**
   * Find one document and delete it.
   *
   * @note: Shell API passes collation as option, node driver via cursor.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} filter - The filter.
   * @param {Object} options - The find options.
   *
   * @returns {Promise} The promise of the result.
   */
  findOneAndDelete(database, collection, filter = {}, options = {}) {
    const cursor = this._db(database).collection(collection).
      findOneAndDelete(filter, options);
    if ('collation' in options) {
      return cursor.collation(options.collation);
    }
    return cursor;
  }

  /**
   * Find one document and replace it.
   *
   * @note: Shell API passes collation as option, node driver via cursor.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} filter - The filter.
   * @param {Object} replacement - The replacement.
   * @param {Object} options - The find options.
   *
   * @returns {Promise} The promise of the result.
   */
  findOneAndReplace(database, collection, filter = {}, replacement = {}, options = {}) {
    const cursor = this._db(database).collection(collection).
      findOneAndReplace(filter, replacement, options);

    if ('collation' in options) {
      return cursor.collation(options.collation);
    }
    return cursor;
  }

  /**
   * Find one document and update it.
   *
   * @note: Shell API passes collation as option, node driver via cursor.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} filter - The filter.
   * @param {(Object|Array)} update - The update.
   * @param {Object} options - The find options.
   *
   * @returns {Promise} The promise of the result.
   */
  findOneAndUpdate(database, collection, filter = {}, update = {}, options = {}) {
    const cursor = this._db(database).collection(collection).
      findOneAndUpdate(filter, update, options);

    if ('collation' in options) {
      return cursor.collation(options.collation);
    }
    return cursor;
  }

  /**
   * Insert many documents into the collection.
   *
   * @note: Shell API sets writeConcern via options in object,
   * node driver flat.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Array} docs - The documents.
   * @param {Object} options - The insert many options.
   *
   * @returns {Promise} The promise of the result.
   */
  insertMany(database, collection, docs = [], options = {}) {
    const cmdOpts = {};

    if ('writeConcern' in options) {
      Object.assign(cmdOpts, options.writeConcern);
    }
    if ('ordered' in options) {
      cmdOpts.ordered = options.ordered;
    }

    return this._db(database).collection(collection).
      insertMany(docs, cmdOpts);
  }

  /**
   * Insert one document into the collection.
   *
   * @note: Shell API sets writeConcern via options in object,
   * node driver flat.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} doc - The document.
   * @param {Object} options - The insert one options.
   *
   * @returns {Promise} The promise of the result.
   */
  insertOne(database, collection, doc = {}, options = {}) {
    const cmdOpts = {};

    if ('writeConcern' in options) {
      Object.assign(cmdOpts, options.writeConcern);
    }
    return this._db(database).collection(collection).
      insertOne(doc, options);
  }

  /**
   * Is the collection capped?
   *
   * @param database
   * @param collection
   * @return {Promise}
   */
  isCapped(database, collection) {
    return this._db(database).collection(collection).isCapped();
  }

  /**
   * Deprecated remove command.
   *
   * @note: Shell API sets writeConcern via options in object,
   * node driver flat.
   * @note: Shell API passes collation as option, node driver via cursor.
   *
   * @param database
   * @param collection
   * @param query
   * @param options
   * @return {Promise}
   */
  remove(database, collection, query, options) {
    let removeOptions = {};
    if (typeof options === 'boolean') {
      removeOptions = { single: options };
    }
    if ('writeConcern' in options) {
      Object.assign(removeOptions, options.writeConcern);
    }

    const cursor = this._db(database).collection(collection).remove(query, options);
    if ('collation' in options) {
      return cursor.collation(options.collation);
    }
    return cursor;
  }

  /**
   * Deprecated save command.
   *
   * @note: Shell API sets writeConcern via options in object,
   * node driver flat.
   *
   * @param database
   * @param collection
   * @param doc
   * @param options
   * @return {Promise}
   */
  save(database, collection, doc, options) {
    const saveOptions = {};
    if ('writeConcern' in options) {
      Object.assign(saveOptions, options.writeConcern);
    }
    return this._db(database).collection(collection).save(doc, saveOptions);
  }

  /**
   * Replace a document with another.
   *
   * @note: Shell API sets writeConcern via options in object,
   * node driver flat.
   * @note: Shell API sets collation via options, node driver via cursor.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} filter - The filter.
   * @param {Object} replacement - The replacement document for matches.
   * @param {Object} options - The replace options.
   *
   * @returns {Promise} The promise of the result.
   */
  replaceOne(database, collection, filter = {}, replacement = {}, options = {}) {
    const cmdOpts = {};
    if ('writeConcern' in options) {
      Object.assign(cmdOpts, options.writeConcern);
    }
    const cursor = this._db(database).collection(collection).
      replaceOne(filter, replacement, cmdOpts);
    if ('collation' in options) {
      return cursor.collation(options.collation);
    }
    return cursor;
  }

  /**
   * Run a command against the database.
   *
   * @param {String} database - The database name.
   * @param {Object} spec - The command specification.
   * @param {Object} options - The database options.
   *
   * @returns {Promise} The promise of command results.
   */
  runCommand(database, spec, options = {}) {
    return this._db(database).command(spec, options);
  }

  /**
   * Update many documents.
   *
   * @note: Shell API sets writeConcern via options in object,
   * node driver flat.
   * @note: Shell API sets collation via options, node driver via cursor.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} filter - The filter.
   * @param {(Object|Array)} update - The updates.
   * @param {Object} options - The update options.
   *
   * @returns {Promise} The promise of the result.
   */
  updateMany(database, collection, filter = {}, update = {}, options = {}) {
    const cmdOpts = {};
    if ('writeConcern' in options) {
      Object.assign(cmdOpts, options.writeConcern);
    }
    const cursor = this._db(database).collection(collection).
    updateMany(filter, update, cmdOpts);
    if ('collation' in options) {
      return cursor.collation(options.collation);
    }
    return cursor;
  }

  /**
   * Update a document.
   *
   * @note: Shell API sets writeConcern via options in object,
   * node driver flat.
   * @note: Shell API sets collation via options, node driver via cursor.
   * TODO: Shell API provides 'hint' but node driver does not
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} filter - The filter.
   * @param {(Object|Array)} update - The updates.
   * @param {Object} options - The update options.
   *
   * @returns {Promise} The promise of the result.
   */
  updateOne(database, collection, filter = {}, update = {}, options = {}) {
    const cmdOpts = {};
    if ('writeConcern' in options) {
      Object.assign(cmdOpts, options.writeConcern);
    }
    const cursor = this._db(database).collection(collection).
      updateOne(filter, update, cmdOpts);
    if ('collation' in options) {
      return cursor.collation(options.collation);
    }
    return cursor;
  }

  /**
   * Get the DB object from the client.
   *
   * @param {String} name - The database name.
   *
   * @returns {Db} The database.
   */
  _db(name) {
    return this.mongoClient.db(name);
  }
}

module.exports = NodeTransport;
