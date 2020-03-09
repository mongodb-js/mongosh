import { Result, Document } from 'mongosh-transport-core';

/**
 * Interface for write operations in the CRUD specification.
 */
interface Writable {
  /**
   * Execute a mix of write operations.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Document} requests - The bulk write requests.
   * @param {Document} options - The bulk write options.
   *
   * @returns {Promise} The promise of the result.
   */
  bulkWrite(
    database: string,
    collection: string,
    requests: Document,
    options?: Document,
    dbOptions?: Document) : Promise<Result>;

  /**
   * Delete multiple documents from the collection.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Document} filter - The filter.
   * @param {Document} options - The delete many options.
   *
   * @returns {Promise} The promise of the result.
   */
  deleteMany(
    database: string,
    collection: string,
    filter: Document,
    options?: Document,
    dbOptions?: Document) : Promise<Result>;

  /**
   * Delete one document from the collection.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Document} filter - The filter.
   * @param {Document} options - The delete one options.
   *
   * @returns {Promise} The promise of the result.
   */
  deleteOne(
    database: string,
    collection: string,
    filter: Document,
    options?: Document,
    dbOptions?: Document) : Promise<Result>;

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
    filter: Document,
    options?: Document) : Promise<Result>;

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
    filter: Document,
    replacement: Document,
    options?: Document) : Promise<Result>;

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
    filter: Document,
    update: Document,
    options?: Document) : Promise<Result>;

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
    docs: object[],
    options?: object) : Promise<Result>;

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
    doc: object,
    options?: object) : Promise<Result>;

  /**
   * Replace a document with another.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Document} filter - The filter.
   * @param {Document} replacement - The replacement document for matches.
   * @param {Document} options - The replace options.
   *
   * @returns {Promise} The promise of the result.
   */
  replaceOne(
    database: string,
    collection: string,
    filter: Document,
    replacement: Document,
    options?: Document,
    dbOptions?: Document) : Promise<Result>;

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
    filter: Document,
    update: Document,
    options?: Document,
    dbOptions?: Document) : Promise<Result>;

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
    filter: Document,
    update: Document,
    options?: Document,
    dbOptions?: Document) : Promise<Result>;

  /**
   * @param {String} db - the db name
   * @param spec
   * @param options
   * @return {any}
   */
  runCommand(
    db: string,
    spec: Document,
    options?: Document): Promise<Result>;
}

export default Writable;
