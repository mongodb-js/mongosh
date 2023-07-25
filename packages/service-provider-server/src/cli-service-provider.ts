import type {
  Auth,
  AuthMechanism,
  ClientMetadata,
  ReadPreferenceFromOptions,
  ReadPreferenceLike,
  OperationOptions,
  RunCommandCursor,
  RunCursorCommandOptions,
} from 'mongodb';
import { MongoClient, ReadPreference, BSON } from 'mongodb';

import type {
  ServiceProvider,
  ReplPlatform,
  ShellAuthOptions,
  // Driver types:
  AggregateOptions,
  AggregationCursor,
  AnyBulkWriteOperation,
  BulkWriteOptions,
  BulkWriteResult,
  ClientSessionOptions,
  Collection,
  CountDocumentsOptions,
  CountOptions,
  CreateCollectionOptions,
  CreateIndexesOptions,
  FindCursor,
  Db,
  DbOptions,
  DeleteOptions,
  DeleteResult,
  DistinctOptions,
  Document,
  DropCollectionOptions,
  DropDatabaseOptions,
  EstimatedDocumentCountOptions,
  FindOneAndDeleteOptions,
  FindOneAndReplaceOptions,
  FindOneAndUpdateOptions,
  FindOptions,
  IndexDescription,
  InsertManyResult,
  InsertOneOptions,
  InsertOneResult,
  ListCollectionsOptions,
  ListDatabasesOptions,
  ListIndexesOptions,
  MongoClientOptions,
  ReadConcern,
  RenameOptions,
  ReplaceOptions,
  RunCommandOptions,
  ClientSession,
  UpdateOptions,
  UpdateResult,
  WriteConcern,
  ChangeStreamOptions,
  ChangeStream,
  FLE,
  AutoEncryptionOptions,
  ClientEncryption as MongoCryptClientEncryption,
} from '@mongosh/service-provider-core';
import {
  getConnectInfo,
  DEFAULT_DB,
  ServiceProviderCore,
} from '@mongosh/service-provider-core';

import {
  connectMongoClient,
  DevtoolsConnectOptions,
} from '@mongodb-js/devtools-connect';
import { MongoshCommandFailed, MongoshInternalError } from '@mongosh/errors';
import type { MongoshBus } from '@mongosh/types';
import { forceCloseMongoClient } from './mongodb-patches';
import {
  ConnectionString,
  CommaAndColonSeparatedRecord,
} from 'mongodb-connection-string-url';
import { EventEmitter } from 'events';
import type { CreateEncryptedCollectionOptions } from '@mongosh/service-provider-core';
import type { DevtoolsConnectionState } from '@mongodb-js/devtools-connect';
import { isDeepStrictEqual } from 'util';

const bsonlib = {
  Binary: BSON.Binary,
  Code: BSON.Code,
  DBRef: BSON.DBRef,
  Double: BSON.Double,
  Int32: BSON.Int32,
  Long: BSON.Long,
  MinKey: BSON.MinKey,
  MaxKey: BSON.MaxKey,
  ObjectId: BSON.ObjectId,
  Timestamp: BSON.Timestamp,
  Decimal128: BSON.Decimal128,
  BSONSymbol: BSON.BSONSymbol,
  calculateObjectSize: BSON.calculateObjectSize,
  EJSON: BSON.EJSON,
  BSONRegExp: BSON.BSONRegExp,
};

type DropDatabaseResult = {
  ok: 0 | 1;
  dropped?: string;
};

type ConnectionInfo = {
  buildInfo: any;
  topology: any;
  extraInfo: ExtraConnectionInfo;
};
type ExtraConnectionInfo = ReturnType<typeof getConnectInfo> & { fcv?: string };

/**
 * Default driver options we always use.
 */
const DEFAULT_DRIVER_OPTIONS: MongoClientOptions = Object.freeze({});

/**
 * Default driver method options we always use.
 */
const DEFAULT_BASE_OPTIONS: OperationOptions = Object.freeze({
  serializeFunctions: true,
  promoteLongs: false,
});

