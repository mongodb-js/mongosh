/* eslint-disable complexity */
import { ReadPreference, ServiceProvider } from '@mongosh/service-provider-core';
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
  ReadPreferenceMode
} from '@mongosh/service-provider-core';
import Database from './database';
import ShellInternalState from './shell-internal-state';
import { CommandResult } from './result';
import { MongoshInternalError, MongoshInvalidInputError, MongoshUnimplementedError } from '@mongosh/errors';
import { retractPassword } from '@mongosh/history';
import { asPrintable } from './enums';

@shellApiClassDefault
@hasAsyncChild
@classReturnsPromise
@classPlatforms([ ReplPlatform.CLI ] )
export default class Mongo extends ShellApiClass {
  public _serviceProvider: ServiceProvider;
  public _databases: any;
  public _internalState: ShellInternalState;
  public _uri: string;
  private _options: any;

  constructor(
    internalState: ShellInternalState,
    uri = 'mongodb://localhost/',
    fleOptions?
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
    return retractPassword(this._uri);
  }

  async connect(): Promise<void> {
    this._serviceProvider = await this._serviceProvider.getNewConnection(this._uri, this._options);
  }

  _getDb(name: string): Database {
    if (typeof name !== 'string') {
      throw new MongoshInvalidInputError(
        `Database name must be a string. Received ${typeof name}.`);
    }

    if (!name.trim()) {
      throw new MongoshInvalidInputError('Database name cannot be empty.');
    }

    if (!(name in this._databases)) {
      this._databases[name] = new Database(this, name);
    }
    return this._databases[name];
  }

  @returnType('Database')
  getDB(db): Database {
    this._internalState.messageBus.emit( 'mongosh:getDB', { db });
    return this._getDb(db);
  }

  use(db: string): string {
    this._internalState.messageBus.emit( 'mongosh:use', { db });
    this._internalState.context.db = this._getDb(db);
    return `switched to db ${db}`;
  }

  @returnsPromise
  async show(cmd, arg?): Promise<CommandResult> {
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
        const profiles = { count: await sysprof.countDocuments({}) } as any;
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
  async close(p): Promise<void> {
    return await this._serviceProvider.close(p);
  }

  getReadPrefMode(): ReadPreferenceMode {
    // return this._serviceProvider.getReadPreference().mode;
    throw new MongoshUnimplementedError('getting the read pref is not currently supported, to follow the progress please see NODE-2806');
  }

  getReadPrefTagSet(): Record<string, string>[] {
    // return this._serviceProvider.getReadPreference().tags;
    throw new MongoshUnimplementedError('getting the read pref is not currently supported, to follow the progress please see NODE-2806');
  }

  getReadPref(): ReadPreference {
    // return this._serviceProvider.getReadPreference();
    throw new MongoshUnimplementedError('getting the read pref is not currently supported, to follow the progress please see NODE-2806');
  }

  getReadConcern(): string {
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
}
