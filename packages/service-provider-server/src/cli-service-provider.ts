import mongodb, {
  MongoClient,
  Db
} from 'mongodb';

import {
  ServiceProvider,
  Document,
  Cursor,
  Result,
  BulkWriteResult,
  DatabaseOptions,
  WriteConcern,
  CommandOptions,
  getConnectInfo,
  ReplPlatform,
  DEFAULT_DB,
  ServiceProviderCore,
} from '@mongosh/service-provider-core';

import NodeOptions from './node/node-options';

type DropDatabaseResult = {
  ok: 0 | 1;
  dropped?: string;
};

/**
 * Default driver options we always use.
 */
const DEFAULT_DRIVER_OPTIONS = Object.freeze({
  useNewUrlParser: true,
  useUnifiedTopology: true
});

/**
 * Default driver method options we always use.
 */
const DEFAULT_BASE_OPTIONS = Object.freeze({
  serializeFunctions: true
});

/**
 * Encapsulates logic for the service provider for the mongosh CLI.
 */
class CliServiceProvider extends ServiceProviderCore implements ServiceProvider {
  public readonly platform: ReplPlatform;
  public readonly initialDb: string;
  /**
   * Create a new CLI service provider from the provided URI.
   *
   * @param {String} uri - The URI.
   * @param {NodeOptions} options - The options.
   * @param {Object} cliOptions - Options passed through CLI. Right now only being used for nodb.
   *
   * @returns {Promise} The promise with cli service provider.
   */
  static async connect(
    uri: string,
    options: NodeOptions = {},
    cliOptions: any = {}
  ): Promise<CliServiceProvider> {
    const clientOptions: any = {
      ...DEFAULT_DRIVER_OPTIONS,
      ...options
    };

    const mongoClient = !cliOptions.nodb ?
      await MongoClient.connect(
        uri,
        clientOptions
      ) :
      new MongoClient(uri, clientOptions);

    return new CliServiceProvider(mongoClient, uri);
  }

  private readonly mongoClient: MongoClient;
  private readonly uri?: string;

  /**
   * Instantiate a new CliServiceProvider with the Node driver's connected
   * MongoClient instance.
   *
   * @param {MongoClient} mongoClient - The Node drivers' MongoClient instance.
   * @param {string} uri - optional URI for telemetry.
   */
  constructor(mongoClient: MongoClient, uri?: string) {
    super(mongodb);
    this.mongoClient = mongoClient;
    this.uri = uri;
    this.platform = ReplPlatform.CLI;
    try {
      this.initialDb = mongoClient.s.options.dbName || DEFAULT_DB;
    } catch (err) {
      this.initialDb = DEFAULT_DB;
    }
  }

  async getNewConnection(uri: string, options: NodeOptions = {}): Promise<CliServiceProvider> {
    const clientOptions: any = {
      ...DEFAULT_DRIVER_OPTIONS,
      ...options
    };

    const mongoClient = await MongoClient.connect(
      uri,
      clientOptions
    );
    return new CliServiceProvider(mongoClient, uri);
  }

  async getConnectionInfo(): Promise<any> {
    const buildInfo = await this.buildInfo();
    const topology = await this.getTopology();
    const { version } = require('../package.json');
    let cmdLineOpts = null;
    try {
      cmdLineOpts = await this.getCmdLineOpts();
      // eslint-disable-next-line no-empty
    } catch (e) {
    }

    const connectInfo = getConnectInfo(
      this.uri ? this.uri : '',
      version,
      buildInfo,
      cmdLineOpts,
      topology
    );

    return {
      buildInfo: buildInfo,
      topology: topology,
      extraInfo: connectInfo
    };
  }

  async renameCollection(
    database: string,
    oldName: string,
    newName: string,
    options: Document = {},
    dbOptions?: DatabaseOptions): Promise<any> {
    options = { ...DEFAULT_BASE_OPTIONS, ...options };
    return await this.db(database, dbOptions)
      .renameCollection(oldName, newName, options);
  }

