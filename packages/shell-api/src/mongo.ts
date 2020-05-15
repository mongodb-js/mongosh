import { ServiceProvider } from '@mongosh/service-provider-core';
import {
  classPlatforms,
  classReturnsPromise,
  hasAsyncChild,
  ReplPlatform,
  returnsPromise,
  returnType,
  ShellApiClass,
  shellApiClassDefault
} from './main';
import Database from './database';
import ShellInternalState from './shell-internal-state';
import { CommandResult } from './result';
import { MongoshInternalError, MongoshInvalidInputError, MongoshUnimplementedError } from '@mongosh/errors';

@shellApiClassDefault
@hasAsyncChild
@classReturnsPromise
@classPlatforms([ ReplPlatform.CLI] )
export default class Mongo extends ShellApiClass {
  public serviceProvider: ServiceProvider;
  public databases: any;
  public internalState: ShellInternalState;
  private uri: string;
  private options: any;

  constructor(
    initial: boolean,
    internalState: ShellInternalState,
    uri = 'mongodb://localhost/',
    fleOptions?
  ) {
    super();
    this.internalState = internalState;
    this.databases = {};
    this.uri = uri;
    this.options = fleOptions; // TODO

    if (!initial && this.internalState.platform === ReplPlatform.Browser || this.internalState.platform === ReplPlatform.Compass) {
      throw new MongoshUnimplementedError('new Mongo connection are not supported for current platform');
    }
    this.serviceProvider = this.internalState.initialServiceProvider;
  }

  toReplString(): any {
    return this.uri;
  }

  async connect(): Promise<void> {
    this.serviceProvider = await this.serviceProvider.getNewConnection(this.uri, this.options);
  }

  @returnType('Database')
  getDB(db): Database {
    if (!(db in this.databases)) {
      this.databases[db] = new Database(this, db);
    }
    this.internalState.messageBus.emit( 'mongosh:getDB', { db });
    return this.databases[db];
  }

  use(db): any {
    if (!(db in this.databases)) {
      this.databases[db] = new Database(this, db);
    }
    this.internalState.messageBus.emit( 'mongosh:use', { db });
    this.internalState.context.db = this.databases[db];

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
}
