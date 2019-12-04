import { MongoClient } from 'mongodb';

/**
 * Default driver options we always use.
 */
const DEFAULT_OPTIONS = Object.freeze({
  useNewUrlParser: true,
  useUnifiedTopology: true
});

class Cursor {
  private cursor: any;

  constructor(cursor) {
    this.cursor = cursor;
  }

  addOption(option) {
    const dbOption = {
      2: "tailable",
      4: "slaveOk",
      8: "oplogReplay",
      16: "noTimeout",
      32: "awaitData",
      64: "exhaust",
      128: "partial"
    };
    const opt = dbOption[option];
    if (opt === 'slaveOk' || !!opt) {} // TODO
    this.cursor.addCursorFlag(opt, true);
    return this;
  }

  allowPartialResults() {
    this.cursor.addCursorFlag('partial', true);
    return this;
  }
  batchSize(size) {
    this.cursor.setCursorBatchSize(size);
    return this;
  }
  close() {
    this.cursor.close();
    return this;
  }
  isClosed() {
    return this.cursor.isClosed();
  }
  collation(doc) {
    this.cursor.collation(doc);
    return this;
  }
  comment(cmt) {
    this.cursor.comment(cmt);
    return this;
  }
  count() {
    return this.cursor.count();
  }
  explain() {
    this.cursor.explain();
    return this;
  }
  forEach(f) {
    this.cursor.forEach(f);
    return this;
  }
  hasNext() {
    return this.cursor.hasNext();
  }
  hint(index) {
    this.cursor.hint(index);
    return this;
  }
  getQueryPlan() {
    this.cursor.explain('executionStats');
    return this;
  }
  isExhausted() {
    return this.cursor.isClosed() && !this.cursor.hasNext();
  }
  itcount() {
    return this.cursor.toArray().length;
  }
  limit(l) {
    this.cursor.limit(l);
    return this;
  }
  map(f) {
    this.cursor.map(f);
    return this;
  }
  max(indexBounds) {
    this.cursor.max(indexBounds);
    return this;
  }
  maxTimeMS(ms) {
    this.cursor.maxTimeMS(ms);
    return this;
  }
  min(indexBounds) {
    this.cursor.min(indexBounds);
    return this;
  }
  next() {
    return this.cursor.next();
  }
  modifiers() { // TODO
    return this.cursor.cmd;
  }
  noCursorTimeout() {
    this.cursor.addCursorFlag('noCursorTimeout', true);
    return this;
  }
  objsLeftInBatch() {
    // TODO
  }
  oplogReplay() {
    this.cursor.addCursorFlag('oplogReplay', true);
    return this;
  }
  projection(v) {
    this.cursor.project(v);
    return this;
  }
  pretty() {
    // TODO
  }
  readConcern(v) {
    // TODO
  }
  readPref(v) {
    this.cursor.setReadPreference(v);
    return this;
  }
  returnKey() {
    this.cursor.returnKey();
    return this;
  }
  showDiskLoc() {
    this.cursor.showRecordId(true);
    return this;
  }
  showRecordId() {
    this.cursor.showRecordId(true);
    return this;
  }
  size() {
    return this.cursor.count(); // TODO: size same as count?
  }
  skip(s) {
    this.cursor.skip(s);
    return this;
  }
  sort(s) {
    this.cursor.sort(s);
    return this;
  }
  tailable() {
    this.cursor.addCursorFlag('tailable', true);
    return this;
  }
  toArray() {
    return this.cursor.toArray();
  }
}

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
    return new Cursor(
        this._db(db, dbOptions).collection(coll).aggregate(pipeline, options)
    );
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
    return new Cursor(
        this._db(db, dbOptions).aggregate(pipeline, options)
    );
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
   * @param {Object} dbOptions - The database option i.e. read/writeConcern
   *
   * @returns {Promise} The promise of the count.
   */
  count(db, coll, query = {}, options = {}, dbOptions = {}) {
    return this._db(db, dbOptions).collection(coll).count(query);
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
    this._db(db, dbOptions).collection(coll).deleteMany(filter, options)
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
    const findOptions = { ...options };
    Object.assign(findOptions, options);
    if ('allowPartialResults' in findOptions) {
      // @ts-ignore
      findOptions.partial = findOptions.allowPartialResults;
    }
    if ('noCursorTimeout' in findOptions) {
      // @ts-ignore
      findOptions.timeout = findOptions.noCursorTimeout;
    }
    if ('tailable' in findOptions) {
      // @ts-ignore
      findOptions.cursorType  = findOptions.tailable ? 'TAILABLE' : 'NON_TAILABLE' // TODO
    }
    return new Cursor(this._db(db).collection(coll).find(filter, options));
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
    const findOneAndReplaceOptions = { ...options };
    if ('returnDocument' in options) {
      // @ts-ignore
      findOneAndReplaceOptions.returnOriginal = options.returnDocument;
      // @ts-ignore
      delete findOneAndReplaceOptions.returnDocument;
    }
    return this._db(db).collection(coll).
      findOneAndReplace(filter, replacement, findOneAndReplaceOptions);
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
    const findOneAndUpdateOptions = { ...options };
    if ('returnDocument' in options) {
      // @ts-ignore
      findOneAndReplaceOptions.returnOriginal = options.returnDocument;
      // @ts-ignore
      delete findOneAndReplaceOptions.returnDocument;
    }
    return this._db(db).collection(coll).
      findOneAndUpdate(filter, update, findOneAndUpdateOptions);
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
