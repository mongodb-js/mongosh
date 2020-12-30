import {
  AggregationCursor,
  Cursor,
  Database,
  Mongo,
  ReplicaSet,
  Shard,
  signatures,
  toIterator,
  ShellApi,
  getShellApiType,
  ShellResult
} from './index';
import constructShellBson from './shell-bson';
import { EventEmitter } from 'events';
import { DEFAULT_DB, ReplPlatform, ServiceProvider, ConnectInfo, TopologyType } from '@mongosh/service-provider-core';
import { CommonErrors, MongoshInvalidInputError } from '@mongosh/errors';
import AsyncWriter from '@mongosh/async-rewriter';
import { toIgnore } from './decorators';
import NoDatabase from './no-db';
import redactInfo from 'mongodb-redact';
import ChangeStreamCursor from './change-stream-cursor';
import { Topologies } from './enums';
import type { MongoshBus, ApiEvent } from '@mongosh/types';
import { ShellApiErrors } from './error-codes';

export interface ShellCliOptions {
  nodb?: boolean;
}

export interface AutocompleteParameters {
  topology: () => Topologies;
  connectionInfo: () => ConnectInfo | undefined;
  getCollectionCompletionsForCurrentDb: (collName: string) => Promise<string[]>;
}

export interface EvaluationListener {
  /**
   * Called when print() or printjson() is run from the shell.
   */
  onPrint?: (value: ShellResult[]) => Promise<void> | void;

  /**
   * Called when enableTelemetry() or disableTelemetry() is run from the shell.
   * The return value may be a Promise. Its value is printed as the result of
   * the call.
   */
  toggleTelemetry?: (enabled: boolean) => any;

  /**
   * Called when e.g. passwordPrompt() is called from the shell.
   */
  onPrompt?: (question: string, type: 'password') => Promise<string> | string;

  /**
   * Called when cls is entered in the shell.
   */
  onClearCommand?: () => Promise<void> | void;

  /**
   * Called when exit/quit is entered in the shell.
   */
  onExit?: () => Promise<never>;
}

/**
 * Anything to do with the internal shell state is stored here.
 */
export default class ShellInternalState {
  public currentCursor: Cursor | AggregationCursor | ChangeStreamCursor | null;
  public currentDb: Database;
  public messageBus: MongoshBus;
  public asyncWriter: AsyncWriter;
  public initialServiceProvider: ServiceProvider; // the initial service provider
  public uri: string | null;
  public connectionInfo: any;
  public context: any;
  public mongos: Mongo[];
  public shellApi: ShellApi;
  public shellBson: any;
  public cliOptions: ShellCliOptions;
  public evaluationListener: EvaluationListener;
  constructor(initialServiceProvider: ServiceProvider, messageBus: any = new EventEmitter(), cliOptions: ShellCliOptions = {}) {
    this.initialServiceProvider = initialServiceProvider;
    this.messageBus = messageBus;
    this.asyncWriter = new AsyncWriter(signatures);
    this.shellApi = new ShellApi(this);
    this.shellBson = constructShellBson(initialServiceProvider.bsonLibrary);
    this.mongos = [];
    this.connectionInfo = { buildInfo: {} };
    if (!cliOptions.nodb) {
      const mongo = new Mongo(this);
      this.mongos.push(mongo);
      this.currentDb = mongo.getDB(initialServiceProvider.initialDb || DEFAULT_DB);
    } else {
      this.currentDb = new NoDatabase() as Database;
    }
    this.uri = null;
    this.currentCursor = null;
    this.context = {};
    this.cliOptions = cliOptions;
    this.evaluationListener = {};
  }

  async fetchConnectionInfo(): Promise<void> {
    if (!this.cliOptions.nodb) {
      this.connectionInfo = await this.currentDb._mongo._serviceProvider.getConnectionInfo();
      this.messageBus.emit('mongosh:connect', {
        ...this.connectionInfo.extraInfo,
        uri: redactInfo(this.connectionInfo.extraInfo.uri)
      });
    }
  }

  async close(force: boolean): Promise<void> {
    for (let i = 0; i < this.mongos.length; i++) {
      await this.mongos[i].close(force);
    }
  }

  public setDbFunc(newDb: any): Database {
    this.currentDb = newDb;
    this.context.rs = new ReplicaSet(this.currentDb);
    this.context.sh = new Shard(this.currentDb);
    this.fetchConnectionInfo();
    this.currentDb._getCollectionNames(); // Pre-fetch for autocompletion.
    return newDb;
  }

