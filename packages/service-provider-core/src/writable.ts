import Document from './document';
import Result from './result';
import BulkWriteResult from './bulk-write-result';

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
    dbOptions?: Document) : Promise<BulkWriteResult>;

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
    docs: Document[],
    options?: Document,
    dbOptions?: Document) : Promise<Result>;

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
    doc: Document,
    options?: Document,
    dbOptions?: Document) : Promise<Result>;

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
   * Deprecated save command.
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
    doc: Document,
    options?: Document,
    dbOptions?: Document): Promise<Result>

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

  /**
   * Drop a database
   *
   * @param {String} database - The database name.
   * @param {WriteConcernDoc} writeConcern - The write concern.
   *
   * @returns {Promise<Result>} The result of the operation.
   */
  dropDatabase(
    database: string,
    writeConcern?: Document
  ) : Promise<Result>;

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
    query: Document,
    options?: Document,
    dbOptions?: Document): Promise<Result>;
}

export default Writable;
