/* eslint-disable complexity */
import {
  classPlatforms,
  classReturnsPromise,
  hasAsyncChild,
  returnsPromise,
  returnType,
  ShellApiClass,
  shellApiClassDefault
} from './decorators';
import {
  ReplPlatform,
  generateUri,
  ReadPreference,
  ReadPreferenceMode,
  Document,
  ServiceProvider,
  TransactionOptions
} from '@mongosh/service-provider-core';
import Database from './database';
import ShellInternalState from './shell-internal-state';
import { CommandResult } from './result';
import { MongoshInternalError, MongoshInvalidInputError } from '@mongosh/errors';
import { redactPassword } from '@mongosh/history';
import { asPrintable, shellSession } from './enums';
import Session from './session';
import { assertArgsDefined, assertArgsType } from './helpers';

@shellApiClassDefault
@hasAsyncChild
@classReturnsPromise
@classPlatforms([ ReplPlatform.CLI ] )
export default class Mongo extends ShellApiClass {
  public _serviceProvider: ServiceProvider;
  public _databases: Record<string, Database>;
  public _internalState: ShellInternalState;
  public _uri: string;
  private _options: Document;

  constructor(
    internalState: ShellInternalState,
    uri = 'mongodb://localhost/',
    fleOptions?: any
  ) {
    super();
    this._internalState = internalState;
    this._databases = {};
    this._uri = generateUri({ _: [uri] });
    this._options = fleOptions;
    this._serviceProvider = this._internalState.initialServiceProvider;
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  [asPrintable](): string {
    return redactPassword(this._uri);
  }

  async connect(): Promise<void> {
    this._serviceProvider = await this._serviceProvider.getNewConnection(this._uri, this._options);
  }

  _getDb(name: string): Database {
    assertArgsDefined(name);
    assertArgsType([name], ['string']);
    if (!name.trim()) {
      throw new MongoshInvalidInputError('Database name cannot be empty.');
    }

    if (!(name in this._databases)) {
      this._databases[name] = new Database(this, name);
    }
    return this._databases[name];
  }

  @returnType('Database')
  getDB(db: string): Database {
    this._internalState.messageBus.emit( 'mongosh:getDB', { db });
    return this._getDb(db);
  }

  use(db: string): string {
    this._internalState.messageBus.emit( 'mongosh:use', { db });
    this._internalState.context.db = this._getDb(db);
    return `switched to db ${db}`;
  }

  @returnsPromise
  async show(cmd: string, arg?: string): Promise<CommandResult> {
    this._internalState.messageBus.emit( 'mongosh:show', { method: `show ${cmd}` });

    switch (cmd) {
      case 'databases':
      case 'dbs':
        const result = await this._serviceProvider.listDatabases('admin');
        if (!('databases' in result)) {
          const err = new MongoshInternalError('Got invalid result from "listDatabases"');
          this._internalState.messageBus.emit('mongosh:error', err);
          throw err;
        }

        return new CommandResult('ShowDatabasesResult', result.databases);
      case 'collections':
      case 'tables':
        const collectionNames = await this._internalState.currentDb.getCollectionNames();
        return new CommandResult('ShowCollectionsResult', collectionNames);
      case 'profile':
        const sysprof = this._internalState.currentDb.getCollection('system.profile');
        const profiles = { count: await sysprof.countDocuments({}) } as Document;
        if (profiles.count !== 0) {
          profiles.result = await (sysprof.find({ millis: { $gt: 0 } })
            .sort({ $natural: -1 })
            .limit(5)
            .toArray());
        }
        return new CommandResult('ShowProfileResult', profiles);
      case 'users':
        const users = await this._internalState.currentDb.getUsers();
        return new CommandResult('ShowResult', users.users);
      case 'roles':
        const roles = await this._internalState.currentDb.getRoles({ showBuiltinRoles: true });
        return new CommandResult('ShowResult', roles.roles);
      case 'log':
        const log = await this._internalState.currentDb.adminCommand({ getLog: arg || 'global' });
        return new CommandResult('ShowResult', log.log);
      case 'logs':
        const logs = await this._internalState.currentDb.adminCommand({ getLog: '*' });
        return new CommandResult('ShowResult', logs.names);
      default:
        const err = new MongoshInvalidInputError(
          `'${cmd}' is not a valid argument for "show".`
        );
        this._internalState.messageBus.emit('mongosh:error', err);
        throw err;
    }
  }
  async close(force: boolean): Promise<void> {
    return await this._serviceProvider.close(force);
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

  getReadConcern(): string | undefined {
    try {
      const rc = this._serviceProvider.getReadConcern();
      return rc ? rc.level : undefined;
    } catch {
      throw new MongoshInternalError('Error retrieving ReadConcern. Please file a JIRA ticket in the MONGOSH project');
    }
  }

  @returnsPromise
  async setReadPref(mode: string, tagSet?: Record<string, string>[], hedgeOptions?: Document): Promise<void> {
    await this._serviceProvider.resetConnectionOptions({
      readPreference: { mode: mode, tagSet: tagSet, hedgeOptions: hedgeOptions }
    });
  }

  @returnsPromise
  async setReadConcern(level: string): Promise<void> {
    await this._serviceProvider.resetConnectionOptions({ readConcern: { level: level } });
  }

  startSession(options: Document = {}): Session {
    const driverOptions = { owner: shellSession }; // TODO: Node 4.0 upgrade should allow optional owner field see NODE-2918
    if (options === undefined) {
      return new Session(this, driverOptions, this._serviceProvider.startSession(driverOptions));
    }
    const defaultTransactionOptions = {} as TransactionOptions;

    // Only include option if not undef
    Object.assign(defaultTransactionOptions,
      options.readConcern && { readConcern: options.readConcern },
      options.writeConcern && { writeConcern: options.writeConcern },
      options.readPreference && { readPreference: options.readPreference }
    );
    Object.assign(driverOptions,
      Object.keys(defaultTransactionOptions).length > 0 && { defaultTransactionOptions: defaultTransactionOptions },
      options.causalConsistency !== undefined && { causalConsistency: options.causalConsistency }
    );
    return new Session(this, driverOptions, this._serviceProvider.startSession(driverOptions));
  }

  setCausalConsistency(): void {
    throw new MongoshInvalidInputError('It is not possible to set causal consistency for an entire connection due to the driver, use startSession({causalConsistency: <>}) instead.');
  }

  isCausalConsistency(): void {
    throw new MongoshInvalidInputError('Causal consistency for drivers is set via Mongo.startSession and can be checked via session.getOptions. The default value is true');
  }

  setSlaveOk(): void {
    throw new MongoshInvalidInputError('setSlaveOk is deprecated.');
  }

  setSecondaryOk(): void {
    throw new MongoshInvalidInputError('Setting secondaryOk is deprecated, use setReadPreference instead');
  }
}
