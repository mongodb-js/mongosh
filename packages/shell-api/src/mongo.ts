import { ServiceProvider } from '@mongosh/service-provider-core';
import {
  classPlatforms,
  classReturnsPromise,
  hasAsyncChild,
  returnsPromise,
  returnType,
  ShellApiClass,
  shellApiClassDefault
} from './decorators';
import { ReplPlatform, generateUri } from '@mongosh/service-provider-core';
import Database from './database';
import ShellInternalState from './shell-internal-state';
import { CommandResult } from './result';
import { MongoshInternalError, MongoshInvalidInputError } from '@mongosh/errors';
import { retractPassword } from '@mongosh/history';

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
  _asPrintable(): string {
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
  async show(arg): Promise<CommandResult> {
    this._internalState.messageBus.emit( 'mongosh:show', { method: `show ${arg}` });

    switch (arg) {
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
      default:
        const validArguments = [
          'databases',
          'dbs',
          'collections',
          'tables'
        ];

        const err = new MongoshInvalidInputError(
          `'${arg}' is not a valid argument for "show".\nValid arguments are: ${validArguments.join(', ')}`
        );

        this._internalState.messageBus.emit('mongosh:error', err);
        throw err;
    }
  }
  async close(p): Promise<void> {
    return await this._serviceProvider.close(p);
  }
}
