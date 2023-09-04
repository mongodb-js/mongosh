import { CommonErrors, MongoshInvalidInputError } from '@mongosh/errors';
import type {
  AutoEncryptionOptions,
  ConnectInfo,
  ServerApi,
  ServiceProvider,
  TopologyDescription,
} from '@mongosh/service-provider-core';
import { DEFAULT_DB } from '@mongosh/service-provider-core';
import type {
  ApiEvent,
  ApiEventWithArguments,
  ConfigProvider,
  MongoshBus,
  ShellUserConfig,
} from '@mongosh/types';
import { EventEmitter } from 'events';
import redactInfo from 'mongodb-redact';
import type ChangeStreamCursor from './change-stream-cursor';
import { toIgnore } from './decorators';
import { Topologies } from './enums';
import { ShellApiErrors } from './error-codes';
import type {
  AggregationCursor,
  Cursor,
  RunCommandCursor,
  Database,
  ShellResult,
} from './index';
import { getShellApiType, Mongo, ReplicaSet, Shard, ShellApi } from './index';
import { InterruptFlag } from './interruptor';
import { TransformMongoErrorPlugin } from './mongo-errors';
import NoDatabase from './no-db';
import type { ShellBson } from './shell-bson';
import constructShellBson from './shell-bson';
import { Streams } from './streams';

/**
 * The subset of CLI options that is relevant for the shell API's behavior itself.
 */
export interface ShellCliOptions {
  nodb?: boolean;
}

/**
 * A set of parameters and lookup helpers for autocompletion support.
 * This encapsulates connection- and shell-state-dependent information
 * from the autocompleter implementation.
 */
export interface AutocompleteParameters {
  topology: () => Topologies;
  apiVersionInfo: () => Required<ServerApi> | undefined;
  connectionInfo: () => ConnectInfo | undefined;
  getCollectionCompletionsForCurrentDb: (collName: string) => Promise<string[]>;
  getDatabaseCompletions: (dbName: string) => Promise<string[]>;
}

/**
 * Internal object that represents a file that has been prepared for loading
 * through load().
 */
export interface OnLoadResult {
  /**
   * The absolute path of the file that should be load()ed.
   */
  resolvedFilename: string;

  /**
   * The actual steps that are needed to evaluate the load()ed file.
   * For the duration of this call, __filename and __dirname are set as expected.
   */
  evaluate(): Promise<void>;
}

/**
 * A set of hooks that modify shell behavior, usually in response to some
 * form of user input.
 */
export interface EvaluationListener
  extends Partial<ConfigProvider<ShellUserConfig>> {
  /**
   * Called when print() or printjson() is run from the shell.
   */
  onPrint?: (
    value: ShellResult[],
    type: 'print' | 'printjson'
  ) => Promise<void> | void;

  /**
   * Called when e.g. passwordPrompt() is called from the shell.
   */
  onPrompt?: (
    question: string,
    type: 'password' | 'yesno'
  ) => Promise<string> | string;

  /**
   * Called when cls is entered in the shell.
   */
  onClearCommand?: () => Promise<void> | void;

  /**
   * Called when exit/quit is entered in the shell.
   */
  onExit?: (exitCode?: number) => Promise<never>;

  /**
   * Called when load() is used in the shell.
   */
  onLoad?: (filename: string) => Promise<OnLoadResult> | OnLoadResult;

  /**
   * Called when initiating a connection that uses FLE in the shell.
   * This should locate a crypt shared libraray instance and return the relevant
   * options used to access it.
   */
  getCryptLibraryOptions?: () => Promise<AutoEncryptionOptions['extraOptions']>;
}

/**
 * Currently, a 'Plugin' for the shell API only consists of a hook for transforming
 * specific error instances, e.g. for extending the error message.
 */
export interface ShellPlugin {
  transformError?: (err: Error) => Error;
}

/**
 * Anything to do with the state of the shell API and API objects is stored here.
 *
 * In particular, this class manages the global context object (as far as the
 * shell API is concerned) and keeps track of all open connections (a.k.a. Mongo
 * instances).
 */
export default class ShellInstanceState {
  public currentCursor:
    | Cursor
    | AggregationCursor
    | ChangeStreamCursor
    | RunCommandCursor
    | null;
  public currentDb: Database;
  public messageBus: MongoshBus;
  public initialServiceProvider: ServiceProvider; // the initial service provider
  public connectionInfo: any;
  public context: any;
  public mongos: Mongo[];
  public shellApi: ShellApi;
  public shellBson: ShellBson;
  public cliOptions: ShellCliOptions;
  public evaluationListener: EvaluationListener;
  public displayBatchSizeFromDBQuery: number | undefined = undefined;
  public isInteractive = false;
  public apiCallDepth = 0;
  private warningsShown: Set<string> = new Set();

