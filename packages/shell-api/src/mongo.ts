import {
  CommonErrors,
  MongoshCommandFailed,
  MongoshDeprecatedError,
  MongoshInternalError,
  MongoshInvalidInputError,
  MongoshRuntimeError,
  MongoshUnimplementedError,
} from '@mongosh/errors';
import {
  classPlatforms,
  platforms,
  returnsPromise,
  returnType,
  serverVersions,
  apiVersions,
  ShellApiClass,
  shellApiClassDefault,
  topologies,
  deprecated,
} from './decorators';
import type {
  ChangeStreamOptions,
  ClientSessionOptions,
  CommandOperationOptions,
  Document,
  ListDatabasesOptions,
  ReadConcernLevel,
  ReadPreference,
  ReadPreferenceLike,
  ReadPreferenceMode,
  ServiceProvider,
  TransactionOptions,
  MongoClientOptions,
  AutoEncryptionOptions as SPAutoEncryption,
  ServerApi,
  ServerApiVersion,
  WriteConcern,
} from '@mongosh/service-provider-core';
import type { ConnectionInfo } from '@mongosh/arg-parser';
import {
  mapCliToDriver,
  generateConnectionInfoFromCliArgs,
} from '@mongosh/arg-parser';
import type Collection from './collection';
import Database from './database';
import type ShellInstanceState from './shell-instance-state';
import { CommandResult } from './result';
import { redactURICredentials } from '@mongosh/history';
import { asPrintable, ServerVersions, Topologies } from './enums';
import Session from './session';
import {
  assertArgsDefinedType,
  processFLEOptions,
  isValidDatabaseName,
} from './helpers';
import ChangeStreamCursor from './change-stream-cursor';
import { blockedByDriverMetadata } from './error-codes';
import type { ClientSideFieldLevelEncryptionOptions } from './field-level-encryption';
import { KeyVault, ClientEncryption } from './field-level-encryption';
import { ShellApiErrors } from './error-codes';
import type { LogEntry } from './log-entry';
import { parseAnyLogEntry } from './log-entry';

/* Utility, inverse of Readonly<T> */
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

@shellApiClassDefault
@classPlatforms(['CLI'])
export default class Mongo extends ShellApiClass {
  private __serviceProvider: ServiceProvider | null = null;
  public readonly _databases: Record<string, Database> = Object.create(null);
  public _instanceState: ShellInstanceState;
  public _connectionInfo: ConnectionInfo;
  private _explicitEncryptionOnly = false;
  private _keyVault: KeyVault | undefined; // need to keep it around so that the ShellApi ClientEncryption class can access it
  private _clientEncryption: ClientEncryption | undefined;
  private _readPreferenceWasExplicitlyRequested = false;
  private _cachedDatabaseNames: string[] = [];

  constructor(
    instanceState: ShellInstanceState,
    uri?: string | Mongo,
    fleOptions?: ClientSideFieldLevelEncryptionOptions,
    otherOptions?: { api?: ServerApi | ServerApiVersion },
    sp?: ServiceProvider
  ) {
    super();
    this._instanceState = instanceState;
    if (sp) {
      this.__serviceProvider = sp;
    }
    if (
      typeof uri === 'object' &&
      uri !== null &&
      typeof uri._uri === 'string'
    ) {
      uri = uri._uri;
    } else if (typeof uri !== 'string') {
      uri = sp?.getURI?.() ?? 'mongodb://localhost/';
    }
    this._connectionInfo = generateConnectionInfoFromCliArgs({
      connectionSpecifier: uri,
    });
    this._readPreferenceWasExplicitlyRequested = /\breadPreference=/i.test(
      this._uri
    );
    if (fleOptions) {
      if (fleOptions.explicitEncryptionOnly !== undefined) {
        if (fleOptions.schemaMap !== undefined) {
          throw new MongoshInvalidInputError(
            'explicitEncryptionOnly and schemaMap are mutually exclusive',
            CommonErrors.InvalidArgument
          );
        }
        fleOptions = { ...fleOptions };
        this._explicitEncryptionOnly = !!fleOptions.explicitEncryptionOnly;
        delete fleOptions.explicitEncryptionOnly;
      }
      this._connectionInfo.driverOptions.autoEncryption =
        processFLEOptions(fleOptions);
    } else {
      // TODO: We may want to look into whether it makes sense
      // to inherit more options than just the FLE ones from
      // the parent service provider. For example, it could
      // appear to be odd that --awsAccessKeyId applies to
      // programmatically created Mongo() instances but
      // --apiVersion or --tlsUseSystemCA does not.
      const spFleOptions = sp?.getFleOptions?.();
      if (spFleOptions) {
        this._connectionInfo.driverOptions.autoEncryption = spFleOptions;
      }
    }
    if (otherOptions?.api) {
      if (typeof otherOptions.api === 'string') {
        this._connectionInfo.driverOptions.serverApi = {
          version: otherOptions.api,
        };
      } else {
        this._connectionInfo.driverOptions.serverApi = otherOptions.api;
      }
    }
  }