/**
 * Pick properties of `uri` and `opts` that as a tuple that can be matched
 * against the correspondiung tuple for another `uri` and `opts` configuration,
 * and when they do, it is meaningful to share connection state between them.
 *
 * Currently, this is only used for OIDC. We don't need to make sure that the
 * configuration matches; what we *need* to avoid, however, is a case in which
 * the same OIDC plugin instance gets passed to different connections whose
 * endpoints don't have a trust relationship (i.e. different hosts) or where
 * the usernames don't match, so that access tokens for one user on a given host
 * do not end up being sent to a different host or for a different user.
 */
function normalizeEndpointAndAuthConfiguration(
  uri: ConnectionString,
  opts: DevtoolsConnectOptions
) {
  const search = uri.typedSearchParams<DevtoolsConnectOptions>();
  const authMechProps = new CommaAndColonSeparatedRecord(
    search.get('authMechanismProperties')
  );

  return [
    uri.protocol,
    uri.hosts,
    opts.auth?.username ?? uri.username,
    opts.auth?.password ?? uri.password,
    opts.authMechanism ?? search.get('authMechanism'),
    opts.authSource ?? search.get('authSource'),
    { ...Object.fromEntries(authMechProps), ...opts.authMechanismProperties },
  ];
}

interface DependencyVersionInfo {
  nodeDriverVersion?: string;
  libmongocryptVersion?: string;
  libmongocryptNodeBindingsVersion?: string;
}

/**
 * Encapsulates logic for the service provider for the mongosh CLI.
 */
