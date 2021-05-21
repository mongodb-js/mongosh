/* eslint camelcase: 0 */
export interface ApiEventArguments {
  pipeline?: any[];
  query?: object;
  options?: object;
  filter?: object;
}

export interface ApiEvent {
  method?: string;
  class?: string;
  db?: string;
  coll?: string;
  uri?: string;
  arguments?: ApiEventArguments;
}

export interface ApiWarning extends ApiEvent {
  message: string;
}

export interface UseEvent {
  db: string;
}

export interface EvaluateInputEvent {
  input: string;
}

export interface ShowEvent {
  method: string;
}

export interface ConnectEvent {
  is_atlas: boolean;
  is_localhost: boolean;
  server_version: string;
  server_os?: string;
  server_arch?: string;
  is_enterprise: boolean;
  auth_type?: string;
  is_data_lake: boolean;
  dl_version?: string;
  is_genuine: boolean;
  non_genuine_server_name: string;
  node_version: string;
  uri: string;
}

export interface ScriptLoadFileEvent {
  nested: boolean;
  filename: string;
}

export interface StartLoadingCliScriptsEvent {
  usesShellOption: boolean;
}

export interface MongocryptdTrySpawnEvent {
  spawnPath: string[];
  path: string;
}

export interface MongocryptdErrorEvent {
  cause: string;
  error?: Error;
  stderr?: string;
}

export interface MongocryptdLogEvent {
  pid: number;
  logEntry: any;
}

export interface StartMongoshReplEvent {
  version: string;
}

export interface MongoshBusEventsMap {
  /**
   * Signals a connection to a MongoDB instance has been established
   * or the used database changed.
   */
  'mongosh:connect': (ev: ConnectEvent) => void;
  /**
   * Signals the creation of a new Mongo client with metadata provided
   * by the underlying driver implementation.
   */
  'mongosh:driver-initialized': (driverMetadata: any) => void;
  /**
   * Signals that the shell is started by a new user.
   */
  'mongosh:new-user': (id: string, enableTelemetry: boolean) => void;
  /**
   * Signals a change of the user telemetry settings.
   */
  'mongosh:update-user': (id: string, enableTelemetry: boolean) => void;
  /**
   * Signals an error that should be logged or potentially tracked by analytics.
   */
  'mongosh:error': (error: Error) => void;
  /**
   * Signals the start of the evaluation of user code inside Shellevaluator.
   */
  'mongosh:evaluate-input': (ev: EvaluateInputEvent) => void;
  /**
   * Signals the completion of the evaluation of user code in AsyncRepl (final step of the evaluation)
   * regardless of success, error, or being interrupted.
   */
  'mongosh:evaluate-finished': () => void;
  /**
   * Signals a user used the `use` command.
   */
  'mongosh:use': (ev: UseEvent) => void;
  /**
   * Signals a user used the `Mongo.getDB` method.
   */
  'mongosh:getDB': (ev: UseEvent) => void;
  /**
   * Signals a user used the `show` command.
   */
  'mongosh:show': (ev: ShowEvent) => void;
  /**
   * Signals the global context for the shell evaluation has been initialized.
   */
  'mongosh:setCtx': (ev: ApiEvent) => void;
  /**
   * Signals usage of a shell API method.
   */
  'mongosh:api-call': (ev: ApiEvent) => void;
  /**
   * Signals usage of a deprecated shell API method.
   */
  'mongosh:deprecated-api-call': (ev: ApiEvent) => void;
  /**
   * Signals an error for an operation that we can silently ignore but still warn about.
   */
  'mongosh:warn': (ev: ApiWarning) => void;
  /**
   * Signals the use of the `load` feature to load a file for evaluation.
   */
  'mongosh:api-load-file': (ev: ScriptLoadFileEvent) => void;
  /**
   * Signals the start of loading external files upon startup.
   */
  'mongosh:start-loading-cli-scripts': (event: StartLoadingCliScriptsEvent) => void;
  /**
   * Signals the successful startup of the mongosh REPL after initial files and configuration
   * have been loaded.
   */
  'mongosh:start-mongosh-repl': (ev: StartMongoshReplEvent) => void;
  /**
   * Signals the start of loading a mongosh configuration file.
   */
  'mongosh:mongoshrc-load': () => void;
  /**
   * Signals the detection of a legacy `mongo` configuration file or a misnamed mongosh configuration file.
   */
  'mongosh:mongoshrc-mongorc-warn': () => void;
  /**
   * Signals the start of the evaluation of a script provided by the --eval CLI option.
   */
  'mongosh:eval-cli-script': () => void;
  /**
   * Signals the completion of asynchronous user code execution due to the internal interrupt exception
   * caused by CTRL-C.
   * Not fired for interrupts of _synchronous_ code.
   */
  'mongosh:eval-interrupted': () => void;
  /**
   * Signals the start of trying to spawn a `mongocryptd` process.
   */
  'mongosh:mongocryptd-tryspawn': (ev: MongocryptdTrySpawnEvent) => void;
  /**
   * Signals an error while interfacing with a `mongocryptd` process.
   */
  'mongosh:mongocryptd-error': (ev: MongocryptdErrorEvent) => void;
  /**
   * Signals an event to be logged for a `mongocryptd` process.
   */
  'mongosh:mongocryptd-log': (ev: MongocryptdLogEvent) => void;
  /**
   * Signals that the CLI REPL's `close` method has completed.
   * _ONLY AVAILABLE FOR TESTING._
   */
  'mongosh:closed': () => void;
  /**
   * Signals the completion of executing user code in MongoshRepl. Not fired for nested `load` evaluations.
   *
   * Note: When the evaluation of user code returns an error, the `mongosh:error` event is fired _after_ this event.
   *
   * _ONLY AVAILABLE FOR TESTING._
   */
  'mongosh:eval-complete': () => void;
  /**
   * Signals the completion of the autocomplete suggestion providers.
   * _ONLY AVAILABLE FOR TESTING._
   */
  'mongosh:autocompletion-complete': () => void;
  /**
   * Signals the completion of the asynchronous interrupt handler in MongoshRepl. Not fired for interrupts of _synchronous_ code.
   * _ONLY AVAILABLE FOR TESTING._
   */
  'mongosh:interrupt-complete': () => void;
}

