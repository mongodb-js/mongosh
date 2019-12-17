import { MongoClient, Db } from 'mongodb';
import Transport from './transport';
import Cursor from './cursor';
import Result from './result';

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
class NodeTransport implements Transport {
  readonly mongoClient: MongoClient;

  /**
   * Create a NodeTransport from a URI.
   *
   * @param {String} uri - The URI.
   *
   * @returns {NodeTransport} The Node transport.
   */
  static async fromURI(uri: string) : Promise<NodeTransport> {
    const mongoClient = new MongoClient(uri, DEFAULT_OPTIONS);
    await mongoClient.connect();
    return new NodeTransport(mongoClient);
  }

  /**
   * Run an aggregation pipeline.
   *
   * @note: Passing a null collection will cause the
   *   aggregation to run on the DB.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Array} pipeline - The aggregation pipeline.
   * @param {Object} options - The pipeline options.
   * @param {Object} dbOptions - The database options (i.e. readConcern, writeConcern. etc).
   *
   * @returns {Cursor} The aggregation cursor.
   */
  aggregate(
    database: string,
    collection: string,
    pipeline: object[] = [],
    options: object = {},
    dbOptions: object = {}) : Cursor {

    if (collection === null) {
      return this._db(database).aggregate(pipeline, options);
    }
    return this._db(database).collection(collection).
      aggregate(pipeline, options);
  }

  /**
   * Run an aggregation pipeline only on a DB.
   *
   * @note: Passing a null collection will cause the
   *   aggregation to run on the DB.
   *
   * @param {String} database - The database name.
   * @param {Array} pipeline - The aggregation pipeline.
   * @param {Object} options - The pipeline options.
   * @param {Object} dbOptions - The database options (i.e. readConcern, writeConcern. etc).
   *
   * @returns {Cursor} The aggregation cursor.
   */
  aggregateDb(
      database: string,
      pipeline: object[] = [],
      options: object = {},
      dbOptions: object = {}) : Cursor {

      return this._db(database, dbOptions).aggregate(pipeline, options);
  }

  /**
   * Execute a mix of write operations.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} requests - The bulk write requests.
   * @param {Object} options - The bulk write options.

   * @param {Object} dbOptions - The database options (i.e. readConcern, writeConcern. etc).*
   * @returns {Promise} The promise of the result.
   */
  bulkWrite(
    database: string,
    collection: string,
    requests: object = {},
    options: object = {},
    dbOptions: object = {}) : Promise<Result> {

    return this._db(database, dbOptions).collection(collection).
      bulkWrite(requests, options);
  }

  /**
   * Deprecated count command.
   *
   * @param {String} database - The db name.
   * @param {String} collection - The collection name.
   * @param {Object} query - The filter.
   * @param {Object} options - The count options.
   * @param {Object} dbOptions - The database option i.e. read/writeConcern
   *
   * @returns {Promise} The promise of the count.
   */
  count(
      database: string,
      collection: string,
      query: object = {},
      options: object = {},
      dbOptions: object = {}) : Promise<Result> {
    return this._db(database, dbOptions).collection(collection).count(query);
  }

  /**
   * Get an exact document count from the collection.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} filter - The filter.
   * @param {Object} options - The count options.
   * @param {Object} dbOptions - The database options (i.e. readConcern, writeConcern. etc).*
   * @returns {Promise} The promise of the count.
   */
  countDocuments(
    database: string,
    collection: string,
    filter: object = {},
    options: object = {},
    dbOptions: object = {}) : Promise<Result> {

    return this._db(database, dbOptions).collection(collection).
      countDocuments(filter, options);
  }

  /**
   * Instantiate a new Node transport with the Node driver's connected
   * MongoClient instance.
   *
   * @param {MongoClient} mongoClient - The Node drivers' MongoClient instance.
   */
  constructor(mongoClient: MongoClient) {
    this.mongoClient = mongoClient;
  }

  /**
   * Delete multiple documents from the collection.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} filter - The filter.
   * @param {Object} options - The delete many options.
   * @param {Object} dbOptions - The database options (i.e. readConcern, writeConcern. etc).
*
   * @returns {Promise} The promise of the result.
   */
  deleteMany(
    database: string,
    collection: string,
    filter: object = {},
    options: object = {},
    dbOptions: object = {}) : Promise<Result> {

    return this._db(database, dbOptions).collection(collection).
      deleteMany(filter, options);
  }