class CliServiceProvider
  extends ServiceProviderCore
  implements ServiceProvider
{
  /**
   * Create a new CLI service provider from the provided URI.
   *
   * @param {String} uri - The URI.
   * @param {DevtoolsConnectOptions} driverOptions - The options.
   * @param {Object} cliOptions - Options passed through CLI. Right now only being used for nodb.
   *
   * @returns {Promise} The promise with cli service provider.
   */
  static async connect(
    this: typeof CliServiceProvider,
    uri: string,
    driverOptions: DevtoolsConnectOptions,
    cliOptions: { nodb?: boolean } = {},
    bus: MongoshBus = new EventEmitter() // TODO: Change VSCode to pass all arguments, then remove defaults
  ): Promise<CliServiceProvider> {
    const connectionString = new ConnectionString(uri || 'mongodb://nodb/');
    const clientOptions = this.processDriverOptions(
      null,
      connectionString,
      driverOptions
    );
    if (process.env.MONGOSH_TEST_FORCE_API_STRICT) {
      clientOptions.serverApi = {
        version:
          typeof clientOptions.serverApi === 'string'
            ? clientOptions.serverApi
            : clientOptions.serverApi?.version ?? '1',
        strict: true,
        deprecationErrors: true,
      };
    }

    let client: MongoClient;
    let state: DevtoolsConnectionState | undefined;
    if (cliOptions.nodb) {
      const clientOptionsCopy: MongoClientOptions &
        Partial<DevtoolsConnectOptions> = {
        ...clientOptions,
      };
      delete clientOptionsCopy.productName;
      delete clientOptionsCopy.productDocsLink;
      delete clientOptionsCopy.oidc;
      delete clientOptionsCopy.parentHandle;
      delete clientOptionsCopy.parentState;
      delete clientOptionsCopy.useSystemCA;
      client = new MongoClient(connectionString.toString(), clientOptionsCopy);
    } else {
      ({ client, state } = await connectMongoClient(
        connectionString.toString(),
        clientOptions,
        bus,
        MongoClient
      ));
    }
    clientOptions.parentState = state;

    return new this(client, bus, clientOptions, connectionString);
  }

  public readonly platform: ReplPlatform;
  public readonly initialDb: string;
  public mongoClient: MongoClient; // public for testing
  private readonly uri?: ConnectionString;
  private currentClientOptions: DevtoolsConnectOptions;
  private dbcache: WeakMap<MongoClient, Map<string, Db>>;
  public baseCmdOptions: OperationOptions; // public for testing
  public fle: FLE | undefined;
  private bus: MongoshBus;

  /**
   * Instantiate a new CliServiceProvider with the Node driver's connected
   * MongoClient instance.
   *
   * @param {MongoClient} mongoClient - The Node drivers' MongoClient instance.
   * @param {DevtoolsConnectOptions} clientOptions
   * @param {string} uri - optional URI for telemetry.
   */
  constructor(
    mongoClient: MongoClient,
    bus: MongoshBus,
    clientOptions: DevtoolsConnectOptions,
    uri?: ConnectionString
  ) {
    super(bsonlib);

    this.bus = bus;
    this.mongoClient = mongoClient;
    this.uri = uri;
    this.platform = 'CLI';
    try {
      this.initialDb = (mongoClient as any).s.options.dbName || DEFAULT_DB;
    } catch (err: any) {
      this.initialDb = DEFAULT_DB;
    }
    this.currentClientOptions = clientOptions;
    this.baseCmdOptions = { ...DEFAULT_BASE_OPTIONS }; // currently do not have any user-specified connection-wide command options, but I imagine we will eventually
    this.dbcache = new WeakMap();
    this.fle = CliServiceProvider.getLibmongocryptBindings();
  }

  private static getLibmongocryptBindings(): FLE | undefined {
    try {
      // The .extension() call may seem unnecessary, since that is the default
      // for the top-level exports from mongodb-client-encryption anyway.
      // However, for the browser runtime, we externalize mongodb-client-encryption
      // since it is a native addon package; that means that if 'mongodb' is
      // included in the bundle, it won't be able to find it, and instead needs
      // to receive it as an explicitly passed dependency.
      return require('mongodb-client-encryption').extension(require('mongodb'));
    } catch {
      return undefined;
    }
  }

  static getVersionInformation(): DependencyVersionInfo {
    function tryCall<Fn extends () => any>(fn: Fn): ReturnType<Fn> | undefined {
      try {
        return fn();
      } catch {
        return;
      }
    }
    return {
      nodeDriverVersion: tryCall(() => require('mongodb/package.json').version),
      libmongocryptVersion: tryCall(
        () =>
          this.getLibmongocryptBindings()?.ClientEncryption.libmongocryptVersion
      ),
      libmongocryptNodeBindingsVersion: tryCall(
        () => require('mongodb-client-encryption/package.json').version
      ),
    };
  }

  async getNewConnection(
    uri: string,
    options: Partial<DevtoolsConnectOptions> = {}
  ): Promise<CliServiceProvider> {
    const connectionString = new ConnectionString(uri);
    const clientOptions = this.processDriverOptions(connectionString, options);
    const { client, state } = await connectMongoClient(
      connectionString.toString(),
      clientOptions,
      this.bus,
      MongoClient
    );
    clientOptions.parentState = state;
    return new CliServiceProvider(
      client,
      this.bus,
      clientOptions,
      connectionString
    );
  }

  async getConnectionInfo(): Promise<ConnectionInfo> {
    const topology = this.getTopology();
    const { version } = require('../package.json');
    const [buildInfo = null, atlasVersion = null, fcv = null] =
      await Promise.all([
        this.runCommandWithCheck(
          'admin',
          { buildInfo: 1 },
          this.baseCmdOptions
        ).catch(() => {}),
        this.runCommandWithCheck(
          'admin',
          { atlasVersion: 1 },
          this.baseCmdOptions
        ).catch(() => {}),
        this.runCommandWithCheck(
          'admin',
          { getParameter: 1, featureCompatibilityVersion: 1 },
          this.baseCmdOptions
        ).catch(() => {}),
      ]);

    const extraConnectionInfo = getConnectInfo(
      this.uri?.toString() ?? '',
      version,
      buildInfo,
      atlasVersion,
      topology
    );

    return {
      buildInfo: buildInfo,
      topology: topology,
      extraInfo: {
        ...extraConnectionInfo,
        fcv: fcv?.featureCompatibilityVersion?.version,
      },
    };
  }

  async renameCollection(
    database: string,
    oldName: string,
    newName: string,
    options: RenameOptions = {},
    dbOptions?: DbOptions
  ): Promise<Collection> {
    options = { ...this.baseCmdOptions, ...options };
    return await this.db(database, dbOptions).renameCollection(
      oldName,
      newName,
      options
    );
  }

  /**
   * Get the Db object from the client.
   *
   * @param {String} name - The database name.
   * @param dbOptions
   *
   * @returns {Db} The database.
   */
  private db(name: string, dbOptions: DbOptions = {}): Db {
    const key = `${name}-${JSON.stringify(dbOptions)}`;
    const dbcache = this.getDBCache();
    const cached = dbcache.get(key);
    if (cached) {
      return cached;
    }
    const db = this.mongoClient.db(name, dbOptions);
    dbcache.set(key, db);
    return db;
  }

  /**
   * Wrapper to make this available for testing.
   */
  _dbTestWrapper(name: string, dbOptions?: DbOptions): Db {
    return this.db(name, dbOptions);
  }

  /**
   * Return the db cache for the current MongoClient.
   */
  private getDBCache(): Map<string, Db> {
    const existing = this.dbcache.get(this.mongoClient);
    if (existing) {
      return existing;
    }
    this.dbcache.set(this.mongoClient, new Map());
    return this.getDBCache();
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
    options: AggregateOptions = {},
    dbOptions?: DbOptions
  ): AggregationCursor {
    options = { ...this.baseCmdOptions, ...options };
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
    options: AggregateOptions = {},
    dbOptions?: DbOptions
  ): AggregationCursor {
    options = { ...this.baseCmdOptions, ...options };
    const db: any = this.db(database, dbOptions) as any;
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
    requests: AnyBulkWriteOperation[],
    options: BulkWriteOptions = {},
    dbOptions?: DbOptions
  ): Promise<BulkWriteResult> {
    options = { ...this.baseCmdOptions, ...options };
    return this.db(database, dbOptions)
      .collection(collection)
      .bulkWrite(requests, options);
  }

  /**
   * Close the connection.
   *
   * @param {boolean} force - Whether to force close the connection.
   */
  async close(force: boolean): Promise<void> {
    this.dbcache.set(this.mongoClient, new Map());
    if (force) {
      await forceCloseMongoClient(this.mongoClient);
    } else {
      await this.mongoClient.close();
    }
  }

  async suspend(): Promise<() => Promise<void>> {
    await this.close(true);
    return async () => {
      await this.resetConnectionOptions({});
    };
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
    options: CountOptions = {},
    dbOptions?: DbOptions
  ): Promise<number> {
    options = { ...this.baseCmdOptions, ...options };
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
   * @param dbOptions
   * @return {any}
   */
  countDocuments(
    database: string,
    collection: string,
    filter: Document = {},
    options: CountDocumentsOptions = {},
    dbOptions?: DbOptions
  ): Promise<number> {
    options = { ...this.baseCmdOptions, ...options };
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
    options: DeleteOptions = {},
    dbOptions?: DbOptions
  ): Promise<DeleteResult> {
    options = { ...this.baseCmdOptions, ...options };
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
    options: DeleteOptions = {},
    dbOptions?: DbOptions
  ): Promise<DeleteResult> {
    options = { ...this.baseCmdOptions, ...options };
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
    options: DistinctOptions = {},
    dbOptions?: DbOptions
  ): Promise<Document[]> {
    options = { ...this.baseCmdOptions, ...options };
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
    options: EstimatedDocumentCountOptions = {},
    dbOptions?: DbOptions
  ): Promise<number> {
    options = { ...this.baseCmdOptions, ...options };
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
   * @param dbOptions
   * @returns {Cursor} The cursor.
   */
  find(
    database: string,
    collection: string,
    filter: Document = {},
    options: FindOptions = {},
    dbOptions?: DbOptions
  ): FindCursor {
    const findOptions: any = { ...this.baseCmdOptions, ...options };
    if ('allowPartialResults' in findOptions) {
      findOptions.partial = findOptions.allowPartialResults;
    }
    if ('noCursorTimeout' in findOptions) {
      findOptions.timeout = findOptions.noCursorTimeout;
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
    options: FindOneAndDeleteOptions = {},
    dbOptions?: DbOptions
  ): Promise<Document> {
    options = { ...this.baseCmdOptions, ...options };
    return this.db(database, dbOptions)
      .collection(collection)
      .findOneAndDelete(filter, options);
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
   * @param dbOptions
   * @returns {Promise} The promise of the result.
   */
  findOneAndReplace(
    database: string,
    collection: string,
    filter: Document = {},
    replacement: Document = {},
    options: FindOneAndReplaceOptions = {},
    dbOptions?: DbOptions
  ): Promise<Document> {
    const findOneAndReplaceOptions: any = {
      ...this.baseCmdOptions,
      ...options,
    };

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
   * @param dbOptions
   * @returns {Promise} The promise of the result.
   */
  findOneAndUpdate(
    database: string,
    collection: string,
    filter: Document = {},
    update: Document | Document[] = {},
    options: FindOneAndUpdateOptions = {},
    dbOptions?: DbOptions
  ): Promise<Document> {
    const findOneAndUpdateOptions = { ...this.baseCmdOptions, ...options };

    return this.db(database, dbOptions)
      .collection(collection)
      .findOneAndUpdate(filter, update, findOneAndUpdateOptions) as any;
  }

  /**
   * Insert many documents into the collection.
   *
   * @param {string} database - The database name.
   * @param {string} collection - The collection name.
   * @param {Document[]} [docs=[]] - The documents.
   * @param {Document} [options={}] - options - The insert many options.
   * @param {DbOptions} [dbOptions] - The database options.
   *
   * @returns {Promise<InsertManyResult>}
   */
  insertMany(
    database: string,
    collection: string,
    docs: Document[] = [],
    options: BulkWriteOptions = {},
    dbOptions?: DbOptions
  ): Promise<InsertManyResult> {
    options = { ...this.baseCmdOptions, ...options };
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
  async insertOne(
    database: string,
    collection: string,
    doc: Document = {},
    options: InsertOneOptions = {},
    dbOptions?: DbOptions
  ): Promise<InsertOneResult> {
    options = { ...this.baseCmdOptions, ...options };
    return this.db(database, dbOptions)
      .collection(collection)
      .insertOne(doc, options);
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
    options: ReplaceOptions = {},
    dbOptions?: DbOptions
  ): Promise<UpdateResult> {
    options = { ...this.baseCmdOptions, ...options };
    return this.db(database, dbOptions)
      .collection(collection)
      .replaceOne(filter, replacement, options) as Promise<UpdateResult>;
    // `as UpdateResult` because we know we didn't request .explain() here.
  }

  /**
   * Run a command against the database.
   *
   * @param {String} database - The database name.
   * @param {Object} spec - The command specification.
   * @param {Object} options - The database options.
   * @param {Object} dbOptions - The connection-wide database options.
   *
   * @returns {Promise} The promise of command results.
   */
  runCommand(
    database: string,
    spec: Document = {},
    options: RunCommandOptions = {},
    dbOptions?: DbOptions
  ): Promise<Document> {
    options = { ...this.baseCmdOptions, ...options };
    const db = this.db(database, dbOptions);
    return db.command(spec, options);
  }

  /**
   * Run a command against the database and check the results for ok: 0.
   *
   * @param {String} database - The database name.
   * @param {Object} spec - The command specification.
   * @param {Object} options - The database options.
   * @param {Object} dbOptions - The connection-wide database options.
   *
   * @returns {Promise} The promise of command results.
   */
  async runCommandWithCheck(
    database: string,
    spec: Document = {},
    options: RunCommandOptions = {},
    dbOptions?: DbOptions
  ): Promise<Document> {
    const result = await this.runCommand(database, spec, options, dbOptions);
    if (result.ok === 0) {
      throw new MongoshCommandFailed(JSON.stringify(spec));
    }
    return result as { ok: 1 };
  }

  /**
   * Run a command against the database that returns a cursor.
   *
   * @param {String} database - The database name.
   * @param {Object} spec - The command specification.
   * @param {Object} options - The command  options.
   * @param {Object} dbOptions - The connection-wide database options.
   */
  runCursorCommand(
    database: string,
    spec: Document = {},
    options: RunCursorCommandOptions = {},
    dbOptions?: DbOptions
  ): RunCommandCursor {
    options = { ...this.baseCmdOptions, ...options };
    const db = this.db(database, dbOptions);
    return db.runCursorCommand(spec, options);
  }

  /**
   * list databases.
   *
   * @param {String} database - The database name.
   *
   * @returns {Promise} The promise of command results.
   */
  listDatabases(
    database: string,
    options: ListDatabasesOptions = {}
  ): Promise<Document> {
    options = { ...this.baseCmdOptions, ...options };
    return this.db(database).admin().listDatabases(options);
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
    options: UpdateOptions = {},
    dbOptions?: DbOptions
  ): Promise<UpdateResult> {
    options = { ...this.baseCmdOptions, ...options };
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
    options: UpdateOptions = {},
    dbOptions?: DbOptions
  ): Promise<UpdateResult> {
    options = { ...this.baseCmdOptions, ...options };
    return this.db(database, dbOptions)
      .collection(collection)
      .updateOne(filter, update, options);
  }

  /**
   * Get currently known topology information.
   */
  getTopology(): any | undefined {
    return (this.mongoClient as any).topology;
  }

  /**
   * Drop a database
   *
   * @param {String} db - The database name.
   * @param {Document} options - The write concern.
   *
   * @param dbOptions
   * @returns {Promise<Document>} The result of the operation.
   */
  async dropDatabase(
    db: string,
    options: DropDatabaseOptions = {},
    dbOptions: DbOptions = {}
  ): Promise<DropDatabaseResult> {
    const opts = { ...this.baseCmdOptions, ...options } as DropDatabaseOptions;
    const nativeResult = await this.db(db, dbOptions).dropDatabase(opts);

    const ok = nativeResult ? 1 : 0;
    return {
      ok,
      ...(ok ? { dropped: db } : {}),
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
    indexSpecs: IndexDescription[],
    options: CreateIndexesOptions = {},
    dbOptions?: DbOptions
  ): Promise<string[]> {
    options = { ...this.baseCmdOptions, ...options };
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
   * @param options
   * @param {Object} dbOptions - The database options
   *  (i.e. readConcern, writeConcern. etc).
   *
   * @return {Promise}
   */
  async getIndexes(
    database: string,
    collection: string,
    options: ListIndexesOptions = {},
    dbOptions?: DbOptions
  ): Promise<Document[]> {
    return await this.db(database, dbOptions)
      .collection(collection)
      .listIndexes({ ...this.baseCmdOptions, ...options })
      .toArray();
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
    options: ListCollectionsOptions = {},
    dbOptions?: DbOptions
  ): Promise<Document[]> {
    options = { ...this.baseCmdOptions, ...options };
    return await this.db(database, dbOptions)
      .listCollections(filter, options)
      .toArray();
  }

  /**
   * Drops a the collection.
   *
   * @param {String} database - The db name.
   * @param {String} collection - The collection name.
   * @param options
   * @param {Object} dbOptions - The database options (i.e. readConcern, writeConcern. etc).
   *
   * @return {Promise}
   */
  async dropCollection(
    database: string,
    collection: string,
    options: DropCollectionOptions = {},
    dbOptions?: DbOptions
  ): Promise<boolean> {
    return this.db(database, dbOptions)
      .collection(collection)
      .drop({ ...this.baseCmdOptions, ...options });
  }

  /**
   * Authenticate
   *
   * @param authDoc
   */
  async authenticate(authDoc: ShellAuthOptions): Promise<{ ok: 1 }> {
    // NOTE: we keep all the original options and just overwrite the auth ones.
    const auth: Auth = { username: authDoc.user, password: authDoc.pwd };
    await this.resetConnectionOptions({
      auth,
      ...(authDoc.mechanism
        ? { authMechanism: authDoc.mechanism as AuthMechanism }
        : {}),
      ...(authDoc.authDb ? { authSource: authDoc.authDb } : {}),
    });
    return { ok: 1 };
  }

  async createCollection(
    dbName: string,
    collName: string,
    options: CreateCollectionOptions = {},
    dbOptions?: DbOptions
  ): Promise<{ ok: number }> {
    options = { ...this.baseCmdOptions, ...options };
    await this.db(dbName, dbOptions).createCollection(collName, options);
    return { ok: 1 };
  }

  async createEncryptedCollection(
    dbName: string,
    collName: string,
    options: CreateEncryptedCollectionOptions,
    libmongocrypt: MongoCryptClientEncryption
  ): Promise<{ collection: Collection; encryptedFields: Document }> {
    return await libmongocrypt.createEncryptedCollection(
      this.db(dbName),
      collName,
      options
    );
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async initializeBulkOp(
    dbName: string,
    collName: string,
    ordered: boolean,
    options: BulkWriteOptions = {},
    dbOptions?: DbOptions
  ): Promise<any> {
    // Update to actual type after https://jira.mongodb.org/browse/MONGOSH-915
    if (ordered) {
      return this.db(dbName, dbOptions)
        .collection(collName)
        .initializeOrderedBulkOp(options);
    }
    return this.db(dbName, dbOptions)
      .collection(collName)
      .initializeUnorderedBulkOp(options);
  }

  getReadPreference(): ReadPreference {
    return this.mongoClient.readPreference;
  }

  getReadConcern(): ReadConcern | undefined {
    return this.mongoClient.readConcern;
  }

  getWriteConcern(): WriteConcern | undefined {
    return this.mongoClient.writeConcern;
  }

  readPreferenceFromOptions(
    options?: Omit<ReadPreferenceFromOptions, 'session'>
  ): ReadPreferenceLike | undefined {
    return ReadPreference.fromOptions(options);
  }

  /**
   * For instances where a user wants to set a option that requires a new MongoClient.
   *
   * @param options
   */
  async resetConnectionOptions(options: MongoClientOptions): Promise<void> {
    this.bus.emit('mongosh-sp:reset-connection-options');
    this.currentClientOptions = {
      ...this.currentClientOptions,
      ...options,
    };
    const clientOptions = this.processDriverOptions(
      this.uri as ConnectionString,
      this.currentClientOptions
    );
    const { client, state } = await connectMongoClient(
      (this.uri as ConnectionString).toString(),
      clientOptions,
      this.bus,
      MongoClient
    );
    try {
      await this.mongoClient.close();
      // eslint-disable-next-line no-empty
    } catch {}
    this.mongoClient = client;
    this.currentClientOptions.parentState = state;
  }

  startSession(options: ClientSessionOptions): ClientSession {
    return this.mongoClient.startSession(options);
  }

  watch(
    pipeline: Document[],
    options: ChangeStreamOptions,
    dbOptions: DbOptions = {},
    db?: string,
    coll?: string
  ): ChangeStream<Document> {
    if (db === undefined && coll === undefined) {
      // TODO: watch not exported, see NODE-2934
      return (this.mongoClient as any).watch(pipeline, options);
    } else if (db !== undefined && coll === undefined) {
      return (this.db(db, dbOptions) as any).watch(pipeline, options);
    } else if (db !== undefined && coll !== undefined) {
      return (this.db(db, dbOptions).collection(coll) as any).watch(
        pipeline,
        options
      );
    }
    throw new MongoshInternalError(
      'Cannot call watch with defined collection but undefined db'
    );
  }

  get driverMetadata(): ClientMetadata | undefined {
    return this.getTopology()?.clientMetadata;
  }

  getRawClient(): MongoClient {
    return this.mongoClient;
  }

  getURI(): string | undefined {
    return this.uri?.href;
  }

  getFleOptions(): AutoEncryptionOptions | undefined {
    return this.currentClientOptions.autoEncryption;
  }

  // Internal, only exposed for testing
  static processDriverOptions(
    currentProviderInstance: CliServiceProvider | null,
    uri: ConnectionString,
    opts: DevtoolsConnectOptions
  ): DevtoolsConnectOptions {
    const processedOptions = { ...DEFAULT_DRIVER_OPTIONS, ...opts };

    if (currentProviderInstance?.currentClientOptions) {
      for (const key of ['productName', 'productDocsLink'] as const) {
        processedOptions[key] =
          currentProviderInstance.currentClientOptions[key];
      }

      processedOptions.oidc ??= {};
      for (const key of [
        'redirectURI',
        'openBrowser',
        'openBrowserTimeout',
        'notifyDeviceFlow',
        'allowedFlows',
      ] as const) {
        // Template IIFE so that TS understands that `key` on the left-hand and right-hand side match
        (<T extends keyof typeof processedOptions.oidc>(key: T) => {
          const value =
            currentProviderInstance.currentClientOptions.oidc?.[key];
          if (value) {
            processedOptions.oidc[key] = value;
          }
        })(key);
      }
    }

    if (
      processedOptions.parentState ||
      processedOptions.parentHandle ||
      !currentProviderInstance
    ) {
      // Already set a parent state instance in the options explicitly,
      // or no state to inherit from a parent.
      return processedOptions;
    }

    const currentOpts = currentProviderInstance.currentClientOptions;
    const currentUri = currentProviderInstance.uri;
    if (
      currentUri &&
      isDeepStrictEqual(
        normalizeEndpointAndAuthConfiguration(currentUri, currentOpts),
        normalizeEndpointAndAuthConfiguration(uri, processedOptions)
      )
    ) {
      if (currentOpts.parentState) {
        processedOptions.parentState = currentOpts.parentState;
      } else if (currentOpts.parentHandle) {
        processedOptions.parentHandle = currentOpts.parentHandle;
      }
    }

    return processedOptions;
  }

  // Internal, only exposed for testing
  processDriverOptions(
    uri: ConnectionString,
    opts: Partial<DevtoolsConnectOptions>
  ): DevtoolsConnectOptions {
    return CliServiceProvider.processDriverOptions(this, uri, {
      productName: this.currentClientOptions.productName,
      productDocsLink: this.currentClientOptions.productDocsLink,
      ...opts,
    });
  }

  getSearchIndexes(
    database: string,
    collection: string,
    indexName?: string,
    // TODO(MONGOSH-1471): use ListSearchIndexesOptions once available
    options?: Document,
    dbOptions?: DbOptions
  ): Promise<Document[]> {
    const col = this.db(database, dbOptions).collection(collection);
    if (indexName === undefined) {
      return col.listSearchIndexes(options).toArray();
    } else {
      return col.listSearchIndexes(indexName, options).toArray();
    }
  }

  createSearchIndexes(
    database: string,
    collection: string,
    // TODO(MONGOSH-1471): use SearchIndexDescription[] once available
    specs: { name: string; definition: Document }[],
    dbOptions?: DbOptions
  ): Promise<string[]> {
    return this.db(database, dbOptions)
      .collection(collection)
      .createSearchIndexes(specs);
  }

  dropSearchIndex(
    database: string,
    collection: string,
    indexName: string,
    dbOptions?: DbOptions
  ): Promise<void> {
    return this.db(database, dbOptions)
      .collection(collection)
      .dropSearchIndex(indexName);
  }

  updateSearchIndex(
    database: string,
    collection: string,
    indexName: string,
    // TODO(MONGOSH-1471): use SearchIndexDescription once available
    definition: Document,
    dbOptions?: DbOptions
  ): Promise<void> {
    return this.db(database, dbOptions)
      .collection(collection)
      .updateSearchIndex(indexName, definition);
  }
}

export default CliServiceProvider;
export { DevtoolsConnectOptions };