  /**
   * Prepare a `contextObject` as global context and set it as context
   * Add each attribute to the AsyncWriter also.
   *
   * The `contextObject` is prepared so that it can be used as global object
   * for the repl evaluation.
   *
   * @note The `contextObject` is mutated, it will retain all of its existing
   * properties but also have the global shell api objects and functions.
   *
   * @param {Object} contextObject - contextObject an object used as global context.
   */
  setCtx(contextObject: any): void {
    this.context = contextObject;
    contextObject.toIterator = toIterator;
    Object.assign(contextObject, this.shellApi); // currently empty, but in the future we may have properties
    for (const name of Object.getOwnPropertyNames(ShellApi.prototype)) {
      if (toIgnore.concat(['hasAsyncChild', 'help']).includes(name) ||
        typeof (this.shellApi as any)[name] !== 'function') {
        continue;
      }
      contextObject[name] = (...args: any[]): any => {
        return (this.shellApi as any)[name](...args);
      };
      contextObject[name].help = (this.shellApi as any)[name].help;
    }
    contextObject.help = this.shellApi.help;
    Object.assign(contextObject, this.shellBson);
    if (contextObject.console === undefined) {
      contextObject.console = {};
    }
    for (const key of ['log', 'warn', 'info', 'error']) {
      contextObject.console[key] = async(...args: any[]): Promise<void> => {
        return await contextObject.print(...args);
      };
    }
    contextObject.console.clear = contextObject.cls;

    contextObject.rs = new ReplicaSet(this.currentDb);
    contextObject.sh = new Shard(this.currentDb);

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
      if (getShellApiType(newDb) !== 'Database') {
        throw new MongoshInvalidInputError('Cannot reassign \'db\' to non-Database type', CommonErrors.InvalidOperation);
      }
      return this.setDbFunc(newDb);
    };

    if (this.initialServiceProvider.platform === ReplPlatform.JavaShell) {
      contextObject.db = this.setDbFunc(this.currentDb); // java shell, can't use getters/setters
    } else {
      Object.defineProperty(contextObject, 'db', {
        configurable: true,
        set: setFunc,
        get: () => (this.currentDb)
      });
    }

    this.messageBus.emit(
      'mongosh:setCtx',
      { method: 'setCtx', arguments: {} }
    );
  }

  public emitApiCall(event: ApiEvent): void {
    this.messageBus.emit('mongosh:api-call', event);
  }

  public setEvaluationListener(listener: EvaluationListener): void {
    this.evaluationListener = listener;
  }

  public getAutocompleteParameters(): AutocompleteParameters {
    return {
      // eslint-disable-next-line complexity
      topology: () => {
        let topology: Topologies;
        const topologyDescription = this.connectionInfo.topology?.description;
        const topologyType: TopologyType | undefined = topologyDescription?.type;
        switch (topologyType) {
          case 'ReplicaSetNoPrimary':
          case 'ReplicaSetWithPrimary':
            topology = Topologies.ReplSet;
            break;
          case 'Sharded':
            topology = Topologies.Sharded;
            break;
          default:
            topology = Topologies.Standalone;
            // We're connected to a single server, but that doesn't necessarily
            // mean that that server isn't part of a replset or sharding setup
            // if we're using directConnection=true (which we do by default).
            if (topologyDescription.servers.size === 1) {
              const [ server ] = topologyDescription.servers.values();
              switch (server.type) {
                case 'Mongos':
                  topology = Topologies.Sharded;
                  break;
                case 'PossiblePrimary':
                case 'RSPrimary':
                case 'RSSecondary':
                case 'RSArbiter':
                case 'RSOther':
                case 'RSGhost':
                  topology = Topologies.ReplSet;
                  break;
                default:
                  // Either Standalone, Unknown, or something so unknown that
                  // it isn't even listed in the enum right now.
                  break;
              }
            }
            break;
        }
        return topology;
      },
      connectionInfo: () => {
        return this.connectionInfo.extraInfo;
      },
      getCollectionCompletionsForCurrentDb: async(collName: string): Promise<string[]> => {
        try {
          const collectionNames = await this.currentDb._getCollectionNamesForCompletion();
          return collectionNames.filter((name) => name.startsWith(collName));
        } catch (err) {
          if (err.code === ShellApiErrors.NotConnected) {
            return [];
          }
          throw err;
        }
      }
    };
  }

  public async getDefaultPrompt(): Promise<string> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(`${new Date()} > `);
      }, 10);
    });
  }
}
