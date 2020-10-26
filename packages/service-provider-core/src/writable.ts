import Document from './document';
import Result from './result';
import BulkWriteResult from './bulk-write-result';
import CommandOptions from './command-options';
import WriteConcern from './write-concern';
import DatabaseOptions from './database-options';

type DeleteWriteResult = {
  result: {
    ok?: number;
    n?: number;
  };
  connection?: any;
  deletedCount?: number;
};

type FindAndModifyResult = {
  value?: any;
  lastErrorObject?: any;
  ok?: number;
};

type InsertResult = {
  insertedCount: number;
  ops: any[];
  connection: any;
  result: { ok: number; n: number };
};
type InsertOneResult = InsertResult & { insertedId: any };
type InsertManyResult = InsertResult & { insertedIds: { [key: number]: any } };

type UpdateResult = {
  result: { ok: number; n: number; nModified: number };
  connection: any;
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
  upsertedId: { _id: any };
};
type ReplaceResult = UpdateResult & { ops: any [] };

/**
 * Interface for write operations in the CRUD specification.
 */
export default interface Writable {

  /**
   * @param {String} db - the db name
   * @param spec
   * @param options
   * @param {DatabaseOptions} dbOptions - The database options
   * @return {Promise<Result>}
   */
  runCommand(
    db: string,
    spec: Document,
    options?: CommandOptions,
    dbOptions?: DatabaseOptions
  ): Promise<any>;

  /**
   * @param {String} db - the db name
   * @param spec
   * @param options
   * @param {DatabaseOptions} dbOptions - The database options
   * @return {Promise<Result>}
   */
  runCommandWithCheck(
    db: string,
    spec: Document,
    options?: CommandOptions,
    dbOptions?: DatabaseOptions
  ): Promise<any>;

  /**
   * Drop a database
   *
   * @param {String} database - The database name.
   * @param {WriteConcern} writeConcern - The write concern.
   * @param {DatabaseOptions} dbOptions - The database options
   *
   * @returns {Promise<Result>} The result of the operation.
   */
  dropDatabase(
    database: string,
    writeConcern?: WriteConcern,
    dbOptions?: DatabaseOptions
  ): Promise<Result>;

  /**
   * Execute a mix of write operations.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Document} requests - The bulk write requests.
   * @param {Document} options - The bulk write options.
   * @param {DatabaseOptions} dbOptions - The database options
   *
   * @returns {Promise} The promise of the result.
   */
  bulkWrite(
    database: string,
    collection: string,
    requests: Document,
    options?: Document,
    dbOptions?: DatabaseOptions): Promise<BulkWriteResult>;

  /**
   * Delete multiple documents from the collection.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Document} filter - The filter.
   * @param {Document} options - The delete many options.
   * @param {DatabaseOptions} dbOptions - The database options
   *
   * @returns {Promise} The promise of the result.
   */
  deleteMany(
    database: string,
    collection: string,
    filter: Document,
    options?: Document,
    dbOptions?: DatabaseOptions): Promise<DeleteWriteResult>;

  /**
   * Delete one document from the collection.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Document} filter - The filter.
   * @param {Document} options - The delete one options.
   * @param {DatabaseOptions} dbOptions - The database options
   *
   * @returns {Promise} The promise of the result.
   */
  deleteOne(
    database: string,
    collection: string,
    filter: Document,
    options?: Document,
    dbOptions?: DatabaseOptions): Promise<DeleteWriteResult>;

  /**
   * Find one document and delete it.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Document} filter - The filter.
   * @param {Document} options - The find options.
   * @param {DatabaseOptions} dbOptions - The database options
   *
   * @returns {Promise} The promise of the result.
   */
  findOneAndDelete(
    database: string,
    collection: string,
    filter: Document,
    options?: Document,
    dbOptions?: DatabaseOptions): Promise<FindAndModifyResult>;

  /**
   * Find one document and replace it.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Document} filter - The filter.
   * @param {Document} replacement - The replacement.
   * @param {Document} options - The find options.
   * @param {DatabaseOptions} dbOptions - The database options
   *
   * @returns {Promise} The promise of the result.
   */
  findOneAndReplace(
    database: string,
    collection: string,
    filter: Document,
    replacement: Document,
    options?: Document,
    dbOptions?: DatabaseOptions): Promise<FindAndModifyResult>;

  /**
   * Find one document and update it.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Document} filter - The filter.
   * @param {(Document|Array)} update - The update.
   * @param {Document} options - The find options.
   * @param {DatabaseOptions} dbOptions - The DB options
   *
   * @returns {Promise} The promise of the result.
   */
  findOneAndUpdate(
    database: string,
    collection: string,
    filter: Document,
    update: Document,
    options?: Document,
    dbOptions?: DatabaseOptions): Promise<FindAndModifyResult>;

  /**
   * Insert many documents into the colleciton.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Array} docs - The documents.
   * @param {Document} options - The insert many options.
   * @param {DatabaseOptions} dbOptions - The DB options
   *
   * @returns {Promise} The promise of the result.
   */
  insertMany(
    database: string,
    collection: string,
    docs: Document[],
    options?: Document,
    dbOptions?: DatabaseOptions): Promise<InsertManyResult>;

  /**
   * Insert one document into the collection.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Document} doc - The document.
   * @param {Document} options - The insert one options.
   * @param {DatabaseOptions} dbOptions - The DB options
   *
   * @returns {Promise} The promise of the result.
   */
  insertOne(
    database: string,
    collection: string,
    doc: Document,
    options?: Document,
    dbOptions?: DatabaseOptions): Promise<InsertOneResult>;