  get _uri(): string {
    return this._connectionInfo.connectionString;
  }

  get _fleOptions(): SPAutoEncryption | undefined {
    return this._connectionInfo.driverOptions.autoEncryption;
  }

  // We don't have a ServiceProvider available until we are connected, but
  // generally speaking, it's always there, so instead of using a type of
  // `ServiceProvider | null` and a data property, we use a getter that throws
  // if used too early.
  get _serviceProvider(): ServiceProvider {
    if (this.__serviceProvider === null) {
      throw new MongoshInternalError(
        'No ServiceProvider available for this mongo',
        ShellApiErrors.NotConnected
      );
    }
    return this.__serviceProvider;
  }

  // For testing.
  set _serviceProvider(sp: ServiceProvider) {
    this.__serviceProvider = sp;
  }

  async _displayBatchSize(): Promise<number> {
    return (
      this._instanceState.displayBatchSizeFromDBQuery ??
      (await this._instanceState.shellApi.config.get('displayBatchSize'))
    );
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  [asPrintable](): string {
    return redactURICredentials(this._uri);
  }

  /**
   * Internal helper for emitting mongo API call events.
   *
   * @param methodName
   * @param methodArguments
   * @private
   */
  private _emitMongoApiCall(
    methodName: string,
    methodArguments: Document = {}
  ): void {
    this._instanceState.emitApiCallWithArgs({
      method: methodName,
      class: 'Mongo',
      uri: this._uri,
      arguments: methodArguments,
    });
  }

  async connect(username?: string, password?: string): Promise<void> {
    if (username || password) {
      this._connectionInfo = mapCliToDriver(
        {
          username,
          password,
        },
        this._connectionInfo
      );
    }

    const driverOptions = { ...this._connectionInfo.driverOptions };
    if (this._explicitEncryptionOnly) {
      // Delete autoEncryption options from the copy of the options that
      // is actually used for connecting. The driver itself will not
      // know that this is a connection with CSFLE parameters.
      delete driverOptions.autoEncryption;
    } else if (driverOptions.autoEncryption) {
      driverOptions.autoEncryption.extraOptions = {
        ...driverOptions.autoEncryption.extraOptions,
        ...(await this._instanceState.evaluationListener?.getCryptLibraryOptions?.()),
      };
    }
    const parentProvider = this._instanceState.initialServiceProvider;
    try {
      this.__serviceProvider = await parentProvider.getNewConnection(
        this._uri,
        driverOptions
      );
    } catch (e: any) {
      // If the initial provider had TLS enabled, and we're not able to connect,
      // and the new URL does not contain a SSL/TLS indicator, we add a notice
      // about the fact that the behavior differs from the legacy shell here.
      if (
        e?.name === 'MongoServerSelectionError' &&
        parentProvider.getRawClient()?.options?.tls &&
        !/\b(ssl|tls)=/.exec(this._uri)
      ) {
        e.message += ' (is ?tls=true missing from the connection string?)';
      }
      throw e;
    }
  }

  _getDb(name: string): Database {
    assertArgsDefinedType([name], ['string']);
    if (!isValidDatabaseName(name)) {
      throw new MongoshInvalidInputError(
        `Invalid database name: ${name}`,
        CommonErrors.InvalidArgument
      );
    }

    if (!(name in this._databases)) {
      this._databases[name] = new Database(this, name);
    }
    return this._databases[name];
  }

  @returnType('Database')
  getDB(db: string): Database {
    assertArgsDefinedType([db], ['string'], 'Mongo.getDB');
    this._instanceState.messageBus.emit('mongosh:getDB', { db });
    return this._getDb(db);
  }

  @returnType('Collection')
  getCollection(name: string): Collection {
    assertArgsDefinedType([name], ['string']);
    const { db, coll } = /^(?<db>[^.]+)\.(?<coll>.+)$/.exec(name)?.groups ?? {};
    if (!db || !coll) {
      throw new MongoshInvalidInputError(
        'Collection must be of the format <db>.<collection>',
        CommonErrors.InvalidArgument
      );
    }
    return this._getDb(db).getCollection(coll);
  }

  getURI(): string {
    return this._uri;
  }

  use(db: string): string {
    assertArgsDefinedType([db], ['string'], 'Mongo.use');
    this._instanceState.messageBus.emit('mongosh:use', { db });

    let previousDbName;
    let previousDbMongo;
    try {
      const previousDb = this._instanceState.context.db;
      previousDbName = previousDb?.getName?.();
      previousDbMongo = previousDb?._mongo;
    } catch (e: any) {
      if (e?.code !== ShellApiErrors.NotConnected) {
        throw e;
      }
    }

    this._instanceState.context.db = this._getDb(db);
    if (db === previousDbName && previousDbMongo === this) {
      return `already on db ${db}`;
    }
    return `switched to db ${db}`;
  }

  async _listDatabases(opts: ListDatabasesOptions = {}): Promise<{
    databases: { name: string; sizeOnDisk: number; empty: boolean }[];
  }> {
    const result = await this._serviceProvider.listDatabases('admin', {
      ...this._getExplicitlyRequestedReadPref(),
      ...opts,
    });
    if (!('databases' in result)) {
      const err = new MongoshRuntimeError(
        'Got invalid result from "listDatabases"',
        CommonErrors.CommandFailed
      );
      this._instanceState.messageBus.emit('mongosh:error', err, 'shell-api');
      throw err;
    }
    this._cachedDatabaseNames = result.databases.map((db: any) => db.name);
    return result as any;
  }

  async _getDatabaseNamesForCompletion(): Promise<string[]> {
    return await Promise.race([
      (async () => {
        return (
          await this._listDatabases({ readPreference: 'primaryPreferred' })
        ).databases.map((db) => db.name);
      })(),
      (async () => {
        // See the comment in _getCollectionNamesForCompletion/database.ts
        // for the choice of 200 ms.
        await new Promise((resolve) => setTimeout(resolve, 200).unref());
        return this._cachedDatabaseNames;
      })(),
    ]);
  }

  @returnsPromise
  @apiVersions([1])
  async getDBs(options: ListDatabasesOptions = {}): Promise<{
    databases: { name: string; sizeOnDisk: number; empty: boolean }[];
  }> {
    this._emitMongoApiCall('getDBs', { options });
    return await this._listDatabases(options);
  }

  @returnsPromise
  @apiVersions([1])
  async getDBNames(options: ListDatabasesOptions = {}): Promise<string[]> {
    this._emitMongoApiCall('getDBNames', { options });
    return (await this._listDatabases(options)).databases.map((db) => db.name);
  }

  @returnsPromise
  @apiVersions([1])
  async show(cmd: string, arg?: string): Promise<CommandResult> {
    const db = this._instanceState.currentDb;
    // legacy shell:
    // https://github.com/mongodb/mongo/blob/a6df396047a77b90bf1ce9463eecffbee16fb864/src/mongo/shell/utils.js#L900-L1226
    this._instanceState.messageBus.emit('mongosh:show', {
      method: `show ${cmd}`,
    });

    switch (cmd) {
      case 'databases':
      case 'dbs':
        const result = (
          await this._listDatabases({
            readPreference: 'primaryPreferred',
            promoteLongs: true,
          })
        ).databases;
        return new CommandResult('ShowDatabasesResult', result);
      case 'collections':
      case 'tables':
        const collectionNames = await db._getCollectionNamesWithTypes({
          readPreference: 'primaryPreferred',
          promoteLongs: true,
        });
        return new CommandResult('ShowCollectionsResult', collectionNames);
      case 'profile':
        const sysprof = db.getCollection('system.profile');
        const profiles = {
          count: await sysprof.countDocuments({}),
        } as Document;
        if (profiles.count !== 0) {
          profiles.result = await (await sysprof.find({ millis: { $gt: 0 } }))
            .sort({ $natural: -1 })
            .limit(5)
            .toArray();
        }
        return new CommandResult('ShowProfileResult', profiles);
      case 'users':
        const users = await db.getUsers();
        return new CommandResult('ShowResult', users.users);
      case 'roles':
        const roles = await db.getRoles({ showBuiltinRoles: true });
        return new CommandResult('ShowResult', roles.roles);
      case 'log':
        const log = await db.adminCommand({ getLog: arg || 'global' });
        return new CommandResult('ShowResult', log.log);
      case 'logs':
        const logs = await db.adminCommand({ getLog: '*' });
        return new CommandResult('ShowResult', logs.names);
      case 'startupWarnings': {
        type GetLogResult = {
          ok: number;
          totalLinesWritten: number;
          log: string[] | undefined;
        };
        let result;
        try {
          result = (await db.adminCommand({
            getLog: 'startupWarnings',
          })) as GetLogResult;
          if (!result) {
            throw new MongoshCommandFailed(
              'adminCommand getLog unexpectedly returned no result'
            );
          }
        } catch (error: any) {
          this._instanceState.messageBus.emit(
            'mongosh:error',
            error,
            'shell-api'
          );
          return new CommandResult('ShowBannerResult', null);
        }

        if (!result.log || !result.log.length) {
          return new CommandResult('ShowBannerResult', null);
        }

        const lines: string[] = result.log.map((logLine) => {
          try {
            const entry: LogEntry = parseAnyLogEntry(logLine);
            return `${entry.timestamp}: ${entry.message}`;
          } catch (e: any) {
            return `Unexpected log line format: ${logLine}`;
          }
        });
        return new CommandResult('ShowBannerResult', {
          header: 'The server generated these startup warnings when booting',
          content: lines.join('\n'),
        });
      }
      case 'automationNotices': {
        let helloResult;
        try {
          helloResult = await db.hello();
        } catch (error: any) {
          this._instanceState.messageBus.emit(
            'mongosh:error',
            error,
            'shell-api'
          );
          return new CommandResult('ShowBannerResult', null);
        }
        if (helloResult.automationServiceDescriptor) {
          return new CommandResult('ShowBannerResult', {
            content:
              `This server is managed by automation service '${helloResult.automationServiceDescriptor}'.\n` +
              'Many administrative actions are inappropriate, and may be automatically reverted.',
          });
        }
        return new CommandResult('ShowBannerResult', null);
      }
      case 'nonGenuineMongoDBCheck': {
        // Although very unlikely but if we cannot determine wether we are connected to a fake mongodb
        // or not, we assume that we are connected to a real mongodb and won't show the warning
        const isGenuine =
          this._instanceState.connectionInfo?.extraInfo?.is_genuine ?? true;
        if (isGenuine) {
          return new CommandResult('ShowBannerResult', null);
        }

        return new CommandResult('ShowBannerResult', {
          header: 'Warning: Non-Genuine MongoDB Detected',
          content: [
            'This server or service appears to be an emulation of MongoDB rather than an official MongoDB product.',
            'Some documented MongoDB features may work differently, be entirely missing or incomplete, or have unexpected performance characteristics.',
            'To learn more please visit: https://dochub.mongodb.org/core/non-genuine-mongodb-server-warning.',
          ].join('\n'),
        });
      }
      default:
        const err = new MongoshInvalidInputError(
          `'${cmd}' is not a valid argument for "show".`,
          CommonErrors.InvalidArgument
        );
        this._instanceState.messageBus.emit('mongosh:error', err, 'shell-api');
        throw err;
    }
  }

  async close(force: boolean): Promise<void> {
    const index = this._instanceState.mongos.indexOf(this);
    if (index === -1) {
      process.emitWarning(
        new MongoshInternalError(
          `Closing untracked Mongo instance ${this[asPrintable]()}`
        )
      );
    } else {
      this._instanceState.mongos.splice(index, 1);
    }

    await this._serviceProvider.close(force);
  }

  async _suspend(): Promise<() => Promise<void>> {
    return await this._serviceProvider.suspend();
  }

  getReadPrefMode(): ReadPreferenceMode {
    return this._serviceProvider.getReadPreference().mode;
  }

  getReadPrefTagSet(): Record<string, string>[] | undefined {
    return this._serviceProvider.getReadPreference().tags;
  }

  getReadPref(): ReadPreference {
    return this._serviceProvider.getReadPreference();
  }

  _getExplicitlyRequestedReadPref():
    | { readPreference: ReadPreference }
    | undefined {
    return this._readPreferenceWasExplicitlyRequested
      ? { readPreference: this.getReadPref() }
      : undefined;
  }

  getReadConcern(): string | undefined {
    try {
      const rc = this._serviceProvider.getReadConcern();
      return rc ? rc.level : undefined;
    } catch {
      throw new MongoshInternalError('Error retrieving ReadConcern.');
    }
  }

  getWriteConcern(): WriteConcern | undefined {
    try {
      return this._serviceProvider.getWriteConcern();
    } catch {
      throw new MongoshInternalError('Error retrieving WriteConcern.');
    }
  }

  @returnsPromise
  async setReadPref(
    mode: ReadPreferenceLike,
    tagSet?: Record<string, string>[],
    hedgeOptions?: Document
  ): Promise<void> {
    await this._serviceProvider.resetConnectionOptions({
      readPreference: this._serviceProvider.readPreferenceFromOptions({
        readPreference: mode,
        readPreferenceTags: tagSet,
        hedge: hedgeOptions,
      }),
    });
    this._readPreferenceWasExplicitlyRequested = true;
  }

  @returnsPromise
  async setReadConcern(level: ReadConcernLevel): Promise<void> {
    await this._serviceProvider.resetConnectionOptions({
      readConcern: { level: level },
    });
  }

  async setWriteConcern(concern: WriteConcern): Promise<void>;
  async setWriteConcern(
    wValue: string | number,
    wtimeoutMSValue?: number | undefined,
    jValue?: boolean | undefined
  ): Promise<void>;
  @returnsPromise
  async setWriteConcern(
    concernOrWValue: WriteConcern | string | number,
    wtimeoutMSValue?: number | undefined,
    jValue?: boolean | undefined
  ): Promise<void> {
    const options: MongoClientOptions = {};
    let concern: Mutable<WriteConcern>;

    if (typeof concernOrWValue === 'object') {
      if (wtimeoutMSValue !== undefined || jValue !== undefined) {
        throw new MongoshInvalidInputError(
          'If concern is given as an object no other arguments must be specified',
          CommonErrors.InvalidArgument
        );
      }
      concern = concernOrWValue;
    } else {
      concern = {};
      if (
        typeof concernOrWValue !== 'string' &&
        typeof concernOrWValue !== 'number'
      ) {
        throw new MongoshInvalidInputError(
          `w value must be a number or string, got: ${typeof concernOrWValue}`,
          CommonErrors.InvalidArgument
        );
      } else if (typeof concernOrWValue === 'number' && concernOrWValue < 0) {
        throw new MongoshInvalidInputError(
          `w value must be equal to or greather than 0, got: ${concernOrWValue}`,
          CommonErrors.InvalidArgument
        );
      }

      concern.w = concernOrWValue as any;

      if (wtimeoutMSValue !== undefined) {
        if (typeof wtimeoutMSValue !== 'number') {
          throw new MongoshInvalidInputError(
            `wtimeoutMS value must be a number, got: ${typeof wtimeoutMSValue}`,
            CommonErrors.InvalidArgument
          );
        } else if (wtimeoutMSValue < 0) {
          throw new MongoshInvalidInputError(
            `wtimeoutMS must be equal to or greather than 0, got: ${wtimeoutMSValue}`,
            CommonErrors.InvalidArgument
          );
        }
        concern.wtimeout = wtimeoutMSValue;
      }

      if (jValue !== undefined) {
        if (typeof jValue !== 'boolean') {
          throw new MongoshInvalidInputError(
            `j value must be a boolean, got: ${typeof jValue}`,
            CommonErrors.InvalidArgument
          );
        }
        concern.j = jValue;
      }
    }

    if (concern.w !== undefined) {
      options.w = concern.w;
    }
    if (concern.wtimeout !== undefined) {
      options.wtimeoutMS = concern.wtimeout;
    }
    if (concern.j !== undefined) {
      options.journal = concern.j;
    }
    if (concern.fsync !== undefined) {
      options.journal = !!concern.fsync;
    }
    await this._serviceProvider.resetConnectionOptions(options);
  }

  @topologies([Topologies.ReplSet])
  startSession(options: Document = {}): Session {
    const allTransactionOptions = [
      'readConcern',
      'writeConcern',
      'readPreference',
      'maxCommitTimeMS',
    ] as const;
    function assertAllTransactionOptionsUsed(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _options: (typeof allTransactionOptions)[number]
    ) {
      // These typechecks might look weird, but will tell us if we are missing
      // support for a newly introduced driver option when it is being added
      // to the driver API.
    }
    assertAllTransactionOptionsUsed(
      '' as Exclude<keyof TransactionOptions, keyof CommandOperationOptions>
    );
    const defaultTransactionOptions: TransactionOptions = {};
    for (const key of allTransactionOptions) {
      if (typeof options[key] !== 'undefined') {
        defaultTransactionOptions[key] = options[key];
      }
    }

    const allSessionOptions = ['causalConsistency', 'snapshot'] as const;
    function assertAllSessionOptionsUsed(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _options: (typeof allSessionOptions)[number] | 'defaultTransactionOptions'
    ) {}
    assertAllSessionOptionsUsed('' as keyof ClientSessionOptions);
    const driverOptions: ClientSessionOptions = {};
    if (Object.keys(defaultTransactionOptions).length > 0) {
      driverOptions.defaultTransactionOptions = defaultTransactionOptions;
    }
    for (const key of allSessionOptions) {
      if (typeof options[key] !== 'undefined') {
        driverOptions[key] = options[key];
      }
    }

    return new Session(
      this,
      driverOptions,
      this._serviceProvider.startSession(driverOptions)
    );
  }

  setCausalConsistency(): void {
    throw new MongoshUnimplementedError(
      'It is not possible to set causal consistency for an entire connection due to the driver, use startSession({causalConsistency: <>}) instead.',
      CommonErrors.NotImplemented,
      blockedByDriverMetadata('Mongo.setCausalConsistency')
    );
  }

  isCausalConsistency(): void {
    throw new MongoshUnimplementedError(
      'Causal consistency for drivers is set via Mongo.startSession and can be checked via session.getOptions. The default value is true',
      CommonErrors.NotImplemented,
      blockedByDriverMetadata('Mongo.isCausalConsistency')
    );
  }

  @deprecated
  setSlaveOk(): void {
    throw new MongoshDeprecatedError(
      'Setting slaveOk is deprecated, use setReadPref instead.'
    );
  }

  @deprecated
  @returnsPromise
  async setSecondaryOk(): Promise<void> {
    await this._instanceState.printDeprecationWarning(
      '.setSecondaryOk() is deprecated. Use .setReadPref("primaryPreferred") instead'
    );

    const currentReadPref = this.getReadPrefMode();
    if (currentReadPref === 'primary') {
      await this._instanceState.shellApi.print(
        'Setting read preference from "primary" to "primaryPreferred"'
      );
      await this.setReadPref('primaryPreferred');
    } else {
      await this._instanceState.shellApi.print(
        `Leaving read preference unchanged (is already "${currentReadPref}")`
      );
    }
  }

  @serverVersions(['3.1.0', ServerVersions.latest])
  @topologies([Topologies.ReplSet, Topologies.Sharded])
  @apiVersions([1])
  @returnsPromise
  async watch(
    pipeline: Document[] | ChangeStreamOptions = [],
    options: ChangeStreamOptions = {}
  ): Promise<ChangeStreamCursor> {
    if (!Array.isArray(pipeline)) {
      options = pipeline;
      pipeline = [];
    }
    this._emitMongoApiCall('watch', { pipeline, options });
    const cursor = new ChangeStreamCursor(
      this._serviceProvider.watch(pipeline, options),
      redactURICredentials(this._uri),
      this
    );
    if (
      !options.resumeAfter &&
      !options.startAfter &&
      !options.startAtOperationTime
    ) {
      await cursor.tryNext(); // See comment in coll.watch().
    }
    this._instanceState.currentCursor = cursor;
    return cursor;
  }

  @platforms(['CLI'])
  @serverVersions(['4.2.0', ServerVersions.latest])
  @returnType('ClientEncryption')
  getClientEncryption(): ClientEncryption {
    if (!this._fleOptions) {
      throw new MongoshInvalidInputError(
        'Cannot call getClientEncryption() without field-level encryption options',
        ShellApiErrors.NotUsingFLE
      );
    }
    if (!this._clientEncryption) {
      this._clientEncryption = new ClientEncryption(this);
    }
    return this._clientEncryption;
  }

  @platforms(['CLI'])
  @serverVersions(['4.2.0', ServerVersions.latest])
  @returnType('KeyVault')
  @returnsPromise
  async getKeyVault(): Promise<KeyVault> {
    if (!this._keyVault) {
      this._keyVault = new KeyVault(this.getClientEncryption());
      await this._keyVault._init();
    }
    return this._keyVault;
  }

  @returnsPromise
  async convertShardKeyToHashed(value: any): Promise<unknown> {
    const pipeline = [
      { $limit: 1 },
      { $project: { _id: { $toHashedIndexKey: { $literal: value } } } },
    ];
    let result;
    for (const approach of [
      // Try $documents if available (NB: running $documents on an empty db requires SERVER-63811 i.e. 6.0.3+).
      () =>
        this.getDB('_fakeDbForMongoshCSKTH').aggregate([
          { $documents: [{}] },
          ...pipeline,
        ]),
      () => this.getDB('admin').aggregate([{ $documents: [{}] }, ...pipeline]),
      // If that fails, try a default collection like admin.system.version.
      () =>
        this.getDB('admin').getCollection('system.version').aggregate(pipeline),
      // If that fails, try using $collStats for local.oplog.rs.
      () =>
        this.getDB('local')
          .getCollection('oplog.rs')
          .aggregate([{ $collStats: {} }, ...pipeline]),
    ]) {
      try {
        result = await (await approach()).next();
      } catch {
        continue;
      }
      if (result) break;
    }
    if (!result) {
      throw new MongoshRuntimeError(
        'Could not find a suitable way to run convertShardKeyToHashed() -- tried $documents and aggregating on admin.system.version and local.oplog.rs',
        CommonErrors.CommandFailed
      );
    }
    return result._id;
  }
}
