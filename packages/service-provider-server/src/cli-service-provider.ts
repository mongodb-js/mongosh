import { MongoClient, Db } from 'mongodb';

import {
  ServiceProvider,
  Document,
  Cursor,
  Result,
  BulkWriteResult
} from '@mongosh/service-provider-core';

import NodeOptions from './node/node-options';
import NodeCursor from './node/node-cursor';

type DropDatabaseResult = {
  ok: 0 | 1;
  dropped?: string;
};

/**
 * Default driver options we always use.
 */
const DEFAULT_OPTIONS = Object.freeze({
  useNewUrlParser: true,
  useUnifiedTopology: true
});

/**
 * Encapsulates logic for the service provider for the mongosh CLI.
 */
class CliServiceProvider implements ServiceProvider {
  /**
   * Create a new CLI service provider from the provided URI.
   *
   * @param {String} uri - The URI.
   * @param {NodeOptions} options - The options.
   *
   * @returns {Promise} The promise with cli service provider.
   */
  static async connect(
    uri: string,
    options: NodeOptions = {}
  ): Promise<CliServiceProvider> {
    const clientOptions: any = {
      ...DEFAULT_OPTIONS,
      ...options
    };

    const mongoClient = await MongoClient.connect(
      uri,
      clientOptions
    );

    return new CliServiceProvider(mongoClient);
  }

  private readonly mongoClient: MongoClient;

  /**
   * Instantiate a new CliServiceProvider with the Node driver's connected
   * MongoClient instance.
   *
   * @param {MongoClient} mongoClient - The Node drivers' MongoClient instance.
   */
  constructor(mongoClient: MongoClient) {
    this.mongoClient = mongoClient;
  }

  /**
   * Converts an existing, non-capped collection to
   * a capped collection within the same database.
   *
   * @param {String} database - The db name.
   * @param {String} collection - The collection name.
   * @param {String} size - The maximum size, in bytes, for the capped collection.
   *
   * @return {Promise}
   */
  async convertToCapped(database: string, collection: string, size: number): Promise<any> {
    const result: any = await this.runCommand(
      database,
      {
        convertToCapped: collection,
        size: size
      },
      {}
    );

    if (!result) {
      return;
    }

    return result;
  }

  /**
   * Get the Db object from the client.
   *
   * @param {String} name - The database name.
   * @param {Object} options - The DB options.
   *
   * @returns {Db} The database.
   */
  private db(name: string, options: Document = {}): Db {
    if (Object.keys(options).length !== 0) {
      return this.mongoClient.db(name, options);
    }
    return this.mongoClient.db(name);
  }

