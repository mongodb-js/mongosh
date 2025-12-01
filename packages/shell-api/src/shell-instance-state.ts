import { CommonErrors, MongoshInvalidInputError } from '@mongosh/errors';
import type {
  AutoEncryptionOptions,
  ConnectionExtraInfo,
  ConnectionInfo,
  ServerApi,
  ServiceProvider,
  ServiceProviderBaseCursor,
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
import { redactConnectionString } from 'mongodb-redact';
import { toIgnore } from './decorators';
import {
  ALL_PLATFORMS,
  ALL_SERVER_VERSIONS,
  ALL_TOPOLOGIES,
  ServerVersions,
  Topologies,
} from './enums';
import { ShellApiErrors } from './error-codes';
import type { ShellResult, DatabaseWithSchema } from './index';
import {
  getShellApiType,
  Help,
  Mongo,
  ReplicaSet,
  Shard,
  ShellApi,
} from './index';
import { InterruptFlag } from './interruptor';
import { TransformMongoErrorPlugin } from './mongo-errors';
import NoDatabase from './no-db';
import {
  type ShellBson,
  constructShellBson,
  type BSON as BSONLibrary,
} from '@mongosh/shell-bson';
import { Streams } from './streams';
import { ShellLog } from './shell-log';

import type { AutocompletionContext } from '@mongodb-js/mongodb-ts-autocomplete';
import type { JSONSchema } from 'mongodb-schema';
import { analyzeDocuments } from 'mongodb-schema';
import type { BaseCursor } from './abstract-cursor';
import { deepInspectServiceProviderWrapper } from './deep-inspect/service-provider-wrapper';

/**
 * The subset of CLI options that is relevant for the shell API's behavior itself.
 */
export interface ShellCliOptions {
  nodb?: boolean;
  deepInspect?: boolean;
}

/**
 * A set of parameters and lookup helpers for autocompletion support.
 * This encapsulates connection- and shell-state-dependent information
 * from the autocompleter implementation.
 */
export interface AutocompleteParameters {
  topology: () => Topologies | undefined;
  apiVersionInfo: () => Required<ServerApi> | undefined;
  connectionInfo: () => ConnectionExtraInfo | undefined;
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

  /**
   * Called when log.getPath() is used in the shell.
   */
  getLogPath?: () => string | undefined;
}

/**
 * Currently, a 'Plugin' for the shell API only consists of a hook for transforming
 * specific error instances, e.g. for extending the error message.
 */
export interface ShellPlugin {
  transformError?: (err: Error) => Error;
}

// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_REGEXP = /[\x00-\x1F\x7F-\x9F]/g;

/**
 * Anything to do with the state of the shell API and API objects is stored here.
 *
 * In particular, this class manages the global context object (as far as the
 * shell API is concerned) and keeps track of all open connections (a.k.a. Mongo
 * instances).
 */
export class ShellInstanceState {
  public currentCursor: BaseCursor<ServiceProviderBaseCursor> | null;
  public currentDb: DatabaseWithSchema;
  public messageBus: MongoshBus;
  public initialServiceProvider: ServiceProvider; // the initial service provider
  private bsonLibrary: BSONLibrary;
  private connectionInfoCache: {
    // Caching/lazy-loading functionality for the ServiceProvider's getConnectionInfo()
    // return value. We store the ServiceProvider instance for which we are
    // fetching/have fetched connection info to avoid duplicate fetches.
    forSp: ServiceProvider;
    // If fetching is in progress, this is a Promise, otherwise the resolved
    // return value (or undefined if we have not fetched yet).
    // Autocompletion makes use of the ability to access this purely synchronously.
    info: Promise<ConnectionInfo> | ConnectionInfo | undefined;
  };
  public context: any;
  public mongos: Mongo[];
  public shellApi: ShellApi;
  public shellLog: ShellLog;
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
  private preFetchCollectionAndDatabaseNames = true;

  constructor(
    initialServiceProvider: ServiceProvider,
    messageBus: any = new EventEmitter(),
    cliOptions: ShellCliOptions = {},
    bsonLibrary: BSONLibrary = initialServiceProvider.bsonLibrary
  ) {
    this.initialServiceProvider =
      cliOptions.deepInspect === false
        ? initialServiceProvider
        : deepInspectServiceProviderWrapper(initialServiceProvider);
    this.bsonLibrary = bsonLibrary;
    this.messageBus = messageBus;
    this.shellApi = new ShellApi(this);
    this.shellLog = new ShellLog(this);
    this.shellBson = this.constructShellBson();
    this.mongos = [];
    this.connectionInfoCache = {
      forSp: this.initialServiceProvider,
      info: undefined,
    };
    if (!cliOptions.nodb) {
      const mongo = new Mongo(
        this,
        undefined,
        undefined,
        undefined,
        this.initialServiceProvider
      );
      this.mongos.push(mongo);
      this.currentDb = mongo.getDB(
        this.initialServiceProvider.initialDb || DEFAULT_DB
      );
    } else {
      this.currentDb = new NoDatabase() as DatabaseWithSchema;
    }
    this.currentCursor = null;
    this.context = {};
    this.cliOptions = cliOptions;
    this.evaluationListener = {};
  }

  private constructShellBson(): ShellBson {
    return constructShellBson({
      bsonLibrary: this.bsonLibrary,
      printWarning: (msg: string) => {
        void this.shellApi.print(`Warning: ${msg}`);
      },
      assignMetadata: (
        target,
        { help, maxVersion, minVersion, deprecated }
      ) => {
        target.serverVersions =
          maxVersion || minVersion
            ? [
                minVersion ?? ServerVersions.earliest,
                maxVersion ?? ServerVersions.latest,
              ]
            : ALL_SERVER_VERSIONS;
        target.platforms = ALL_PLATFORMS;
        target.topologies = ALL_TOPOLOGIES;
        if (deprecated) target.deprecated = true;

        if (help) {
          target.help = (): Help => help;
          Object.setPrototypeOf(target.help, help);
        }
      },
      constructHelp: (className: string) => {
        const classHelpKeyPrefix = `shell-api.classes.${className}.help`;
        const classHelp = {
          help: `${classHelpKeyPrefix}.description`,
          example: `${classHelpKeyPrefix}.example`,
          docs: `${classHelpKeyPrefix}.link`,
          attr: [],
        };
        return new Help(classHelp);
      },
    });
  }

  async fetchConnectionInfo(): Promise<ConnectionInfo | undefined> {
    if (!this.cliOptions.nodb) {
      const serviceProvider = this.currentServiceProvider;
      if (
        serviceProvider === this.connectionInfoCache.forSp &&
        this.connectionInfoCache.info
      ) {
        // Already fetched connection info for the current service provider.
        return this.connectionInfoCache.info;
      }
      const connectionInfoPromise = serviceProvider.getConnectionInfo();
      this.connectionInfoCache = {
        forSp: serviceProvider,
        info: connectionInfoPromise,
      };
      let connectionInfo: ConnectionInfo | undefined;
      try {
        connectionInfo = await connectionInfoPromise;
      } finally {
        if (this.connectionInfoCache.info === connectionInfoPromise)
          this.connectionInfoCache.info = connectionInfo;
      }

      const apiVersionInfo = this.apiVersionInfo();
      this.messageBus.emit('mongosh:connect', {
        ...connectionInfo?.extraInfo,
        resolved_hostname: connectionInfo?.resolvedHostname,
        api_version: apiVersionInfo?.version,
        api_strict: apiVersionInfo?.strict,
        api_deprecation_errors: apiVersionInfo?.deprecationErrors,
        uri: redactConnectionString(connectionInfo?.extraInfo?.uri ?? ''),
      });
      return connectionInfo;
    }
    return undefined;
  }

  cachedConnectionInfo(): ConnectionInfo | undefined {
    const connectionInfo = this.connectionInfoCache.info;
    return (
      (connectionInfo && 'extraInfo' in connectionInfo && connectionInfo) ||
      undefined
    );
  }

  async close(): Promise<void> {
    for (const mongo of [...this.mongos]) {
      await mongo.close();
    }
  }

  public setPreFetchCollectionAndDatabaseNames(value: boolean): void {
    this.preFetchCollectionAndDatabaseNames = value;
  }

  public setDbFunc(newDb: any): DatabaseWithSchema {
    this.currentDb = newDb;
    this.context.rs = new ReplicaSet(this.currentDb);
    this.context.sh = new Shard(this.currentDb);
    this.context.sp = Streams.newInstance(this.currentDb);
    this.fetchConnectionInfo().catch((err) =>
      this.messageBus.emit('mongosh:error', err, 'shell-api')
    );
    if (this.preFetchCollectionAndDatabaseNames) {
      // Pre-fetch for autocompletion.
      this.currentDb
        ._getCollectionNamesForCompletion()
        .catch((err) =>
          this.messageBus.emit('mongosh:error', err, 'shell-api')
        );
      this.currentDb._mongo
        ._getDatabaseNamesForCompletion()
        .catch((err) =>
          this.messageBus.emit('mongosh:error', err, 'shell-api')
        );
    }
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
    contextObject.log = this.shellLog;
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

    const setFunc = (newDb: any): DatabaseWithSchema => {
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
      return (
        this.currentDb._mongo._serviceProvider ?? this.initialServiceProvider
      );
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

  public getMongoByConnectionId(connectionId: string): Mongo {
    for (const mongo of this.mongos) {
      if (mongo._getConnectionId() === connectionId) {
        return mongo;
      }
    }
    throw new Error(`mongo with connection id ${connectionId} not found`);
  }

  public getAutocompletionContext(): AutocompletionContext {
    return {
      currentDatabaseAndConnection: ():
        | {
            connectionId: string;
            databaseName: string;
          }
        | undefined => {
        try {
          return {
            connectionId: this.currentDb.getMongo()._getConnectionId(),
            databaseName: this.currentDb.getName(),
          };
        } catch (err: any) {
          if (err.name === 'MongoshInvalidInputError') {
            return undefined;
          }
          throw err;
        }
      },
      databasesForConnection: async (
        connectionId: string
      ): Promise<string[]> => {
        const mongo = this.getMongoByConnectionId(connectionId);
        try {
          const dbNames = await mongo._getDatabaseNamesForCompletion();
          return dbNames.filter(
            (name: string) => !CONTROL_CHAR_REGEXP.test(name)
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
      collectionsForDatabase: async (
        connectionId: string,
        databaseName: string
      ): Promise<string[]> => {
        const mongo = this.getMongoByConnectionId(connectionId);
        try {
          const collectionNames = await mongo
            ._getDb(databaseName)
            ._getCollectionNamesForCompletion();
          return collectionNames.filter(
            (name: string) => !CONTROL_CHAR_REGEXP.test(name)
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
      schemaInformationForCollection: async (
        connectionId: string,
        databaseName: string,
        collectionName: string
      ): Promise<JSONSchema> => {
        const mongo = this.getMongoByConnectionId(connectionId);
        let docs: Document[] = [];
        if (
          (await this.evaluationListener.getConfig?.(
            'disableSchemaSampling'
          )) !== true
        ) {
          try {
            docs = await mongo
              ._getDb(databaseName)
              .getCollection(collectionName)
              ._getSampleDocsForCompletion();
          } catch (err: any) {
            if (
              err?.code !== ShellApiErrors.NotConnected &&
              err?.codeName !== 'Unauthorized'
            ) {
              throw err;
            }
          }
        }

        const schemaAccessor = await analyzeDocuments(docs);
        const schema = await schemaAccessor.getMongoDBJsonSchema();
        return schema;
      },
    };
  }

  public getAutocompleteParameters(): AutocompleteParameters {
    return {
      topology: () => {
        let topology: Topologies;
        const topologyDescription =
          this.currentServiceProvider.getTopologyDescription();
        if (!topologyDescription) return undefined;
        const topologyType = topologyDescription?.type;
        switch (topologyType) {
          case 'ReplicaSetNoPrimary':
          case 'ReplicaSetWithPrimary':
            topology = 'ReplSet';
            break;
          case 'Sharded':
            topology = 'Sharded';
            break;
          case 'LoadBalanced':
            topology = 'LoadBalanced';
            break;
          default:
            topology = 'Standalone';
            // We're connected to a single server, but that doesn't necessarily
            // mean that that server isn't part of a replset or sharding setup
            // if we're using directConnection=true (which we do by default).
            if (topologyDescription?.servers?.size === 1) {
              const [server] = topologyDescription?.servers.values();
              switch (server.type) {
                case 'Mongos':
                  topology = 'Sharded';
                  break;
                case 'PossiblePrimary':
                case 'RSPrimary':
                case 'RSSecondary':
                case 'RSArbiter':
                case 'RSOther':
                case 'RSGhost':
                  topology = 'ReplSet';
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
        return this.cachedConnectionInfo()?.extraInfo ?? undefined;
      },
      getCollectionCompletionsForCurrentDb: async (
        collName: string
      ): Promise<string[]> => {
        try {
          const collectionNames =
            await this.currentDb._getCollectionNamesForCompletion();
          const result = collectionNames.filter(
            (name) =>
              name.toLowerCase().startsWith(collName.toLowerCase()) &&
              !CONTROL_CHAR_REGEXP.test(name)
          );
          this.messageBus.emit('mongosh:load-collections-complete');
          return result;
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
          const result = dbNames.filter(
            (name) =>
              name.toLowerCase().startsWith(dbName.toLowerCase()) &&
              !CONTROL_CHAR_REGEXP.test(name)
          );
          this.messageBus.emit('mongosh:load-databases-complete');
          return result;
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
    const connectionInfo = await this.fetchConnectionInfo();
    if (connectionInfo?.extraInfo?.is_stream) {
      return 'AtlasStreamProcessing> ';
    }

    const prefix = await this.getDefaultPromptPrefix();
    const topologyInfo = await this.getTopologySpecificPrompt();
    let dbname = '';
    try {
      dbname = this.currentDb.getName();
    } catch {
      /* nodb */
    }
    return `${[prefix, topologyInfo, dbname].filter(Boolean).join(' ')}> `;
  }

  private async getDefaultPromptPrefix(): Promise<string> {
    const connectionInfo = await this.fetchConnectionInfo();
    const extraConnectionInfo = connectionInfo?.extraInfo;
    if (extraConnectionInfo?.is_data_federation) {
      return 'AtlasDataFederation';
    } else if (extraConnectionInfo?.is_local_atlas) {
      return 'AtlasLocalDev';
    } else if (extraConnectionInfo?.is_atlas) {
      return 'Atlas';
    } else if (
      extraConnectionInfo?.is_enterprise ||
      connectionInfo?.buildInfo?.modules?.indexOf('enterprise') >= 0
    ) {
      return 'Enterprise';
    }
    return '';
  }

  private async getTopologySpecificPrompt(): Promise<string> {
    const connectionInfo = await this.fetchConnectionInfo();
    const description = this.currentServiceProvider.getTopologyDescription();
    if (!description) {
      return '';
    }

    let replicaSet = description.setName;
    let serverTypePrompt = '';
    switch (description.type) {
      case 'Single': {
        const singleDetails = this.getTopologySinglePrompt(description);
        replicaSet = singleDetails?.replicaSet ?? replicaSet;
        serverTypePrompt = singleDetails?.serverType
          ? `[direct: ${singleDetails.serverType}]`
          : '';
        break;
      }
      case 'ReplicaSetNoPrimary':
        serverTypePrompt = '[secondary]';
        break;
      case 'ReplicaSetWithPrimary':
        serverTypePrompt = '[primary]';
        break;
      case 'Sharded':
        serverTypePrompt = connectionInfo?.extraInfo?.atlas_version
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
      replicaSet: server.setName ?? description.setName ?? null,
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

export default ShellInstanceState;
