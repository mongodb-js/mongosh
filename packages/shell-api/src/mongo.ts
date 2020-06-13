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
  public serviceProvider: ServiceProvider;
  public databases: any;
  public internalState: ShellInternalState;
  public uri: string;
  private options: any;

  constructor(
    internalState: ShellInternalState,
    uri = 'mongodb://localhost/',
    fleOptions?
  ) {
    super();
    this.internalState = internalState;
    this.databases = {};
    this.uri = generateUri({ _: [uri] });
    this.options = fleOptions;
    this.serviceProvider = this.internalState.initialServiceProvider;
  }

  toReplString(): any {
    return retractPassword(this.uri);
  }

  async connect(): Promise<void> {
    this.serviceProvider = await this.serviceProvider.getNewConnection(this.uri, this.options);
  }

  _getDb(name: string): Database {
    if (typeof name !== 'string') {
      throw new MongoshInvalidInputError(
        `Database name must be a string. Received ${typeof name}.`);
    }

    if (!name.trim()) {
      throw new MongoshInvalidInputError('Database name cannot be empty.');
    }

    if (!(name in this.databases)) {
      this.databases[name] = new Database(this, name);
    }
    return this.databases[name];
  }

  @returnType('Database')
  getDB(db): Database {
    this.internalState.messageBus.emit( 'mongosh:getDB', { db });
    return this._getDb(db);
  }

  use(db: string): string {
    this.internalState.messageBus.emit( 'mongosh:use', { db });
    this.internalState.context.db = this._getDb(db);
    return `switched to db ${db}`;
  }

  @returnsPromise
  async show(arg): Promise<CommandResult> {
    this.internalState.messageBus.emit( 'mongosh:show', { method: `show ${arg}` });

    switch (arg) {
      case 'databases':
      case 'dbs':
        const result = await this.serviceProvider.listDatabases('admin');
        if (!('databases' in result)) {
          const err = new MongoshInternalError('Got invalid result from "listDatabases"');
          this.internalState.messageBus.emit('mongosh:error', err);
          throw err;
        }

        return new CommandResult('ShowDatabasesResult', result.databases);
      case 'collections':
      case 'tables':
        const collectionNames = await this.internalState.currentDb.getCollectionNames();
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

        this.internalState.messageBus.emit('mongosh:error', err);
        throw err;
    }
  }
  async close(p): Promise<void> {
    return await this.serviceProvider.close(p);
  }
}
