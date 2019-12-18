import { Transport, Cursor, Result } from 'mongosh-transport-core';
import {
  AnonymousCredential,
  RemoteMongoClient,
  RemoteMongoDatabase,
  Stitch,
  StitchAppClient
} from 'mongodb-stitch-server-sdk';

/**
 * Constant for not implemented rejections.
 */
const NOT_IMPLEMENTED = 'is not implemented in the Stitch server SDK';

/**
 * Init error.
 */
const INIT_ERROR = 'Error authenticating with Stitch.';

/**
 * Rejecting for running an agg pipeline on a database.
 */
const AGG_ON_DB = 'Aggregations run on the database is not allowed via Stitch';

/**
 * Atlas id.
 */
const ATLAS = 'mongodb-atlas';

/**
 * Encapsulates logic for communicating with a MongoDB instance via
 * Stitch in the server.
 */
class StitchServerTransport implements Transport {
  readonly mongoClient: RemoteMongoClient;
  readonly stitchClient: StitchAppClient;

  /**
   * Create a StitchServerTransport from a Stitch app id.
   *
   * @param {String} stitchAppId - The Stitch app id.
   * @param {String} serviceName - The Stitch service name.
   *
   * @returns {Promise} The promise of the Stitch server transport.
   */
  static async fromAppId(
    stitchAppId: string,
    serviceName: string) : Promise<StitchServerTransport> {

    const client = Stitch.initializeDefaultAppClient(stitchAppId);
    try {
      await client.auth.loginWithCredential(new AnonymousCredential());
    } catch (err) {
      /* eslint no-console:0 */
      console.log(INIT_ERROR, err);
      client.close();
    }
    return new StitchServerTransport(client, serviceName);
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
   *
   * @returns {Cursor} The aggregation cursor.
   */
  aggregate(
    database: string,
    collection: string,
    pipeline: object[] = []) : any {

    return this._db(database).collection(collection).
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

    return this._db(database).collection(collection).count(filter, options);
  }

  /**
   * Instantiate a new Stitch server transport with a connected stitch
   * client instance.
   *
   * @param {Client} stitchClient - The Stitch client instance.
   * @param {String} serviceName - The Mongo service name.
   */
  constructor(stitchClient: StitchAppClient, serviceName: string = ATLAS) {
    this.stitchClient = stitchClient;
    this.mongoClient = stitchClient.
      getServiceClient(RemoteMongoClient.factory, serviceName);
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

    return this._db(database).collection(collection).
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

    return this._db(database).collection(collection).
      deleteOne(filter);
  }

  /**
   * Not implemented in Stitch.
   *
   * @returns {Promise} The rejected promise.
   */
  distinct() : any {
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
    options: object = {}) : any {

    return this._db(database).collection(collection).
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

    return this._db(database).collection(collection).
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

    return this._db(database).collection(collection).
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

    return this._db(database).collection(collection).
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

    return this._db(database).collection(collection).
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

    return this._db(database).collection(collection).
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

    return this._db(database).collection(collection).
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

    return this._db(database).collection(collection).
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
  _db(name: string) : RemoteMongoDatabase {
    return this.mongoClient.db(name);
  }
}

export default StitchServerTransport;
