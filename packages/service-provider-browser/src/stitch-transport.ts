/* eslint-disable @typescript-eslint/no-unused-vars */
import i18n from '@mongosh/i18n';

import StitchClient from './stitch-client';
import StitchMongoClient from './stitch-mongo-client';
import UnsupportedCursor from './unsupported-cursor';
import { Document, Cursor, Result } from '@mongosh/service-provider-core';

/**
 * Constant for not implemented rejections.
 */
const NOT_IMPLEMENTED = 'transport-core.stitch-transport.not-implemented';

/**
 * Rejecting for running an agg pipeline on a database.
 */
const AGG_ON_DB = 'transport-core.stitch-transport.agg-on-db';

/**
 * Encapsulates logic for communicating with a MongoDB instance via Stitch.
 */
class StitchTransport<S extends StitchClient, M extends StitchMongoClient> {
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
   *
   * @returns {Cursor} The aggregation cursor.
   */
  aggregate(
    database: string,
    collection: string,
    pipeline: Document[] = []): Cursor {
    if (collection === null) {
      return new UnsupportedCursor(i18n.__(AGG_ON_DB));
    }
    return this.db(database).collection(collection).
      aggregate(pipeline);
  }

  /**
   * Not implemented in Stitch.
   *
   * @returns {Promise} The rejected promise.
   */
  bulkWrite(): Promise<Result> {
    return Promise.reject(`Bulk write ${i18n.__(NOT_IMPLEMENTED)}`);
  }

  /**
   * Get an exact document count from the collection.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Document} filter - The filter.
   * @param {Document} options - The count options.
   *
   * @returns {Promise} The promise of the count.
   */
  countDocuments(
    database: string,
    collection: string,
    filter: Document = {},
    options: Document = {}): Promise<Result> {
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
   * @param {Document} filter - The filter.
   *
   * @returns {Promise} The promise of the result.
   */
  deleteMany(
    database: string,
    collection: string,
    filter: Document = {}): Promise<Result> {
    return this.db(database).collection(collection).
      deleteMany(filter);
  }

  /**
   * Delete one document from the collection.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Document} filter - The filter.
   *
   * @returns {Promise} The promise of the result.
   */
  deleteOne(
    database: string,
    collection: string,
    filter: Document = {}): Promise<Result> {
    return this.db(database).collection(collection).
      deleteOne(filter);
  }

  /**
   * Not implemented in Stitch.
   *
   * @returns {Cursor} The rejected promise when toArray is called.
   */
  distinct(): Promise<any> {
    return Promise.resolve(new UnsupportedCursor(`Distinct ${i18n.__(NOT_IMPLEMENTED)}`));
  }

  /**
   * Not implemented in Stitch.
   *
   * @returns {Promise} The rejected promise.
   */
  estimatedDocumentCount(): Promise<Result> {
    return Promise.reject(`Estimated document count ${i18n.__(NOT_IMPLEMENTED)}`);
  }

  /**
   * Find documents in the collection.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Document} filter - The filter.
   * @param {Document} options - The find options.
   *
   * @returns {Cursor} The cursor.
   */
  find(
    database: string,
    collection: string,
    filter: Document = {},
    options: Document = {}): Cursor {
    return this.db(database).collection(collection).
      find(filter, options);
  }

  /**
   * Find one document and delete it.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Document} filter - The filter.
   * @param {Document} options - The find options.
   *
   * @returns {Promise} The promise of the result.
   */
  findOneAndDelete(
    database: string,
    collection: string,
    filter: Document = {},
    options: Document = {}): Promise<Result> {
    return this.db(database).collection(collection).
      findOneAndDelete(filter, options);
  }

  /**
   * Find one document and replace it.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Document} filter - The filter.
   * @param {Document} replacement - The replacement.
   * @param {Document} options - The find options.
   *
   * @returns {Promise} The promise of the result.
   */
  findOneAndReplace(
    database: string,
    collection: string,
    filter: Document = {},
    replacement: Document = {},
    options: Document = {}): Promise<Result> {
    return this.db(database).collection(collection).
      findOneAndReplace(filter, replacement, options);
  }

  /**
   * Find one document and update it.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Document} filter - The filter.
   * @param {(Document|Array)} update - The update.
   * @param {Document} options - The find options.
   *
   * @returns {Promise} The promise of the result.
   */
  findOneAndUpdate(
    database: string,
    collection: string,
    filter: Document = {},
    update: Document = {},
    options: Document = {}): Promise<Result> {
    return this.db(database).collection(collection).
      findOneAndUpdate(filter, update, options);
  }

  /**
   * Insert many documents into the colleciton.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Array} docs - The documents.
   * @param {Document} options - The insert many options.
   *
   * @returns {Promise} The promise of the result.
   */
  insertMany(
    database: string,
    collection: string,
    docs: Document[] = [],
    options: Document = {}): Promise<Result> {
    return this.db(database).collection(collection).
      insertMany(docs);
  }

  /**
   * Insert one document into the collection.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Document} doc - The document.
   * @param {Document} options - The insert one options.
   *
   * @returns {Promise} The promise of the result.
   */
  insertOne(
    database: string,
    collection: string,
    doc: Document = {},
    options: Document = {}): Promise<Result> {
    return this.db(database).collection(collection).
      insertOne(doc);
  }

  /**
   * Not implemented in Stitch.
   *
   * @returns {Promise} The rejected promise.
   */
  replaceOne(): Promise<Result> {
    return Promise.reject(`Replace one ${i18n.__(NOT_IMPLEMENTED)}`);
  }

  /**
   * Not implemented in Stitch.
   *
   * @returns {Promise} The rejected promise.
   */
  runCommand(): Promise<Result> {
    return Promise.reject(`Running a direct command ${i18n.__(NOT_IMPLEMENTED)}`);
  }

  /**
   * Update many document.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Document} filter - The filter.
   * @param {(Document|Array)} update - The updates.
   * @param {Document} options - The update options.
   *
   * @returns {Promise} The promise of the result.
   */
  updateMany(
    database: string,
    collection: string,
    filter: Document = {},
    update: Document = {},
    options: Document = {}): Promise<Result> {
    return this.db(database).collection(collection).
      updateMany(filter, update, options);
  }

  /**
   * Update a document.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Document} filter - The filter.
   * @param {(Document|Array)} update - The updates.
   * @param {Document} options - The update options.
   *
   * @returns {Promise} The promise of the result.
   */
  updateOne(
    database: string,
    collection: string,
    filter: Document = {},
    update: Document = {},
    options: Document = {}): Promise<Result> {
    return this.db(database).collection(collection).
      updateOne(filter, update, options);
  }

  /**
   * Get the current user id.
   *
   * @returns {String} The user id.
   */
  get userId(): string {
    return this.stitchClient.auth.user.id;
  }

  /**
   * Get the DB Document from the client.
   *
   * @param {String} name - The database name.
   *
   * @returns {RemoteMongoDatabase} The database.
   */
  private db(name: string): any {
    return this.mongoClient.db(name);
  }
}

export default StitchTransport;
