import { MongoClient } from 'mongodb';

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
  mongoClient: MongoClient;

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
   * Run an aggregation pipeline on a collection.
   *
   * @param {String} db - The db name.
   * @param {String} coll - The collection name.
   * @param {Array} pipeline - The aggregation pipeline.
   * @param {Object} options - The pipeline options.
   * @param {Object} dbOptions - The database options, i.e. read/writeConcern
   *
   * @returns {Promise} The promise of the aggregation cursor.
   */
  aggregate(db, coll, pipeline = [], options = {}, dbOptions = {}) {
    return this._db(db, dbOptions).collection(coll).aggregate(pipeline, options);
  }

  /**
   * Run an aggregation pipeline on a database.
   *
   * @param {String} db - The db name.
   * @param {Array} pipeline - The aggregation pipeline.
   * @param {Object} options - The pipeline options.
   * @param {Object} dbOptions - The database options, i.e. read/writeConcern
   *
   * @returns {Promise} The promise of the aggregation cursor.
   */
  aggregateDb(db, pipeline = [], options = {}, dbOptions = {}) {
    return this._db(db, dbOptions).aggregate(pipeline, options);
  }

  /**
   * Execute a mix of write operations.
   *
   * @param {String} db - The db name.
   * @param {String} coll - The collection name.
   * @param {Array} requests - The bulk write requests.
   * @param {Object} options - The bulk write options.
   * @param {Object} dbOptions - The database options, i.e. read/writeConcern
   *
   * @returns {Promise} The promise of the result.
   */
  bulkWrite(db, coll, requests = {}, options = {}, dbOptions = {}) {
    return this._db(db, dbOptions).collection(coll).bulkWrite(requests, options);
  }

  /**
   * Deprecated count command.
   *
   * @param {String} db - The db name.
   * @param {String} coll - The collection name.
   * @param {Object} query - The filter.
   * @param {Object} options - The count options.
   * @param {Object} collOptions - The collection options
   *
   * @returns {Promise} The promise of the count.
   */
  count(db, coll, query = {}, options = {}, collOptions = {}) {
    if (!collOptions || Object.keys(collOptions).length === 0) {
      return this._db(db).collection(coll).count(query);
    }
    return this._db(db).collection(coll, collOptions).count(query);
  }

  /**
   * Get an exact document count from the coll.
   *
   * @param {String} db - The db name.
   * @param {String} coll - The collection name.
   * @param {Object} filter - The filter.
   * @param {Object} options - The count options.
   *
   * @returns {Promise} The promise of the count.
   */
  countDocuments(db, coll, filter = {}, options = {}) {
    return this._db(db).collection(coll).countDocuments(filter, options);
  }

  /**
   * Delete multiple documents from the coll.
   *
   * @param {String} db - The db name.
   * @param {String} coll - The collection name.
   * @param {Object} filter - The filter.
   * @param {Object} options - The delete many options.
   * @param {Object} dbOptions - The database options, i.e. read/writeConcern
   *
   * @returns {Promise} The promise of the result.
   */
  deleteMany(db, coll, filter = {}, options = {}, dbOptions = {}) {
    return this._db(db, dbOptions).collection(coll).deleteMany(filter, options);
  }

  /**
   * Delete one document from the coll.
   *
   * @param {String} db - The db name.
   * @param {String} coll - The collection name.
   * @param {Object} filter - The filter.
   * @param {Object} options - The delete one options.
   * @param {Object} dbOptions - The database options, i.e. read/writeConcern
   *
   * @returns {Promise} The promise of the result.
   */
  deleteOne(db, coll, filter = {}, options = {}, dbOptions = {}) {
    return this._db(db, dbOptions).collection(coll).deleteOne(filter, options);
  }

  /**
   * Get distinct values for the field.
   *
   * @param {String} db - The db name.
   * @param {String} coll - The collection name.
   * @param {String} fieldName - The field name.
   * @param {Object} filter - The filter.
   * @param {Object} options - The distinct options.
   * @param {Object} dbOptions - The database options, i.e. read/writeConcern
   *
   * @returns {Promise} The promise of the cursor.
   */
  distinct(db, coll, fieldName, filter = {}, options = {}, dbOptions = {}) {
    return this._db(db, dbOptions).collection(coll).
      distinct(fieldName, filter, options);
  }

  /**
   * Get an estimated document count from the coll.
   *
   * @param {String} db - The db name.
   * @param {String} coll - The collection name.
   * @param {Object} options - The count options.
   *
   * @returns {Promise} The promise of the count.
   */
  estimatedDocumentCount(db, coll, options = {}) {
    return this._db(db).collection(coll).
      estimatedDocumentCount(options);
  }

  /**
   * Find documents in the collection.
   *
   * @param {String} db - The db name.
   * @param {String} coll - The collection name.
   * @param {Object} filter - The filter.
   * @param {Object} options - The find options.
   *
   * @returns {Promise} The promise of the cursor.
   */
  find(db, coll, filter = {}, options = {}) {
    return this._db(db).collection(coll).find(filter, options);
  }

  // TODO
  // findAndModify(db, collection, document) {}


  /**
   * Find one document and delete it.
   *
   * @param {String} db - The db name.
   * @param {String} coll - The collection name.
   * @param {Object} filter - The filter.
   * @param {Object} options - The find options.
   *
   * @returns {Promise} The promise of the result.
   */
  findOneAndDelete(db, coll, filter = {}, options = {}) {
    return this._db(db).collection(coll).findOneAndDelete(filter, options);
  }

  /**
   * Find one document and replace it.
   *
   * @param {String} db - The db name.
   * @param {String} coll - The collection name.
   * @param {Object} filter - The filter.
   * @param {Object} replacement - The replacement.
   * @param {Object} options - The find options.
   *
   * @returns {Promise} The promise of the result.
   */
  findOneAndReplace(db, coll, filter = {}, replacement = {}, options = {}) {
    return this._db(db).collection(coll).
      findOneAndReplace(filter, replacement, options);
  }

  /**
   * Find one document and update it.
   *
   * @param {String} db - The db name.
   * @param {String} coll - The collection name.
   * @param {Object} filter - The filter.
   * @param {(Object|Array)} update - The update.
   * @param {Object} options - The find options.
   *
   * @returns {Promise} The promise of the result.
   */
  findOneAndUpdate(db, coll, filter = {}, update = {}, options = {}) {
    return this._db(db).collection(coll).
      findOneAndUpdate(filter, update, options);
  }

  /**
   * Insert many documents into the collection.
   *
   * @param {String} db - The db name.
   * @param {String} coll - The collection name.
   * @param {Array} docs - The documents.
   * @param {Object} options - The insert many options.
   * @param {Object} dbOptions - The database options, i.e. read/writeConcern
   *
   * @returns {Promise} The promise of the result.
   */
  insertMany(db, coll, docs = [], options = {}, dbOptions = {}) {
    return this._db(db, dbOptions).collection(coll).insertMany(docs, options);
  }

  /**
   * Insert one document into the collection.
   *
   * @param {String} db - The db name.
   * @param {String} coll - The collection name.
   * @param {Object} doc - The document.
   * @param {Object} options - The insert one options.
   * @param {Object} dbOptions - The database options, i.e. read/writeConcern
   *
   * @returns {Promise} The promise of the result.
   */
  insertOne(db, coll, doc = {}, options = {}, dbOptions = {}) {
    return this._db(db, dbOptions).collection(coll).insertOne(doc, options);
  }

  /**
   * Is the collection capped?
   *
   * @param db
   * @param coll
   * @return {Promise}
   */
  isCapped(db, coll) {
    return this._db(db).collection(coll).isCapped();
  }

  /**
   * Deprecated remove command.
   *
   * @param {String} db - The db name.
   * @param {String} coll - The collection name.
   * @param {Object} query - The query.
   * @param {Object} options - The options.
   * @param {Object} dbOptions - The db options.
   * @return {Promise}
   */
  remove(db, coll, query, options, dbOptions) {
    return this._db(db).collection(coll).remove(query, options);
  }

  /**
   * Deprecated save command.
   *
   * @note: Shell API sets writeConcern via options in object,
   * node driver flat.
   *
   * @param db
   * @param coll
   * @param doc
   * @param options
   * @return {Promise}
   */
  save(db, coll, doc, options = {}, dbOptions = {}) {
    return this._db(db, dbOptions).collection(coll).save(doc, options);
  }

  /**
   * Replace a document with another.
   *
   * @param {String} db - The db name.
   * @param {String} coll - The collection name.
   * @param {Object} filter - The filter.
   * @param {Object} replacement - The replacement document for matches.
   * @param {Object} options - The replace options.
   * @param {Object} dbOptions - The db options.
   *
   * @returns {Promise} The promise of the result.
   */
  replaceOne(db, coll, filter = {}, replacement = {}, options = {}, dbOptions = {}) {
    return this._db(db, dbOptions).collection(coll).replaceOne(filter, replacement, options);
  }

  /**
   * Run a command against the db.
   *
   * @param {String} db - The db name.
   * @param {Object} spec - The command specification.
   * @param {Object} options - The db options.
   *
   * @returns {Promise} The promise of command results.
   */
  runCommand(db, spec, options = {}) {
    return this._db(db).command(spec, options);
  }

  /**
   * Update many documents.
   *
   * @param {String} db - The db name.
   * @param {String} coll - The collection name.
   * @param {Object} filter - The filter.
   * @param {(Object|Array)} update - The updates.
   * @param {Object} options - The update options.
   * @param {Object} dbOptions - The db options.
   *
   * @returns {Promise} The promise of the result.
   */
  updateMany(db, coll, filter = {}, update = {}, options = {}, dbOptions = {}) {
    return this._db(db, dbOptions).collection(coll).
      updateMany(filter, update, options);
  }

  /**
   * Update a document.
   *
   * @param {String} db - The db name.
   * @param {String} coll - The collection name.
   * @param {Object} filter - The filter.
   * @param {(Object|Array)} update - The updates.
   * @param {Object} options - The update options.
   * @param {Object} dbOptions - The db options.
   *
   * @returns {Promise} The promise of the result.
   */
  updateOne(db, coll, filter = {}, update = {}, options = {}, dbOptions = {}) {
    return this._db(db, dbOptions).collection(coll).
      updateOne(filter, update, options);
  }

  /**
   * Get the DB object from the client.
   *
   * @param {String} name - The db name.
   * @param {Object} options - Optional DB options.
   *
   * @returns {Db} The db.
   */
  _db(name, options = {}) {
    if (Object.keys(options).length !== 0) {
      return this.mongoClient.db(name, options);
    }
    return this.mongoClient.db(name);
  }
}

export default NodeTransport;
