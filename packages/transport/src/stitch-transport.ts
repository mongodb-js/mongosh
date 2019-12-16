import Transport from './transport';
import StitchClient from './stitch-client';
import StitchMongoClient from './stitch-mongo-client';
import Cursor from './cursor';
import Result from './result';

/**
 * Constant for not implemented rejections.
 */
const NOT_IMPLEMENTED = 'is not implemented in the Stitch SDK';

/**
 * Rejecting for running an agg pipeline on a database.
 */
const AGG_ON_DB = 'Aggregations run on the database is not allowed via Stitch';

/**
 * Encapsulates logic for communicating with a MongoDB instance via Stitch.
 */
class StitchTransport<S extends StitchClient, M extends StitchMongoClient> implements Transport {
  readonly stitchClient: S;
  readonly mongoClient: M;

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
   *
   * @returns {Cursor} The aggregation cursor.
   */
  aggregate(
    database: string,
    collection: string,
    pipeline: object[] = []) : Cursor {

    if (collection === null) {
      return Promise.reject(AGG_ON_DB);
    }
    return this.db(database).collection(collection).
      aggregate(pipeline);
  }

  /**
   * Not implemented in Stitch.
   *
   * @returns {Promise} The rejected promise.
   */
  bulkWrite() : Promise<Result> {
    return Promise.reject(`Bulk write ${NOT_IMPLEMENTED}`);
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
  countDocuments(
    database: string,
    collection: string,
    filter: object = {},
    options: object = {}) : Promise<Result> {

    return this.db(database).collection(collection).count(filter, options);
  }

  /**
   * Instantiate a new Stitch server transport with a connected stitch
   * client instance.
   *
   * @param {S} stitchClient - The Stitch client instance.
   * @param {M} mongoClient - The Mongo client.
   */
  constructor(stitchClient: S, mongoClient: M) {
    this.stitchClient = stitchClient;
    this.mongoClient = mongoClient;
  }

  /**
   * Delete multiple documents from the collection.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} filter - The filter.
   * @param {Object} options - The delete many options.
   *
   * @returns {Promise} The promise of the result.
   */
  deleteMany(
    database: string,
    collection: string,
    filter: object = {}) : Promise<Result> {

    return this.db(database).collection(collection).
      deleteMany(filter);
  }

  /**
   * Delete one document from the collection.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} filter - The filter.
   * @param {Object} options - The delete one options.
   *
   * @returns {Promise} The promise of the result.
   */
  deleteOne(
    database: string,
    collection: string,
    filter: object = {}) : Promise<Result> {

    return this.db(database).collection(collection).
      deleteOne(filter);
  }

  /**
   * Not implemented in Stitch.
   *
   * @returns {Promise} The rejected promise.
   */
  distinct() : Promise<Result> {
    return Promise.reject(`Distinct ${NOT_IMPLEMENTED}`);
  }

  /**
   * Not implemented in Stitch.
   *
   * @returns {Promise} The rejected promise.
   */
  estimatedDocumentCount() : Promise<Result> {
    return Promise.reject(`Estimated document count ${NOT_IMPLEMENTED}`);
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

    return this.db(database).collection(collection).
      find(filter, options);
  }

  /**
   * Find one document and delete it.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} filter - The filter.
   * @param {Object} options - The find options.
   *
   * @returns {Promise} The promise of the result.
   */
  findOneAndDelete(
    database: string,
    collection: string,
    filter: object = {},
    options: object = {}) : Promise<Result> {

    return this.db(database).collection(collection).
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

    return this.db(database).collection(collection).
      findOneAndReplace(filter, replacement, options);
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

    return this.db(database).collection(collection).
      findOneAndUpdate(filter, update, options);
  }

  /**
   * Insert many documents into the colleciton.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Array} docs - The documents.
   * @param {Object} options - The insert many options.
   *
   * @returns {Promise} The promise of the result.
   */
  insertMany(
    database: string,
    collection: string,
    docs: object[] = [],
    options: object = {}) : Promise<Result> {

    return this.db(database).collection(collection).
      insertMany(docs);
  }

  /**
   * Insert one document into the collection.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} doc - The document.
   * @param {Object} options - The insert one options.
   *
   * @returns {Promise} The promise of the result.
   */
  insertOne(
    database: string,
    collection: string,
    doc: object = {},
    options: object = {}) : Promise<Result> {

    return this.db(database).collection(collection).
      insertOne(doc);
  }

  /**
   * Not implemented in Stitch.
   *
   * @returns {Promise} The rejected promise.
   */
  replaceOne() : Promise<Result> {
    return Promise.reject(`Replace one ${NOT_IMPLEMENTED}`);
  }

  /**
   * Not implemented in Stitch.
   *
   * @returns {Promise} The rejected promise.
   */
  runCommand() : Promise<Result> {
    return Promise.reject(`Running a direct command ${NOT_IMPLEMENTED}`);
  }

  /**
   * Update many document.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} filter - The filter.
   * @param {(Object|Array)} update - The updates.
   * @param {Object} options - The update options.
   *
   * @returns {Promise} The promise of the result.
   */
  updateMany(
    database: string,
    collection: string,
    filter: object = {},
    update: object = {},
    options: object = {}) : Promise<Result> {

    return this.db(database).collection(collection).
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
   *
   * @returns {Promise} The promise of the result.
   */
  updateOne(
    database: string,
    collection: string,
    filter: object = {},
    update: object = {},
    options: object = {}) : Promise<Result> {

    return this.db(database).collection(collection).
      updateOne(filter, update, options);
  }

  /**
   * Get the current user id.
   *
   * @returns {String} The user id.
   */
  get userId() : string {
    return this.stitchClient.auth.user.id;
  }

  /**
   * Get the DB object from the client.
   *
   * @param {String} name - The database name.
   *
   * @returns {RemoteMongoDaatabase} The database.
   */
  private db(name: string) {
    return this.mongoClient.db(name);
  }
}

export default StitchTransport;