  /**
   * Delete one document from the collection.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} filter - The filter.
   * @param {Object} options - The delete one options.
   * @param {Object} dbOptions - The database options (i.e. readConcern, writeConcern. etc).
  *
   * @returns {Promise} The promise of the result.
   */
  deleteOne(
    database: string,
    collection: string,
    filter: object = {},
    options: object = {},
    dbOptions: object = {}) : Promise<Result> {

    return this._db(database, dbOptions).collection(collection).
      deleteOne(filter, options);
  }

  /**
   * Get distinct values for the field.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {String} fieldName - The field name.
   * @param {Object} filter - The filter.
   * @param {Object} options - The distinct options.
   * @param {Object} dbOptions - The database options (i.e. readConcern, writeConcern. etc).
  *
   * @returns {Cursor} The cursor.
   */
  distinct(
    database: string,
    collection: string,
    fieldName: string,
    filter: object = {},
    options: object = {},
    dbOptions: object = {}) : Cursor {

    return this._db(database, dbOptions).collection(collection).
      distinct(fieldName, filter, options);
  }

  /**
   * Get an estimated document count from the collection.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} options - The count options.
   * @param {Object} dbOptions - The database options (i.e. readConcern, writeConcern. etc).
  *
   * @returns {Promise} The promise of the result.
   */
  estimatedDocumentCount(
    database: string,
    collection: string,
    options: object = {},
    dbOptions: object = {}) : Promise<Result> {

    return this._db(database, dbOptions).collection(collection).
      estimatedDocumentCount(options);
  }

  /**
   * Find documents in the collection.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} filter - The filter.
   * @param {Object} options - The find options.
  *
   * @returns {Cursor} The cursor.
   */
  find(
    database: string,
    collection: string,
    filter: object = {},
    options: object = {}) : Cursor {

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
    return new Cursor(this._db(database).collection(collection).find(filter, options));
  }

  /**
   * Find one document and delete it.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} filter - The filter.
   * @param {Object} options - The find options.
   * @param {Object} dbOptions - The database options (i.e. readConcern, writeConcern. etc).
  *
   * @returns {Promise} The promise of the result.
   */
  findOneAndDelete(
    database: string,
    collection: string,
    filter: object = {},
    options: object = {},
    dbOptions: object = {}) : Promise<Result> {

    return this._db(database, dbOptions).collection(collection).
      findOneAndDelete(filter, options);
  }

  /**
   * Find one document and replace it.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} filter - The filter.
   * @param {Object} replacement - The replacement.
   * @param {Object} options - The find options.
  *
   * @returns {Promise} The promise of the result.
   */
  findOneAndReplace(
    database: string,
    collection: string,
    filter: object = {},
    replacement: object = {},
    options: object = {}) : Promise<Result> {

    const findOneAndReplaceOptions = { ...options };
    if ('returnDocument' in options) {
      // @ts-ignore
      findOneAndReplaceOptions.returnOriginal = options.returnDocument;
      // @ts-ignore
      delete findOneAndReplaceOptions.returnDocument;
    }
    return this._db(database).collection(collection).
      findOneAndReplace(filter, replacement, findOneAndReplaceOptions);
  }

  /**
   * Find one document and update it.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} filter - The filter.
   * @param {(Object|Array)} update - The update.
   * @param {Object} options - The find options.
  *
   * @returns {Promise} The promise of the result.
   */
  findOneAndUpdate(
    database: string,
    collection: string,
    filter: object = {},
    update: object = {},
    options: object = {}) : Promise<Result> {

    const findOneAndUpdateOptions = { ...options };
    if ('returnDocument' in options) {
      // @ts-ignore
      findOneAndReplaceOptions.returnOriginal = options.returnDocument;
      // @ts-ignore
      delete findOneAndReplaceOptions.returnDocument;
    }
    return this._db(database).collection(collection).
      findOneAndUpdate(filter, update, findOneAndUpdateOptions);
  }