  async findAndModify(
    database: string,
    collection: string,
    query: Document,
    sort: any[] | Document,
    update: Document,
    options: Document = {},
    dbOptions?: DatabaseOptions
  ): Promise<any> {
    options = { ...DEFAULT_BASE_OPTIONS, ...options };
    return await this.db(database, dbOptions)
      .collection(collection)
      .findAndModify(query, sort, update, options);
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
  async convertToCapped(
    database: string,
    collection: string,
    size: number,
    options: CommandOptions = {},
    dbOptions?: DatabaseOptions
  ): Promise<any> {
    options = { ...DEFAULT_BASE_OPTIONS, ...options };
    const result: any = await this.runCommand(
      database,
      {
        convertToCapped: collection,
        size: size
      },
      options,
      dbOptions
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
  private db(name: string, dbOptions?: DatabaseOptions): Db {
    const optionsWithForceNewInstace: DatabaseOptions = {
      ...dbOptions,

      // Without this option any read/write concerns
      // and read preferences, as well as other db options
      // will only affect one (the first) method call per db.
      // Each subsequent calls would use the same options as
      // the previous one.
      returnNonCachedInstance: true
    };

    return this.mongoClient.db(name, optionsWithForceNewInstace);
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

   * @returns {Cursor} The aggregation cursor.
   */
  aggregate(
    database: string,
    collection: string,
    pipeline: Document[] = [],
    options: Document = {},
    dbOptions?: DatabaseOptions): Cursor {
    options = { ...DEFAULT_BASE_OPTIONS, ...options };
    return this.db(database, dbOptions)
      .collection(collection)
      .aggregate(pipeline, options);
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
   *      j: Optional<Boolean>
   *      w: Optional<Int32 | String>
   *      wtimeoutMS: Optional<Int64>
   * @return {any}
   */
  aggregateDb(
    database: string,
    pipeline: Document[] = [],
    options: Document = {},
    dbOptions?: DatabaseOptions): Cursor {
    options = { ...DEFAULT_BASE_OPTIONS, ...options };
    const db: any = (this.db(database, dbOptions) as any);
    return db.aggregate(pipeline, options);
  }

  /**
   * @param {String} database - the db name
   * @param {String} collection - the collection name
   * @param requests
   * @param options
   *      ordered: Boolean;
   *      bypassDocumentValidation: Optional<Boolean>;
   * @param dbOptions
   *      j: Optional<Boolean>
   *      w: Optional<Int32 | String>
   *      wtimeoutMS: Optional<Int64>
   *    readConcern:
   *        level: <String local|majority|linearizable|available>
   * @return {any}
   */
  bulkWrite(
    database: string,
    collection: string,
    requests,
    options: Document = {},
    dbOptions?: DatabaseOptions): Promise<BulkWriteResult> {
    options = { ...DEFAULT_BASE_OPTIONS, ...options };
    return this.db(database, dbOptions)
      .collection(collection)
      .bulkWrite(requests as any[], options);
  }

  /**
   * Close the connection.
   *
   * @param {boolean} force - Whether to force close the connection.
   */
  close(force: boolean): Promise<void> {
    return this.mongoClient.close(force);
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
    options: Document = {},
    dbOptions?: DatabaseOptions): Promise<Result> {
    options = { ...DEFAULT_BASE_OPTIONS, ...options };
    return this.db(database, dbOptions)
      .collection(collection)
      .count(query, options);
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
    dbOptions?: DatabaseOptions): Promise<Result> {
    options = { ...DEFAULT_BASE_OPTIONS, ...options };
    return this.db(database, dbOptions)
      .collection(collection)
      .countDocuments(filter, options);
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
    dbOptions?: DatabaseOptions): Promise<Result> {
    options = { ...DEFAULT_BASE_OPTIONS, ...options };
    return this.db(database, dbOptions)
      .collection(collection)
      .deleteMany(filter, options);
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
    dbOptions?: DatabaseOptions): Promise<Result> {
    options = { ...DEFAULT_BASE_OPTIONS, ...options };
    return this.db(database, dbOptions)
      .collection(collection)
      .deleteOne(filter, options);
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
    dbOptions?: DatabaseOptions): Promise<any> {
    options = { ...DEFAULT_BASE_OPTIONS, ...options };
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
    dbOptions?: DatabaseOptions): Promise<Result> {
    options = { ...DEFAULT_BASE_OPTIONS, ...options };
    return this.db(database, dbOptions)
      .collection(collection)
      .estimatedDocumentCount(options);
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
    options: Document = {},
    dbOptions?: DatabaseOptions): Cursor {
    const findOptions: any = { ...DEFAULT_BASE_OPTIONS, ...options };
    if ('allowPartialResults' in findOptions) {
      findOptions.partial = findOptions.allowPartialResults;
    }
    if ('noCursorTimeout' in findOptions) {
      findOptions.timeout = findOptions.noCursorTimeout;
    }
    if ('tailable' in findOptions) {
      findOptions.cursorType = findOptions.tailable ? 'TAILABLE' : 'NON_TAILABLE'; // TODO
    }
    return this.db(database, dbOptions)
      .collection(collection)
      .find(filter, findOptions);
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
    dbOptions?: DatabaseOptions): Promise<Result> {
    options = { ...DEFAULT_BASE_OPTIONS, ...options };
    return this.db(database, dbOptions)
      .collection(collection).
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
    options: Document = {},
    dbOptions?: DatabaseOptions): Promise<Result> {
    const findOneAndReplaceOptions: any = { ...DEFAULT_BASE_OPTIONS, ...options };
    if ('returnDocument' in options) {
      findOneAndReplaceOptions.returnOriginal = options.returnDocument;
      delete findOneAndReplaceOptions.returnDocument;
    }

    return (
      this.db(database, dbOptions).collection(collection) as any
    ).findOneAndReplace(filter, replacement, findOneAndReplaceOptions);
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
    options: Document = {},
    dbOptions?: DatabaseOptions): Promise<Result> {
    const findOneAndUpdateOptions: any = { ...DEFAULT_BASE_OPTIONS, ...options };
    if ('returnDocument' in options) {
      findOneAndUpdateOptions.returnOriginal = options.returnDocument;
      delete findOneAndUpdateOptions.returnDocument;
    }

    return this.db(database, dbOptions)
      .collection(collection)
      .findOneAndUpdate(
        filter,
        update,
        findOneAndUpdateOptions
      );
  }

  /**
   * Insert many documents into the collection.
   *
   * @param {string} database - The database name.
   * @param {string} collection - The collection name.
   * @param {Document[]} [docs=[]] - The documents.
   * @param {Document} [options={}] - options - The insert many options.
   * @param {DatabaseOptions} [dbOptions] - The database options.
   *
   * @returns {Promise<Result>}
   */
  insertMany(
    database: string,
    collection: string,
    docs: Document[] = [],
    options: Document = {},
    dbOptions?: DatabaseOptions): Promise<Result> {
    options = { ...DEFAULT_BASE_OPTIONS, ...options };
    return this.db(database, dbOptions)
      .collection(collection)
      .insertMany(docs, options);
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
    dbOptions?: DatabaseOptions): Promise<Result> {
    options = { ...DEFAULT_BASE_OPTIONS, ...options };
    return this.db(database, dbOptions)
      .collection(collection)
      .insertOne(doc, options);
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
    collection: string,
    dbOptions?: DatabaseOptions): Promise<Result> {
    return this.db(database, dbOptions).collection(collection).isCapped();
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
    dbOptions?: DatabaseOptions): Promise<Result> {
    options = { ...DEFAULT_BASE_OPTIONS, ...options };
    return this.db(database, dbOptions)
      .collection(collection)
      .remove(query, options);
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
    dbOptions?: DatabaseOptions): Promise<Result> {
    options = { ...DEFAULT_BASE_OPTIONS, ...options };
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
    dbOptions?: DatabaseOptions
  ): Promise<Result> {
    options = { ...DEFAULT_BASE_OPTIONS, ...options };
    return this.db(database, dbOptions)
      .collection(collection)
      .replaceOne(filter, replacement, options);
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
    options: CommandOptions = {},
    dbOptions?: DatabaseOptions
  ): Promise<Result> {
    options = { ...DEFAULT_BASE_OPTIONS, ...options };
    const db: any = this.db(database, dbOptions);
    return db.command(
      spec,
      options
    );
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
    dbOptions?: DatabaseOptions): Promise<Result> {
    options = { ...DEFAULT_BASE_OPTIONS, ...options };
    return await this.db(database, dbOptions)
      .collection(collection)
      .updateMany(filter, update, options);
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
    dbOptions?: DatabaseOptions): Promise<Result> {
    options = { ...DEFAULT_BASE_OPTIONS, ...options };
    return this.db(database, dbOptions)
      .collection(collection)
      .updateOne(filter, update, options);
  }

  /**
   * Return current topology.
   *
   * @returns {Promise} topology.
   */
  getTopology(): any {
    return this.mongoClient.topology;
  }

  /**
   * Return buildInfo.
   *
   * @returns {Promise} buildInfo.
   */
  async buildInfo(): Promise<Result> {
    const result: any = await this.runCommand(
      'admin',
      {
        buildInfo: 1
      },
      {}
    );

    if (!result) return;

    return result;
  }

  /**
   * Return cmdLineOpts.
   *
   * @returns {Promise} buildInfo.
   */
  async getCmdLineOpts(): Promise<Result> {
    const result: any = await this.runCommand(
      'admin', { getCmdLineOpts: 1 }, {}
    );

    if (!result) return;

    return result;
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
    writeConcern: WriteConcern = {},
    dbOptions: DatabaseOptions = {}
  ): Promise<DropDatabaseResult> {
    const nativeResult = await (this.db(db, dbOptions) as any)
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
    dbOptions?: DatabaseOptions): Promise<Result> {
    options = { ...DEFAULT_BASE_OPTIONS, ...options };
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
    dbOptions?: DatabaseOptions): Promise<Result> {
    return this.db(database, dbOptions)
      .collection(collection)
      .listIndexes()
      .toArray();
  }

  /**
   * Drop indexes for a collection
   *
   * @param {string} database - the db name.
   * @param {string} collection - the collection name.
   * @param {(string|string[]|Document|Document[])} indexes - the indexes to be removed.
   * @param {CommandOptions} [options] - The command options.
   * @param {DatabaseOptions} [dbOptions] - The database options.
   *
   * @returns {Promise<Result>}
   */
  async dropIndexes(
    database: string,
    collection: string,
    indexes: string|string[]|Document|Document[],
    options: CommandOptions = {},
    dbOptions?: DatabaseOptions): Promise<Result> {
    options = { ...DEFAULT_BASE_OPTIONS, ...options };
    return await this.runCommand(database, {
      dropIndexes: collection,
      index: indexes,
    }, options, dbOptions);
  }

  /**
   * Returns an array of collection infos
   *
   * @param {String} database - The db name.
   * @param {Document} filter - The filter.
   * @param {Document} options - The command options.
   * @param {Object} dbOptions - The database options
   *  (i.e. readConcern, writeConcern. etc).
   *
   * @return {Promise}
   */
  async listCollections(
    database: string,
    filter: Document = {},
    options: Document = {},
    dbOptions?: DatabaseOptions): Promise<Result> {
    options = { ...DEFAULT_BASE_OPTIONS, ...options };
    return await this.db(database, dbOptions).listCollections(
      filter, options
    ).toArray();
  }

  /**
   * Get all the collection statistics.
   *
   * @param {String} database - The db name.
   * @param {String} collection - The collection name.
   * @param {Object} options - The count options.
   * @param {Object} dbOptions - The database options
   * @return {Promise} returns Promise
   */
  async stats(
    database: string,
    collection: string,
    options: Document = {},
    dbOptions?: DatabaseOptions): Promise<any> {
    options = { ...DEFAULT_BASE_OPTIONS, ...options };
    return await this.db(database, dbOptions)
      .collection(collection)
      .stats(options);
  }

  /**
   * Reindex all indexes on the collection.
   *
   * @param {String} database - The db name.
   * @param {String} collection - The collection name.
   * @param {Object} options - The command options.
   * @param {Object} dbOptions - The database options (i.e. readConcern, writeConcern. etc).
   * @return {Promise}
   */
  async reIndex(
    database: string,
    collection: string,
    options: CommandOptions = {},
    dbOptions?: DatabaseOptions
  ): Promise<Result> {
    options = { ...DEFAULT_BASE_OPTIONS, ...options };
    return await this.runCommand(database, {
      reIndex: collection
    }, options, dbOptions);
  }

  /**
   * Drops a the collection.
   *
   * @param {String} database - The db name.
   * @param {String} collection - The collection name.
   * @param {Object} dbOptions - The database options (i.e. readConcern, writeConcern. etc).
   *
   * @return {Promise}
   */
  async dropCollection(
    database: string,
    collection: string,
    dbOptions?: DatabaseOptions
  ): Promise<boolean> {
    return this.db(database, dbOptions)
      .collection(collection)
      .drop();
  }
}

export default CliServiceProvider;