  /**
   * Run an aggregation pipeline.
   *
   * @param {String} database - the db name
   * @param {String} collection - the collection name
   * @param pipeline
   * @param options
   *    allowDiskUse: Optional<Boolean>;
   *    batchSize: Optional<Int32>;
   *    bypassDocumentValidation: Optional<Boolean>;
   *    collation: Optional<Document>;
   *    maxTimeMS: Optional<Int64>;
   *    maxAwaitTimeMS: Optional<Int64>;
   *    comment: Optional<String>;
   *    hint: Optional<(String | Document = {})>;
   * @param dbOptions
   *    readConcern:
   *        level: <String local|majority|linearizable|available>
   *    writeConcern:
   *        j: Optional<Boolean>
   *        w: Optional<Int32 | String>
   *        wtimeoutMS: Optional<Int64>
   * @returns {Cursor} The aggregation cursor.
   */
  aggregate(
    database: string,
    collection: string,
    pipeline: Document[] = [],
    options: Document = {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dbOptions: Document = {}): Cursor {
    return new NodeCursor(
      this.db(database)
        .collection(collection)
        .aggregate(pipeline, options)
    );
  }

  /**
   * @param {String} database - the db name
   * @param pipeline
   * @param options
   *    allowDiskUse: Optional<Boolean>;
   *    batchSize: Optional<Int32>;
   *    bypassDocumentValidation: Optional<Boolean>;
   *    collation: Optional<Document>;
   *    maxTimeMS: Optional<Int64>;
   *    maxAwaitTimeMS: Optional<Int64>;
   *    comment: Optional<String>;
   *    hint: Optional<(String | Document = {})>;
   * @param dbOptions
   *    readConcern:
   *        level: <String local|majority|linearizable|available>
   *    writeConcern:
   *        j: Optional<Boolean>
   *        w: Optional<Int32 | String>
   *        wtimeoutMS: Optional<Int64>
   * @return {any}
   */
  aggregateDb(
    database: string,
    pipeline: Document[] = [],
    options: Document = {},
    dbOptions: Document = {}): Cursor {
    const db: any = (this.db(database, dbOptions) as any);
    return new NodeCursor(db.aggregate(pipeline, options));
  }

  /**
   * @param {String} database - the db name
   * @param {String} collection - the collection name
   * @param requests
   * @param options
   *      ordered: Boolean;
   *      bypassDocumentValidation: Optional<Boolean>;
   * @param dbOptions
   *    writeConcern:
   *        j: Optional<Boolean>
   *        w: Optional<Int32 | String>
   *        wtimeoutMS: Optional<Int64>
   * @return {any}
   */
  bulkWrite(
    database: string,
    collection: string,
    requests,
    options: Document = {},
    dbOptions: Document = {}): Promise<BulkWriteResult> {
    return this.db(database, dbOptions)
      .collection(collection)
      .bulkWrite(requests as any[], options);
  }

  /**
   * Close the connection.
   *
   * @param {boolean} force - Whether to force close the connection.
   */
  close(force: boolean): void {
    this.mongoClient.close(force);
  }

  /**
   * Deprecated count command.
   *
   * @param {String} database - the db name
   * @param {String} collection - the collection name
   * @param query
   * @param options
   *    collation: Optional<Document>
   *    hint: Optional<(String | Document = {})>;
   *    limit: Optional<Int64>;
   *    maxTimeMS: Optional<Int64>;
   *    skip: Optional<Int64>;
   * @param dbOptions
   *    readConcern:
   *        level: <String local|majority|linearizable|available>
   * @return {Promise<any>}
   */
  count(
    database: string,
    collection: string,
    query: Document = {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: Document = {},
    dbOptions: Document = {}): Promise<Result> {
    return this.db(database, dbOptions).collection(collection).count(query);
  }

  /**
   * Get an exact document count from the collection.
   *
   * @param {String} database - the db name
   * @param {String} collection - the collection name
   * @param filter
   * @param options
   *    hint: Optional<(String | Document = {})>;
   *    limit: Optional<Int64>;
   *    maxTimeMS: Optional<Int64>;
   *    skip: Optional<Int64>;
   * @return {any}
   */
  countDocuments(
    database: string,
    collection: string,
    filter: Document = {},
    options: Document = {},
    dbOptions: Document = {}): Promise<Result> {
    return this.db(database, dbOptions).collection(collection).
      countDocuments(filter, options);
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
    filter: Document = {},
    options: Document = {},
    dbOptions: Document = {}): Promise<Result> {
    return this.db(database, dbOptions).collection(collection).
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
    filter: Document = {},
    options: Document = {},
    dbOptions: Document = {}): Promise<Result> {
    return this.db(database, dbOptions).collection(collection).
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
    filter: Document = {},
    options: Document = {},
    dbOptions: Document = {}): Promise<any> {
    return this.db(database, dbOptions)
      .collection(collection)
      .distinct(fieldName, filter, options);
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
    options: Document = {},
    dbOptions: Document = {}): Promise<Result> {
    return this.db(database, dbOptions).collection(collection).
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
    filter: Document = {},
    options: Document = {}): Cursor {
    const findOptions: any = { ...options };
    if ('allowPartialResults' in findOptions) {
      findOptions.partial = findOptions.allowPartialResults;
    }
    if ('noCursorTimeout' in findOptions) {
      findOptions.timeout = findOptions.noCursorTimeout;
    }
    if ('tailable' in findOptions) {
      findOptions.cursorType = findOptions.tailable ? 'TAILABLE' : 'NON_TAILABLE'; // TODO
    }
    return new NodeCursor(
      this.db(database).collection(collection).find(filter, options)
    );
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
    filter: Document = {},
    options: Document = {},
    dbOptions: Document = {}): Promise<Result> {
    return this.db(database, dbOptions).collection(collection).
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
    filter: Document = {},
    replacement: Document = {},
    options: Document = {}): Promise<Result> {
    const findOneAndReplaceOptions: any = { ...options };
    if ('returnDocument' in options) {
      findOneAndReplaceOptions.returnOriginal = options.returnDocument;
      delete findOneAndReplaceOptions.returnDocument;
    }
    return (this.db(database).collection(collection) as any).
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
    filter: Document = {},
    update: Document = {},
    options: Document = {}): Promise<Result> {
    const findOneAndUpdateOptions: any = { ...options };
    if ('returnDocument' in options) {
      findOneAndUpdateOptions.returnOriginal = options.returnDocument;
      delete findOneAndUpdateOptions.returnDocument;
    }
    return (this.db(database).collection(collection) as any).
      findOneAndUpdate(filter, update, findOneAndUpdateOptions);
  }

  /**
   * Insert many documents into the collection.
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
    docs: Document[] = [],
    options: Document = {},
    dbOptions: Document = {}): Promise<Result> {
    return this.db(database, dbOptions).collection(collection).
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
    doc: Document = {},
    options: Document = {},
    dbOptions: Document = {}): Promise<Result> {
    return this.db(database, dbOptions).collection(collection).
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
    collection: string): Promise<Result> {
    return this.db(database).collection(collection).isCapped();
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
    query: Document = {},
    options: Document = {},
    dbOptions: Document = {}): Promise<Result> {
    return this.db(database, dbOptions).collection(collection).
      remove(query, options);
  }

  /**
   * Deprecated save command.
   *
   * @note: Shell API sets writeConcern via options in Document,
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
    doc: Document,
    options: Document = {},
    dbOptions: Document = {}): Promise<Result> {
    return this.db(database, dbOptions).collection(collection).
      save(doc, options);
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
    filter: Document = {},
    replacement: Document = {},
    options: Document = {},
    dbOptions: Document = {}): Promise<Result> {
    return this.db(database, dbOptions).collection(collection).
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
    spec: Document = {},
    options: Document = {},
    dbOptions: Document = {}): Promise<Result> {
    return (this.db(database, dbOptions) as any).command(spec, options as any);
  }

  /**
   * list databases.
   *
   * @param {String} database - The database name.
   *
   * @returns {Promise} The promise of command results.
   */
  listDatabases(database: string): Promise<Result> {
    return this.db(database).admin().listDatabases();
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
  async updateMany(
    database: string,
    collection: string,
    filter: Document = {},
    update: Document = {},
    options: Document = {},
    dbOptions: Document = {}): Promise<Result> {
    const result = await this.db(database, dbOptions).collection(collection).
      updateMany(filter, update, options);

    return result;
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
    filter: Document = {},
    update: Document = {},
    options: Document = {},
    dbOptions: Document = {}): Promise<Result> {
    return this.db(database, dbOptions).collection(collection).
      updateOne(filter, update, options);
  }

  /**
   * Returns the server version.
   *
   * @returns {Promise} The server version.
   */
  async getServerVersion(): Promise<string> {
    const result: any = await this.runCommand(
      'admin',
      {
        buildInfo: 1
      },
      {}
    );

    if (!result) {
      return;
    }

    return result.version;
  }

  /**
   * Drop a database
   *
   * @param {String} db - The database name.
   * @param {WriteConcernDoc} writeConcern - The write concern.
   *
   * @returns {Promise<Result>} The result of the operation.
   */
  async dropDatabase(
    db: string,
    writeConcern: Document = {}
  ): Promise<DropDatabaseResult> {
    const nativeResult = await (this.db(db) as any)
      .dropDatabase(writeConcern);

    const ok = nativeResult ? 1 : 0;
    return {
      ok,
      ...(ok ? { dropped: db } : {})
    };
  }

  /**
   * Adds new indexes to a collection.
   *
   * @param {String} database - The db name.
   * @param {String} collection - The collection name.
   * @param {Object[]} indexSpecs the spec of the intexes to be created.
   * @param {Object} options - The command options.
   * @param {Object} dbOptions - The database options (i.e. readConcern, writeConcern. etc).
   * @return {Promise}
   */
  async createIndexes(
    database: string,
    collection: string,
    indexSpecs: Document[],
    options: Document = {},
    dbOptions: Document = {}): Promise<Result> {
    return this.db(database, dbOptions)
      .collection(collection)
      .createIndexes(indexSpecs, options);
  }

  /**
   * Returns an array that holds a list of documents that identify and
   * describe the existing indexes on the collection.
   *
   * @param {String} database - The db name.
   * @param {String} collection - The collection name.
   * @param {Object} dbOptions - The database options
   *  (i.e. readConcern, writeConcern. etc).
   *
   * @return {Promise}
   */
  async getIndexes(
    database: string,
    collection: string,
    dbOptions: Document = {}): Promise<Result> {
    return this.db(database, dbOptions)
      .collection(collection)
      .listIndexes()
      .toArray();
  }

  /**
   * Drop indexes for a collection.
   *
   * @param {String} database - The db name.
   * @param {String} collection - The collection name.
   * @param {string|string[]|Object|Object[]} indexes the indexes to be removed.
   * @param {Object} options - The command options.
   * @param {Object} dbOptions - The database options (i.e. readConcern, writeConcern. etc).
   * @return {Promise}
   */
  async dropIndexes(
    database: string,
    collection: string,
    indexes: string|string[]|Document|Document[],
    options?: Document,
    dbOptions?: Document): Promise<Result> {
    return await this.runCommand(database, {
      dropIndexes: collection,
      index: indexes,
    }, options, dbOptions);
  }
}

export default CliServiceProvider;