  /**
   * Insert many documents into the colleciton.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Array} docs - The documents.
   * @param {Object} options - The insert many options.
   * @param {Object} dbOptions - The database options (i.e. readConcern, writeConcern. etc).
  *
   * @returns {Promise} The promise of the result.
   */
  insertMany(
    database: string,
    collection: string,
    docs: object[] = [],
    options: object = {},
    dbOptions: object = {}) : Promise<Result> {

    return this._db(database, dbOptions).collection(collection).
      insertMany(docs, options);
  }

  /**
   * Insert one document into the collection.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} doc - The document.
   * @param {Object} options - The insert one options.
   * @param {Object} dbOptions - The database options (i.e. readConcern, writeConcern. etc).
  *
   * @returns {Promise} The promise of the result.
   */
  insertOne(
    database: string,
    collection: string,
    doc: object = {},
    options: object = {},
    dbOptions: object = {}) : Promise<Result> {

    return this._db(database, dbOptions).collection(collection).
      insertOne(doc, options);
  }

  /**
   * Is the collection capped?
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @returns {Promise} The promise of the result.
   */
  isCapped(
      database: string,
      collection: string) : Promise<Result> {
    return this._db(database).collection(collection).isCapped();
  }

  /**
   * Deprecated remove command.
   *
   * @param {String} database - The db name.
   * @param {String} collection - The collection name.
   * @param {Object} query - The query.
   * @param {Object} options - The options.
   * @return {Promise}
   */
  remove(
    database: string,
    collection: string,
    query: object = {},
    options: object = {}) : Promise<Result> {
    return this._db(database).collection(collection).remove(query, options);
  }

  /**
   * Deprecated save command.
   *
   * @note: Shell API sets writeConcern via options in object,
   * node driver flat.
   *
   * @param {String} database - The db name.
   * @param {String} collection - The collection name.
   * @param {Object} doc - The doc.
   * @param {Object} options - The options.
   * @param {Object} dbOptions - The DB options
   * @return {Promise}
   */
  save(
    database: string,
    collection: string,
    doc: object = {},
    options: object = {},
    dbOptions: object = {}) : Promise<Result> {

    return this._db(database, dbOptions).collection(collection).save(doc, options);
  }

  /**
   * Replace a document with another.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} filter - The filter.
   * @param {Object} replacement - The replacement document for matches.
   * @param {Object} options - The replace options.
   * @param {Object} dbOptions - The database options (i.e. readConcern, writeConcern. etc).
  *
   * @returns {Promise} The promise of the result.
   */
  replaceOne(
    database: string,
    collection: string,
    filter: object = {},
    replacement: object = {},
    options: object = {},
    dbOptions: object = {}) : Promise<Result> {

    return this._db(database, dbOptions).collection(collection).
      replaceOne(filter, replacement, options);
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
  runCommand(
      database: string,
      spec: object = {},
      options: object = {}) : Promise<Result> {
    return this._db(database).command(spec, options);
  }

  /**
   * Update many document.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} filter - The filter.
   * @param {(Object|Array)} update - The updates.
   * @param {Object} options - The update options.
   * @param {Object} dbOptions - The database options (i.e. readConcern, writeConcern. etc).
  *
   * @returns {Promise} The promise of the result.
   */
  updateMany(
    database: string,
    collection: string,
    filter: object = {},
    update: object = {},
    options: object = {},
    dbOptions: object = {}) : Promise<Result> {

    return this._db(database, dbOptions).collection(collection).
      updateMany(filter, update, options);
  }

  /**
   * Update a document.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} filter - The filter.
   * @param {(Object|Array)} update - The updates.
   * @param {Object} options - The update options.
   * @param {Object} dbOptions - The database options (i.e. readConcern, writeConcern. etc).
  *
   * @returns {Promise} The promise of the result.
   */
  updateOne(
    database: string,
    collection: string,
    filter: object = {},
    update: object = {},
    options: object = {},
    dbOptions: object = {}) : Promise<Result> {

    return this._db(database, dbOptions).collection(collection).
      updateOne(filter, update, options);
  }

  /**
   * Get the DB object from the client.
   *
   * @param {String} name - The database name.
   * @param {Object} options - The DB options.
   *
   * @returns {Db} The database.
   */
  _db(name: string, options: object = {}) : Db {
    if (Object.keys(options).length !== 0) {
      return this.mongoClient.db(name, options);
    }
    return this.mongoClient.db(name);
  }
}

export default NodeTransport;
