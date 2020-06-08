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
  ShellApi
} from './index';
import { EventEmitter } from 'events';
import { Document, ServiceProvider, ReplPlatform } from '@mongosh/service-provider-core';
import { MongoshInvalidInputError, MongoshUnimplementedError } from '@mongosh/errors';
import AsyncWriter from '@mongosh/async-rewriter';
import { toIgnore } from './decorators';

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
  private mongos: Mongo[];
  public shellApi: ShellApi;
  constructor(initialServiceProvider: ServiceProvider, messageBus: any = new EventEmitter()) {
    this.initialServiceProvider = initialServiceProvider;
    this.messageBus = messageBus;
    this.asyncWriter = new AsyncWriter(signatures);
    this.shellApi = new ShellApi(this);
    const mongo = new Mongo(this);
    this.currentCursor = null;
    this.currentDb = mongo.getDB('test'); // TODO: set to CLI arg
    this.context = {};
    this.mongos = [ mongo ];
  }

  async fetchConnectionInfo(): Promise<void> {
    this.connectionInfo = await this.currentDb.mongo.serviceProvider.getConnectionInfo();
    this.messageBus.emit('mongosh:connect', this.connectionInfo.extraInfo);
  }

  async close(p): Promise<void> {
    for (let i = 0; i < this.mongos.length; i++) {
      await this.mongos[i].close(p);
    }
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
    contextObject.print = async(arg) => {
      if (arg.toReplString) {
        console.log(await arg.toReplString());
      } else {
        console.log(arg);
      }
    };
    Object.assign(contextObject, this.shellApi);
    Object.getOwnPropertyNames(ShellApi.prototype)
      .filter(n => !toIgnore.concat('hasAsyncChild').includes(n))
      .forEach((n) => { contextObject[n] = this.shellApi[n]; });
    contextObject.printjson = contextObject.print;
    Object.assign(contextObject, ShellBson);
    contextObject.rs = new ReplicaSet(this.currentDb.mongo);
    contextObject.sh = new Shard(this.currentDb.mongo);

    // Add global shell objects
    this.asyncWriter.symbols.initializeApiObjects({
      db: signatures.Database,
      rs: signatures.ReplicaSet,
      sh: signatures.Shard,
      Mongo: signatures.Mongo
    });

    const setFunc = (newDb: any): Database => {
      if (newDb.shellApiType === undefined || newDb.shellApiType() !== 'Database') {
        throw new MongoshInvalidInputError('Cannot reassign \'db\' to non-Database type');
      }
      this.currentDb = newDb;
      contextObject.rs = new ReplicaSet(this.currentDb.mongo);
      contextObject.sh = new Shard(this.currentDb.mongo);
      this.fetchConnectionInfo();
      return newDb;
    };
    const getFunc = (): Database => this.currentDb;
    try {
      Object.defineProperty(contextObject, 'db', {
        set: setFunc,
        get: getFunc
      });
    } catch (e) { // java shell, can't use getters/setters
      contextObject.db = setFunc(this.currentDb);
    }

    contextObject.Mongo = async(uri?, options?): Promise<Mongo> => {
      if (
        this.initialServiceProvider.platform !== ReplPlatform.CLI
      ) {
        throw new MongoshUnimplementedError(
          `new Mongo connection are not supported for current platform: ${ReplPlatform[this.initialServiceProvider.platform]}`
        );
      }
      const mongo = new Mongo(this, uri, options);
      await mongo.connect();
      this.mongos.push(mongo);
      return mongo;
    };

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