export interface MongoshBus {
  // TypeScript uses something like this itself for its EventTarget definitions.
  on<K extends keyof MongoshBusEventsMap>(event: K, listener: MongoshBusEventsMap[K]): this;
  once<K extends keyof MongoshBusEventsMap>(event: K, listener: MongoshBusEventsMap[K]): this;
  emit<K extends keyof MongoshBusEventsMap>(event: K, ...args: MongoshBusEventsMap[K] extends (...args: infer P) => any ? P : never): unknown;
}

export class ShellUserConfig {
  batchSize = 20;
  enableTelemetry = false;
}

export class ShellUserConfigValidator {
  static async validate<K extends keyof ShellUserConfig>(key: K, value: ShellUserConfig[K]): Promise<string | null> {
    switch (key) {
      case 'batchSize':
        if (typeof value !== 'number' || value <= 0) {
          return `${key} must be a positive integer`;
        }
        return null;
      case 'enableTelemetry':
        if (typeof value !== 'boolean') {
          return `${key} must be a boolean`;
        }
        return null;
      default:
        return `${key} is not a known config option`;
    }
  }
}

export class CliUserConfig extends ShellUserConfig {
  userId = '';
  disableGreetingMessage = false;
  inspectCompact: number | boolean = 3;
  inspectDepth = 6;
  historyLength = 1000;
  showStackTraces = false;
}

export class CliUserConfigValidator extends ShellUserConfigValidator {
  // eslint-disable-next-line complexity
  static async validate<K extends keyof CliUserConfig>(key: K, value: CliUserConfig[K]): Promise<string | null> {
    switch (key) {
      case 'userId':
      case 'disableGreetingMessage':
        return null; // Not modifiable by the user anyway.
      case 'inspectCompact':
        if (typeof value !== 'boolean' && (typeof value !== 'number' || value < 0)) {
          return `${key} must be a boolean or a positive integer`;
        }
        return null;
      case 'inspectDepth':
      case 'historyLength':
        if (typeof value !== 'number' || value < 0) {
          return `${key} must be a positive integer`;
        }
        return null;
      case 'showStackTraces':
        if (typeof value !== 'boolean') {
          return `${key} must be a boolean`;
        }
        return null;
      default:
        return super.validate(key as keyof ShellUserConfig, value as any);
    }
  }
}

export interface ConfigProvider<T> {
  getConfig<K extends keyof T>(key: K): Promise<T[K]>;
  setConfig<K extends keyof T>(key: K, value: T[K]): Promise<'success' | 'ignored'>;
  validateConfig<K extends keyof T>(key: K, value: T[K]): Promise<string | null>;
  listConfigOptions(): string[] | Promise<string[]>;
}