  /**
   * Replace a document with another.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Document} filter - The filter.
   * @param {Document} replacement - The replacement document for matches.
   * @param {Document} options - The replace options.
   * @param {DatabaseOptions} dbOptions - The DB options
   *
   * @returns {Promise} The promise of the result.
   */
  replaceOne(
    database: string,
    collection: string,
    filter: Document,
    replacement: Document,
    options?: Document,
    dbOptions?: DatabaseOptions): Promise<ReplaceResult>;

  /**
   * Update many document.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Document} filter - The filter.
   * @param {(Document|Array)} update - The updates.
   * @param {Document} options - The update options.
   * @param {DatabaseOptions} dbOptions - The DB options
   *
   * @returns {Promise} The promise of the result.
   */
  updateMany(
    database: string,
    collection: string,
    filter: Document,
    update: Document,
    options?: Document,
    dbOptions?: DatabaseOptions): Promise<UpdateResult>;

  /**
   * find and update or remove a document.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Document} query - The filter.
   * @param {Document} sort - The sort option.
   * @param {Document} update - The update document.
   * @param {Document} options - The update options.
   * @param {DatabaseOptions} dbOptions - The DB options
   *
   * @returns {Promise} The promise of the result.
   */
  findAndModify(
    database: string,
    collection: string,
    query: Document,
    sort: any[] | Document | undefined,
    update: Document | undefined,
    options?: Document,
    dbOptions?: DatabaseOptions
  ): Promise<FindAndModifyResult>;

  /**
   * Update a document.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Document} filter - The filter.
   * @param {(Document|Array)} update - The updates.
   * @param {Document} options - The update options.
   * @param {DatabaseOptions} dbOptions - The DB options
   *
   * @returns {Promise} The promise of the result.
   */
  updateOne(
    database: string,
    collection: string,
    filter: Document,
    update: Document,
    options?: Document,
    dbOptions?: DatabaseOptions): Promise<UpdateResult>;

  /**
   * Deprecated save command.
   *
   * @param {String} database - The db name.
   * @param {String} collection - The collection name.
   * @param {Object} doc - The doc.
   * @param {Object} options - The options.
   * @param {DatabaseOptions} dbOptions - The DB options
   * @return {Promise}
   */
  save(
    database: string,
    collection: string,
    doc: Document,
    options?: Document,
    dbOptions?: DatabaseOptions): Promise<Result>;

  /**
   * Deprecated remove command.
   *
   * @param {String} database - The db name.
   * @param {String} collection - The collection name.
   * @param {Object} query - The query.
   * @param {Object} options - The options.
   * @param {DatabaseOptions} dbOptions - The database options
   *
   * @return {Promise}
   */
  remove(
    database: string,
    collection: string,
    query: Document,
    options?: Document,
    dbOptions?: DatabaseOptions): Promise<Result>;

  /**
   * Converts an existing, non-capped collection to
   * a capped collection within the same database.
   *
   * @param {String} database - The db name.
   * @param {String} collection - The collection name.
   * @param {String} size - The maximum size, in bytes, for the capped collection.
   * @param {CommandOptions} options - The command options
   *
   * @return {Promise}
   */
  convertToCapped(
    database: string,
    collection: string,
    size: number,
    options?: CommandOptions): Promise<Result>;

  /**
   * Adds new indexes to a collection.
   *
   * @param {String} database - The db name.
   * @param {String} collection - The collection name.
   * @param {Object[]} indexSpecs the spec of the indexes to be created.
   * @param {Object} options - The command options.
   * @param {DatabaseOptions} dbOptions - The database options
   * @return {Promise}
   */
  createIndexes(
    database: string,
    collection: string,
    indexSpecs: Document[],
    options?: Document,
    dbOptions?: DatabaseOptions): Promise<Result>;

  /**
   * Drop indexes for a collection.
   *
   * @param {String} database - The db name.
   * @param {String} collection - The collection name.
   * @param {string|string[]|Object|Object[]} indexes the indexes to be removed.
   * @param {CommandOptions} commandOptions - The command options.
   * @param {DatabaseOptions} dbOptions - The database options
   * @return {Promise}
   */
  dropIndexes(
    database: string,
    collection: string,
    indexes: string|string[]|Document|Document[],
    commandOptions?: CommandOptions,
    dbOptions?: DatabaseOptions): Promise<Result>;

  /**
   * Reindex all indexes on the collection.
   *
   * @param {String} database - The db name.
   * @param {String} collection - The collection name.
   * @param {CommandOptions} options - The command options.
   * @param {DatabaseOptions} dbOptions - The database options
   * @return {Promise}
   */
  reIndex(
    database: string,
    collection: string,
    options?: CommandOptions,
    dbOptions?: DatabaseOptions
  ): Promise<Result>;

  /**
   * Drops a collection.
   *
   * @param {String} database - The db name.
   * @param {String} collection - The collection name.
   * @param {DatabaseOptions} dbOptions - The database options
   *
   * @return {Promise}
   */
  dropCollection(
    database: string,
    collection: string,
    dbOptions?: DatabaseOptions
  ): Promise<boolean>;

  /**
   * @param {String} database - The db name.
   * @param {String} oldName - The collection name.
   * @param {String} newName - The new collection name.
   * @param {String} options - The options.
   * @param {DatabaseOptions} dbOptions - The database options
   */
  renameCollection(
    database: string,
    oldName: string,
    newName: string,
    options?: Document,
    dbOptions?: DatabaseOptions): Promise<Result>;

  /**
   * Initialize a bulk operation.
   *
   * @param dbName
   * @param collName
   * @param ordered
   * @param options
   * @param dbOptions
   */
  initializeBulkOp(
    dbName: string,
    collName: string,
    ordered: boolean,
    options?: any,
    dbOptions?: any
  ): Promise<any>;
}