  public readonly interrupted = new InterruptFlag();
  public resumeMongosAfterInterrupt:
    | Array<{
        mongo: Mongo;
        resume: (() => Promise<void>) | null;
      }>
    | undefined;

  private plugins: ShellPlugin[] = [new TransformMongoErrorPlugin()];
  private alreadyTransformedErrors = new WeakMap<Error, Error>();

  constructor(
    initialServiceProvider: ServiceProvider,
    messageBus: any = new EventEmitter(),
    cliOptions: ShellCliOptions = {}
  ) {
    this.initialServiceProvider = initialServiceProvider;
    this.messageBus = messageBus;
    this.shellApi = new ShellApi(this);
    this.shellBson = constructShellBson(
      initialServiceProvider.bsonLibrary,
      (msg: string) => {
        void this.shellApi.print(`Warning: ${msg}`);
      }
    );
    this.mongos = [];
    this.connectionInfo = { buildInfo: {} };
    if (!cliOptions.nodb) {
      const mongo = new Mongo(
        this,
        undefined,
        undefined,
        undefined,
        initialServiceProvider
      );
      this.mongos.push(mongo);
      this.currentDb = mongo.getDB(
        initialServiceProvider.initialDb || DEFAULT_DB
      );
    } else {
      this.currentDb = new NoDatabase() as Database;
    }
    this.currentCursor = null;
    this.context = {};
    this.cliOptions = cliOptions;
    this.evaluationListener = {};
  }

  async fetchConnectionInfo(): Promise<void> {
    if (!this.cliOptions.nodb) {
      this.connectionInfo =
        await this.currentServiceProvider.getConnectionInfo();
      const apiVersionInfo = this.apiVersionInfo();
      this.messageBus.emit('mongosh:connect', {
        ...this.connectionInfo.extraInfo,
        api_version: apiVersionInfo?.version,
        api_strict: apiVersionInfo?.strict,
        api_deprecation_errors: apiVersionInfo?.deprecationErrors,
        uri: redactInfo(this.connectionInfo.extraInfo.uri),
      });
    }
  }

  async close(force: boolean): Promise<void> {
    for (const mongo of [...this.mongos]) {
      await mongo.close(force);
    }
  }

  public setDbFunc(newDb: any): Database {
    this.currentDb = newDb;
    this.context.rs = new ReplicaSet(this.currentDb);
    this.context.sh = new Shard(this.currentDb);
    this.context.sp = Streams.newInstance(this.currentDb);
    this.fetchConnectionInfo().catch((err) =>
      this.messageBus.emit('mongosh:error', err, 'shell-api')
    );
    // Pre-fetch for autocompletion.
    this.currentDb
      ._getCollectionNamesForCompletion()
      .catch((err) => this.messageBus.emit('mongosh:error', err, 'shell-api'));
    this.currentDb._mongo
      ._getDatabaseNamesForCompletion()
      .catch((err) => this.messageBus.emit('mongosh:error', err, 'shell-api'));
    this.currentCursor = null;
    return newDb;
  }

