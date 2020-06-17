import {
  AggregationCursor,
  Cursor,
  Database,
  Mongo,
  ReplicaSet,
  Shard,
  signatures,
  ShellBson,
  toIterator,
  ShellApi,
  shellApiSymbol
} from './index';
import { EventEmitter } from 'events';
import { Document, ServiceProvider, DEFAULT_DB } from '@mongosh/service-provider-core';
import { MongoshInvalidInputError } from '@mongosh/errors';
import AsyncWriter from '@mongosh/async-rewriter';
import { toIgnore } from './decorators';
import NoDatabase from './no-db';

/**
 * Anything to do with the internal shell state is stored here.
 */
export default class ShellInternalState {
  public currentCursor: Cursor | AggregationCursor;
  public currentDb: Database;
  public messageBus: EventEmitter;
  public asyncWriter: AsyncWriter;
  public initialServiceProvider: ServiceProvider; // the initial service provider
  public uri: string;
  public connectionInfo: any;
  public context: any;
  public mongos: Mongo[];
  public shellApi: ShellApi;
  public cliOptions: any;
  constructor(initialServiceProvider: ServiceProvider, messageBus: any = new EventEmitter(), cliOptions: any = {}) {
    this.initialServiceProvider = initialServiceProvider;
    this.messageBus = messageBus;
    this.asyncWriter = new AsyncWriter(signatures);
    this.shellApi = new ShellApi(this);
    this.mongos = [];
    this.connectionInfo = { buildInfo: {} };
    if (!cliOptions.nodb) {
      const mongo = new Mongo(this);
      this.mongos.push(mongo);
      this.currentDb = mongo.getDB(initialServiceProvider.initialDb || DEFAULT_DB);
    } else {
      this.currentDb = new NoDatabase() as Database;
    }
    this.currentCursor = null;
    this.context = {};
    this.cliOptions = cliOptions;
  }

  async fetchConnectionInfo(): Promise<void> {
    if (!this.cliOptions.nodb) {
      this.connectionInfo = await this.currentDb.mongo.serviceProvider.getConnectionInfo();
      this.messageBus.emit('mongosh:connect', this.connectionInfo.extraInfo);
    }
  }

  async close(p): Promise<void> {
    for (let i = 0; i < this.mongos.length; i++) {
      await this.mongos[i].close(p);
    }
  }

  public setDbFunc(newDb: any): Database {
    this.currentDb = newDb;
    this.context.rs = new ReplicaSet(this.currentDb.mongo);
    this.context.sh = new Shard(this.currentDb.mongo);
    this.fetchConnectionInfo();
    return newDb;
  }

  /**
   * Prepare a `contextObject` as global context and set it as context
   * Add each attribute to the AsyncWriter also.
   *
   * The `contextObject` is prepared so that it can be used as global object
   * for the repl evaluationi.
   *
   * @note The `contextObject` is mutated, it will retain all of its existing
   * properties but also have the global shell api objects and functions.
   *
   * @param {Object} contextObject - contextObject an object used as global context.
   */
  setCtx(contextObject: any): void {
    this.context = contextObject;
    contextObject.toIterator = toIterator;
    contextObject.print = async(arg): Promise<void> => {
      if (arg.asShellResult) {
        const result = await arg.asShellResult();
        // eslint-disable-next-line no-console
        console.log(result.value);
      } else {
        // eslint-disable-next-line no-console
        console.log(arg);
      }
    };
    Object.assign(contextObject, this.shellApi); // currently empty, but in the future we may have properties
    Object.getOwnPropertyNames(ShellApi.prototype)
      .filter(n => !toIgnore.concat(['hasAsyncChild', 'help']).includes(n) && typeof this.shellApi[n] === 'function')
      .forEach((n) => {
        contextObject[n] = (...args): any => {
          return this.shellApi[n](...args);
        };
        contextObject[n].help = this.shellApi[n].help;
      });
    contextObject.quit = contextObject.exit;
    contextObject.help = this.shellApi.help;
    contextObject.printjson = contextObject.print;
    Object.assign(contextObject, ShellBson);

    contextObject.rs = new ReplicaSet(this.currentDb.mongo);
    contextObject.sh = new Shard(this.currentDb.mongo);

    // Add global shell objects
    const apiObjects = {
      db: signatures.Database,
      rs: signatures.ReplicaSet,
      sh: signatures.Shard
    } as any;
    Object.assign(apiObjects, signatures.ShellApi.attributes);
    delete apiObjects.Mongo;
    this.asyncWriter.symbols.initializeApiObjects(apiObjects);

    const setFunc = (newDb: any): Database => {
      if (newDb[shellApiSymbol] !== 'Database') {
        throw new MongoshInvalidInputError('Cannot reassign \'db\' to non-Database type');
      }
      return this.setDbFunc(newDb);
    };

    try {
      Object.defineProperty(contextObject, 'db', {
        configurable: true,
        set: setFunc,
        get: () => (this.currentDb)
      });
    } catch (e) { // java shell, can't use getters/setters
      contextObject.db = this.setDbFunc(this.currentDb);
    }

    this.messageBus.emit(
      'mongosh:setCtx',
      { method: 'setCtx', arguments: {} }
    );
  }

  public emitApiCall(event: {
    method: string;
    class: string;
    arguments: Document;
    [otherProps: string]: any;
  }): void {
    this.messageBus.emit('mongosh:api-call', event);
  }
}