  /**
   * Prepare a `contextObject` as global context and set it as context.
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
    Object.assign(contextObject, this.shellApi);
    for (const name of Object.getOwnPropertyNames(ShellApi.prototype)) {
      const { shellApi } = this;
      if (
        toIgnore.concat(['help']).includes(name) ||
        typeof (shellApi as any)[name] !== 'function'
      ) {
        continue;
      }
      contextObject[name] = function (...args: any[]): any {
        return (shellApi as any)[name](...args);
      };
      contextObject[name].help = (shellApi as any)[name].help;
    }
    contextObject.help = this.shellApi.help;
    Object.assign(contextObject, this.shellBson);
    if (contextObject.console === undefined) {
      contextObject.console = {};
    }
    for (const key of ['log', 'warn', 'info', 'error']) {
      contextObject.console[key] = (...args: any[]): Promise<void> => {
        return contextObject.print(...args);
      };
    }
    contextObject.console.clear = contextObject.cls;

    contextObject.rs = new ReplicaSet(this.currentDb);
    contextObject.sh = new Shard(this.currentDb);
    contextObject.sp = Streams.newInstance(this.currentDb);

    const setFunc = (newDb: any): Database => {
      if (getShellApiType(newDb) !== 'Database') {
        throw new MongoshInvalidInputError(
          "Cannot reassign 'db' to non-Database type",
          CommonErrors.InvalidOperation
        );
      }
      return this.setDbFunc(newDb);
    };

    if (this.initialServiceProvider.platform === 'JavaShell') {
      contextObject.db = this.setDbFunc(this.currentDb); // java shell, can't use getters/setters
    } else {
      Object.defineProperty(contextObject, 'db', {
        configurable: true,
        set: setFunc,
        get: () => this.currentDb,
      });
    }

    this.messageBus.emit('mongosh:setCtx', { method: 'setCtx', arguments: {} });
  }

  get currentServiceProvider(): ServiceProvider {
    try {
      return this.currentDb._mongo._serviceProvider;
    } catch (err: any) {
      if (err?.code === ShellApiErrors.NotConnected) {
        return this.initialServiceProvider;
      }
      throw err;
    }
  }

  public emitApiCallWithArgs(event: ApiEventWithArguments): void {
    this.messageBus.emit('mongosh:api-call-with-arguments', event);
  }

  public emitApiCall(event: Omit<ApiEvent, 'callDepth'>): void {
    this.messageBus.emit('mongosh:api-call', {
      ...event,
      callDepth: this.apiCallDepth,
    });
  }

  public setEvaluationListener(listener: EvaluationListener): void {
    this.evaluationListener = listener;
  }

  public getAutocompleteParameters(): AutocompleteParameters {
    return {
      topology: () => {
        let topology: Topologies;
        const topologyDescription = this.currentServiceProvider.getTopology()
          ?.description as TopologyDescription;
        // TODO: once a driver with NODE-3011 is available set type to TopologyType | undefined
        const topologyType: string | undefined = topologyDescription?.type;
        switch (topologyType) {
          case 'ReplicaSetNoPrimary':
          case 'ReplicaSetWithPrimary':
            topology = Topologies.ReplSet;
            break;
          case 'Sharded':
            topology = Topologies.Sharded;
            break;
          case 'LoadBalanced':
            topology = Topologies.LoadBalanced;
            break;
          default:
            topology = Topologies.Standalone;
            // We're connected to a single server, but that doesn't necessarily
            // mean that that server isn't part of a replset or sharding setup
            // if we're using directConnection=true (which we do by default).
            if (topologyDescription.servers.size === 1) {
              const [server] = topologyDescription.servers.values();
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
                  // LoadBalancer cannot be the case here as the topologyType MUST be set to LoadBalanced
                  break;
              }
            }
            break;
        }
        return topology;
      },
      apiVersionInfo: () => {
        return this.apiVersionInfo();
      },
      connectionInfo: () => {
        return this.connectionInfo.extraInfo;
      },
      getCollectionCompletionsForCurrentDb: async (
        collName: string
      ): Promise<string[]> => {
        try {
          const collectionNames =
            await this.currentDb._getCollectionNamesForCompletion();
          return collectionNames.filter((name) =>
            name.toLowerCase().startsWith(collName.toLowerCase())
          );
        } catch (err: any) {
          if (
            err?.code === ShellApiErrors.NotConnected ||
            err?.codeName === 'Unauthorized'
          ) {
            return [];
          }
          throw err;
        }
      },
      getDatabaseCompletions: async (dbName: string): Promise<string[]> => {
        try {
          const dbNames =
            await this.currentDb._mongo._getDatabaseNamesForCompletion();
          return dbNames.filter((name) =>
            name.toLowerCase().startsWith(dbName.toLowerCase())
          );
        } catch (err: any) {
          if (
            err?.code === ShellApiErrors.NotConnected ||
            err?.codeName === 'Unauthorized'
          ) {
            return [];
          }
          throw err;
        }
      },
    };
  }

  apiVersionInfo(): Required<ServerApi> | undefined {
    const { serverApi } =
      this.currentServiceProvider.getRawClient()?.options ?? {};
    return serverApi?.version
      ? { strict: false, deprecationErrors: false, ...serverApi }
      : undefined;
  }

  async onInterruptExecution(): Promise<boolean> {
    await this.interrupted.set();
    this.currentCursor = null;

    this.resumeMongosAfterInterrupt = await Promise.all(
      this.mongos.map(async (m) => {
        try {
          return {
            mongo: m,
            resume: await m._suspend(),
          };
        } catch (e: any) {
          return {
            mongo: m,
            resume: null,
          };
        }
      })
    );
    return !this.resumeMongosAfterInterrupt.find((r) => r.resume === null);
  }

  async onResumeExecution(): Promise<boolean> {
    const promises =
      this.resumeMongosAfterInterrupt?.map(async (r) => {
        if (!this.mongos.find((m) => m === r.mongo)) {
          // we do not resume mongo instances that we don't track anymore
          return true;
        }
        if (r.resume === null) {
          return false;
        }
        try {
          await r.resume();
          return true;
        } catch (e: any) {
          return false;
        }
      }) ?? [];
    this.resumeMongosAfterInterrupt = undefined;

    const result = await Promise.all(promises);
    this.interrupted.reset();
    return !result.find((r) => r === false);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getDefaultPrompt(): Promise<string> {
    if (this.connectionInfo?.extraInfo?.is_stream) {
      return 'AtlasStreamProcessing> ';
    }

    const prefix = this.getDefaultPromptPrefix();
    const topologyInfo = this.getTopologySpecificPrompt();
    let dbname = '';
    try {
      dbname = this.currentDb.getName();
    } catch {
      /* nodb */
    }
    return `${[prefix, topologyInfo, dbname].filter(Boolean).join(' ')}> `;
  }

  private getDefaultPromptPrefix(): string {
    const extraConnectionInfo = this.connectionInfo?.extraInfo;
    if (extraConnectionInfo?.is_data_federation) {
      return 'AtlasDataFederation';
    } else if (extraConnectionInfo?.is_local_atlas) {
      return 'AtlasLocalDev';
    } else if (extraConnectionInfo?.is_atlas) {
      return 'Atlas';
    } else if (
      extraConnectionInfo?.is_enterprise ||
      this.connectionInfo?.buildInfo?.modules?.indexOf('enterprise') >= 0
    ) {
      return 'Enterprise';
    }
    return '';
  }

  private getTopologySpecificPrompt(): string {
    // TODO: once a driver with NODE-3011 is available set type to TopologyDescription
    const description = this.currentServiceProvider.getTopology()?.description;
    if (!description) {
      return '';
    }

    let replicaSet = description.setName;
    let serverTypePrompt = '';
    // TODO: replace with proper TopologyType constants - NODE-2973
    switch (description.type) {
      case 'Single':
        const singleDetails = this.getTopologySinglePrompt(description);
        replicaSet = singleDetails?.replicaSet ?? replicaSet;
        serverTypePrompt = singleDetails?.serverType
          ? `[direct: ${singleDetails.serverType}]`
          : '';
        break;
      case 'ReplicaSetNoPrimary':
        serverTypePrompt = '[secondary]';
        break;
      case 'ReplicaSetWithPrimary':
        serverTypePrompt = '[primary]';
        break;
      case 'Sharded':
        serverTypePrompt = this.connectionInfo?.extraInfo?.atlas_version
          ? ''
          : '[mongos]';
        break;
      case 'LoadBalanced':
      default:
        return '';
    }

    const setNamePrefix = replicaSet ? `${replicaSet} ` : '';
    return `${setNamePrefix}${serverTypePrompt}`;
  }

  private getTopologySinglePrompt(
    description: TopologyDescription
  ): { replicaSet: string | null; serverType: string } | undefined {
    if (description.servers?.size !== 1) {
      return undefined;
    }
    const [server] = description.servers.values();

    // TODO: replace with proper ServerType constants - NODE-2973
    let serverType: string;
    switch (server.type) {
      case 'Mongos':
        serverType = 'mongos';
        break;
      case 'RSPrimary':
        serverType = 'primary';
        break;
      case 'RSSecondary':
        serverType = 'secondary';
        break;
      case 'RSArbiter':
        serverType = 'arbiter';
        break;
      case 'RSOther':
        serverType = 'other';
        break;
      default:
        // Standalone, PossiblePrimary, RSGhost, LoadBalancer, Unknown
        serverType = '';
    }

    return {
      replicaSet: server.setName,
      serverType,
    };
  }

  registerPlugin(plugin: ShellPlugin): void {
    this.plugins.push(plugin);
  }

  transformError(err: any): any {
    if (Object.prototype.toString.call(err) === '[object Error]') {
      if (this.alreadyTransformedErrors.has(err)) {
        return this.alreadyTransformedErrors.get(err);
      }
      const before = err;

      for (const plugin of this.plugins) {
        if (plugin.transformError) {
          err = plugin.transformError(err);
        }
      }

      this.alreadyTransformedErrors.set(before, err);
    }
    return err;
  }

  /**
   * Prints a deprecation warning message once.
   *
   * @param message Deprecation message
   */
  async printDeprecationWarning(message: string): Promise<void> {
    if (!this.warningsShown.has(message)) {
      this.warningsShown.add(message);
      // TODO: This should be just this.shellApi.print once the java-shell package
      // does not do its own console.log()/print() implementation anymore
      if (this.context.print) {
        await this.context.print.call(
          this.shellApi,
          `DeprecationWarning: ${message}`
        );
      } else {
        await this.shellApi.print(`DeprecationWarning: ${message}`);
      }
    }
  }

  /**
   * Prints a warning message once.
   *
   * @param message A warning message
   */
  async printWarning(message: string): Promise<void> {
    if (!this.warningsShown.has(message)) {
      this.warningsShown.add(message);
      // TODO: This should be just this.shellApi.print once the java-shell package
      // does not do its own console.log()/print() implementation anymore
      if (this.context.print) {
        await this.context.print.call(this.shellApi, `Warning: ${message}`);
      } else {
        await this.shellApi.print(`Warning: ${message}`);
      }
    }
  }
}
