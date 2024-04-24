import type { ConnectEventMap } from '@mongodb-js/devtools-connect';

export interface ApiEventArguments {
  pipeline?: any[];
  query?: object;
  options?: object;
  filter?: object;
}

export interface ApiEventWithArguments {
  method: string;
  class?: string;
  db?: string;
  coll?: string;
  uri?: string;
  arguments?: ApiEventArguments;
}

export interface ApiEvent {
  method: string;
  class: string;
  deprecated: boolean;
  isAsync: boolean;
  callDepth: number;
}

export interface ApiWarning {
  method: string;
  class: string;
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
  is_atlas?: boolean;
  is_localhost?: boolean;
  is_do?: boolean;
  server_version?: string;
  server_os?: string;
  server_arch?: string;
  is_enterprise?: boolean;
  auth_type?: string;
  is_data_federation?: boolean;
  dl_version?: string;
  is_genuine?: boolean;
  non_genuine_server_name?: string;
  api_version?: string;
  api_strict?: boolean;
  api_deprecation_errors?: boolean;
  node_version?: string;
  uri?: string;
}

export interface ScriptLoadFileEvent {
  nested: boolean;
  filename: string;
}

export interface StartLoadingCliScriptsEvent {
  usesShellOption: boolean;
}

export interface GlobalConfigFileLoadEvent {
  filename: string;
  found: boolean;
}

export interface CryptLibrarySkipEvent {
  cryptSharedLibPath: string;
  reason: string;
  details?: any;
}

export interface CryptLibraryFoundEvent {
  cryptSharedLibPath: string;
  expectedVersion: { versionStr: string };
}

export interface MongocryptdLogEvent {
  pid: number;
  logEntry: any;
}

export interface StartMongoshReplEvent {
  version: string;
}

export interface SnippetsLoadedEvent {
  installdir: string;
}

export interface SnippetsNpmLookupEvent {
  existingVersion: string;
}

export interface SnippetsNpmDownloadActiveEvent {
  npmMetadataURL: string;
  npmTarballURL: string;
}

export interface SnippetsNpmDownloadFailedEvent {
  npmMetadataURL: string;
  npmTarballURL?: string;
  status?: number;
}

export interface SnippetsFetchIndexEvent {
  refreshMode: string;
}

export interface SnippetsFetchIndexErrorEvent {
  action: string;
  url?: string;
  status?: number;
  error?: string;
}

export interface SnippetsErrorEvent {
  error: string;
}

export interface SnippetsRunNpmEvent {
  args: string[];
}

export interface SnippetsLoadSnippetEvent {
  source: string;
  name: string;
}

export interface SnippetsCommandEvent {
  args: string[];
}

export interface SnippetsTransformErrorEvent {
  error: string;
  addition: string;
  name: string;
}

export interface EditorRunEditCommandEvent {
  tmpDoc: string;
  editor: string;
  code: string;
}

export interface EditorReadVscodeExtensionsDoneEvent {
  vscodeDir: string;
  hasMongodbExtension: boolean;
}

export interface EditorReadVscodeExtensionsFailedEvent {
  vscodeDir: string;
  error: Error;
}

export interface FetchingUpdateMetadataEvent {
  updateURL: string;
  localFilePath: string;
}

export interface FetchingUpdateMetadataCompleteEvent {
  latest: string | null;
}

export interface SessionStartedEvent {
  isInteractive: boolean;
  jsContext: string;
  timings: {
    [category: string]: number;
  };
}

export interface MongoshBusEventsMap extends ConnectEventMap {
  /**
   * Signals a connection to a MongoDB instance has been established
   * or the used database changed.
   */
  'mongosh:connect': (ev: ConnectEvent) => void;
  /**
   * Signals when a session is started, that will enable the REPL on interactive
   * sessions or close on non-interactive sessions.
   */
  'mongosh:start-session': (ev: SessionStartedEvent) => void;
  /**
   * Signals that the shell is started by a new user.
   */
  'mongosh:new-user': (identity: {
    userId: string;
    anonymousId: string;
  }) => void;
  /**
   * Signals a change of the user telemetry settings.
   */
  'mongosh:update-user': (identity: {
    userId: string;
    anonymousId?: string;
  }) => void;
  /**
   * Signals an error that should be logged or potentially tracked by analytics.
   */
  'mongosh:error': (error: Error, component: string) => void;
  /**
   * Signals the start of the evaluation of user code inside Shellevaluator.
   */
  'mongosh:evaluate-input': (ev: EvaluateInputEvent) => void;
  /**
   * Signals the initiation of the evaluation of user code in AsyncRepl (final step of the evaluation).
   */
  'mongosh:evaluate-started': () => void;
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
  'mongosh:setCtx': (ev: ApiEventWithArguments) => void;
  /**
   * Signals usage of a shell API method. This includes arguments and is not suitable for telemetry.
   */
  'mongosh:api-call-with-arguments': (ev: ApiEventWithArguments) => void;
  /**
   * Signals usage of a shell API method as an API entry point, suitable for telemetry.
   */
  'mongosh:api-call': (ev: ApiEvent) => void;
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
  'mongosh:start-loading-cli-scripts': (
    event: StartLoadingCliScriptsEvent
  ) => void;
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
   * Signals the start of loading a global mongosh configuration file.
   */
  'mongosh:globalconfig-load': (ev: GlobalConfigFileLoadEvent) => void;
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
   * Signals that a potential crypt library search path was skipped.
   */
  'mongosh:crypt-library-load-skip': (ev: CryptLibrarySkipEvent) => void;
  /**
   * Signals that a potential crypt library search path was accepted.
   */
  'mongosh:crypt-library-load-found': (ev: CryptLibraryFoundEvent) => void;
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

  /** Signals that the snippets plugin has been loaded. */
  'mongosh-snippets:loaded': (ev: SnippetsLoadedEvent) => void;
  /** Signals that an event has happened while looking up the path to npm. */
  'mongosh-snippets:npm-lookup': (ev: SnippetsNpmLookupEvent) => void;
  /** Signals that attempting to download npm has been declined by the user. */
  'mongosh-snippets:npm-lookup-stopped': () => void;
  /** Signals that attempting to download npm has failed. */
  'mongosh-snippets:npm-download-failed': (
    ev: SnippetsNpmDownloadFailedEvent
  ) => void;
  /** Signals that downloading the npm tarball has started. */
  'mongosh-snippets:npm-download-active': (
    ev: SnippetsNpmDownloadActiveEvent
  ) => void;
  /** Signals that fetching the index file from the network has started. */
  'mongosh-snippets:fetch-index': (ev: SnippetsFetchIndexEvent) => void;
  /** Signals that, when fetching the index file, it turned out that the cache is currently invalid (not outdated). */
  'mongosh-snippets:fetch-cache-invalid': () => void;
  /** Signals that fetching the index file from the network has failed. */
  'mongosh-snippets:fetch-index-error': (
    ev: SnippetsFetchIndexErrorEvent
  ) => void;
  /** Signals that fetching the index file from the network has completed. */
  'mongosh-snippets:fetch-index-done': () => void;
  /** Signals that an action on the internal package.json file has failed. */
  'mongosh-snippets:package-json-edit-error': (ev: SnippetsErrorEvent) => void;
  /** Signals that an npm child process has been spawned. */
  'mongosh-snippets:spawn-child': (ev: SnippetsRunNpmEvent) => void;
  /** Signals that a snippet has been loaded into the shell. */
  'mongosh-snippets:load-snippet': (ev: SnippetsLoadSnippetEvent) => void;
  /** Signals that a snippet shell command has started executing. */
  'mongosh-snippets:snippet-command': (ev: SnippetsCommandEvent) => void;
  /** Signals that a snippet has modified an error message. */
  'mongosh-snippets:transform-error': (ev: SnippetsTransformErrorEvent) => void;

  /** Signals that the service provider is opening a new connection because options have changed. */
  'mongosh-sp:reset-connection-options': () => void;

  /** Signals that open external editor command was called. */
  'mongosh-editor:run-edit-command': (ev: EditorRunEditCommandEvent) => void;
  /** Signals that reading vscode extensions from disc succeeded. */
  'mongosh-editor:read-vscode-extensions-done': (
    ev: EditorReadVscodeExtensionsDoneEvent
  ) => void;
  /** Signals that reading vscode extensions from disc failed. */
  'mongosh-editor:read-vscode-extensions-failed': (
    ev: EditorReadVscodeExtensionsFailedEvent
  ) => void;

  /** Signals that fetching update metadata has started. */
  'mongosh:fetching-update-metadata': (ev: FetchingUpdateMetadataEvent) => void;
  /** Signals that fetching update metadata has completed. */
  'mongosh:fetching-update-metadata-complete': (
    ev: FetchingUpdateMetadataCompleteEvent
  ) => void;
}

export interface MongoshBus {
  // TypeScript uses something like this itself for its EventTarget definitions.
  on<K extends keyof MongoshBusEventsMap>(
    event: K,
    listener: MongoshBusEventsMap[K]
  ): this;
  once<K extends keyof MongoshBusEventsMap>(
    event: K,
    listener: MongoshBusEventsMap[K]
  ): this;
  emit<K extends keyof MongoshBusEventsMap>(
    event: K,
    ...args: MongoshBusEventsMap[K] extends (...args: infer P) => any
      ? P
      : never
  ): unknown;
}

export class ShellUserConfig {
  displayBatchSize = 20;
  maxTimeMS: number | null = null;
  enableTelemetry = false;
  editor: string | null = null;
}

export class ShellUserConfigValidator {
  // eslint-disable-next-line @typescript-eslint/require-await
  static async validate<K extends keyof ShellUserConfig>(
    key: K,
    value: ShellUserConfig[K]
  ): Promise<string | null> {
    switch (key) {
      case 'displayBatchSize':
        if (typeof value !== 'number' || value <= 0) {
          return `${key} must be a positive integer`;
        }
        return null;
      case 'maxTimeMS':
        if (value !== null && (typeof value !== 'number' || value <= 0)) {
          return `${key} must be null or a positive integer`;
        }
        return null;
      case 'enableTelemetry':
        if (typeof value !== 'boolean') {
          return `${key} must be a boolean`;
        }
        return null;
      case 'editor':
        if (typeof value !== 'string' && value !== null) {
          return `${key} must be a string or null`;
        }
        return null;
      default:
        return `${key} is not a known config option`;
    }
  }
}

export class SnippetShellUserConfig extends ShellUserConfig {
  snippetIndexSourceURLs =
    'https://compass.mongodb.com/mongosh/snippets-index.bson.br';
  snippetRegistryURL = 'https://registry.npmjs.org';
  snippetAutoload = true;
}

export class SnippetShellUserConfigValidator extends ShellUserConfigValidator {
  static async validate<K extends keyof SnippetShellUserConfig>(
    key: K,
    value: SnippetShellUserConfig[K]
  ): Promise<string | null> {
    switch (key) {
      case 'snippetIndexSourceURLs':
        if (
          typeof value !== 'string' ||
          value.split(';').some((url) => url && !isValidUrl(url))
        ) {
          return `${key} must be a ;-separated list of valid URLs`;
        }
        return null;
      case 'snippetRegistryURL':
        if (typeof value !== 'string' || !isValidUrl(value)) {
          return `${key} must be a valid URL`;
        }
        return null;
      case 'snippetAutoload':
        if (typeof value !== 'boolean') {
          return `${key} must be a boolean`;
        }
        return null;
      default:
        return super.validate(key as keyof ShellUserConfig, value as any);
    }
  }
}

export class CliUserConfig extends SnippetShellUserConfig {
  userId = '';
  telemetryAnonymousId = '';
  disableGreetingMessage = false;
  forceDisableTelemetry = false;
  inspectCompact: number | boolean = 3;
  inspectDepth = 6;
  historyLength = 1000;
  showStackTraces = false;
  redactHistory: 'keep' | 'remove' | 'remove-redact' = 'remove';
  oidcRedirectURI: undefined | string = undefined;
  oidcTrustedEndpoints: undefined | string[] = undefined;
  browser: undefined | false | string = undefined;
  updateURL = 'https://downloads.mongodb.com/compass/mongosh.json';
}

export class CliUserConfigValidator extends SnippetShellUserConfigValidator {
  static async validate<K extends keyof CliUserConfig>(
    key: K,
    value: CliUserConfig[K]
  ): Promise<string | null> {
    switch (key) {
      case 'userId':
      case 'telemetryAnonymousId':
      case 'disableGreetingMessage':
        return null; // Not modifiable by the user anyway.
      case 'inspectCompact':
        if (
          typeof value !== 'boolean' &&
          (typeof value !== 'number' || value < 0)
        ) {
          return `${key} must be a boolean or a positive integer`;
        }
        return null;
      case 'inspectDepth':
      case 'historyLength':
        if (typeof value !== 'number' || value < 0) {
          return `${key} must be a positive integer`;
        }
        return null;
      case 'forceDisableTelemetry':
      case 'showStackTraces':
        if (typeof value !== 'boolean') {
          return `${key} must be a boolean`;
        }
        return null;
      case 'redactHistory':
        if (
          value !== 'keep' &&
          value !== 'remove' &&
          value !== 'remove-redact'
        ) {
          return `${key} must be one of 'keep', 'remove', or 'remove-redact'`;
        }
        return null;
      case 'oidcRedirectURI':
        if (
          value !== undefined &&
          (typeof value !== 'string' || !isValidUrl(value))
        ) {
          return `${key} must be undefined or a valid URL`;
        }
        return null;
      case 'oidcTrustedEndpoints':
        if (
          value !== undefined &&
          (!Array.isArray(value) || value.some((v) => typeof v !== 'string'))
        ) {
          return `${key} must be undefined or an array of hostnames`;
        }
        return null;
      case 'browser':
        if (
          value !== undefined &&
          value !== false &&
          typeof value !== 'string'
        ) {
          return `${key} must be undefined, false, or a command string`;
        }
        return null;
      case 'updateURL':
        if (typeof value !== 'string' || (value.trim() && !isValidUrl(value))) {
          return `${key} must be a valid URL or empty`;
        }
        return null;
      default:
        return super.validate(
          key as keyof SnippetShellUserConfig,
          value as any
        );
    }
  }
}

export interface ConfigProvider<T> {
  getConfig<K extends keyof T>(key: K): Promise<T[K] | undefined> | undefined;
  setConfig<K extends keyof T>(
    key: K,
    value: T[K]
  ): Promise<'success' | 'ignored'>;
  resetConfig<K extends keyof T>(key: K): Promise<'success' | 'ignored'>;
  validateConfig<K extends keyof T>(
    key: K,
    value: T[K]
  ): Promise<string | null>;
  listConfigOptions(): string[] | undefined | Promise<string[]>;
}

function isValidUrl(url: string): boolean {
  /* eslint-disable @typescript-eslint/ban-ts-comment */
  // Need ts-ignore because we're not building this exclusively for environments
  // in which URL is available.
  // @ts-ignore
  if (typeof URL === 'function') {
    try {
      // @ts-ignore
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  /* eslint-enable @typescript-eslint/ban-ts-comment */
  return true; // Currently no overlap between URL-less environments and environments with config options.
}

export const TimingCategories = {
  REPLInstantiation: 'REPLInstantiation',
  UserConfigLoading: 'UserConfigLoading',
  DriverSetup: 'DriverSetup',
  Logging: 'Logging',
  SnippetLoading: 'SnippetLoading',
  Snapshot: 'Snapshot',
  ResourceFileLoading: 'ResourceFileLoading',
  AsyncRewrite: 'AsyncRewrite',
  Eval: 'Eval',
  EvalFile: 'EvalFile',
  Telemetry: 'Telemetry',
  Main: 'Main',
} as const;

export type TimingCategory =
  (typeof TimingCategories)[keyof typeof TimingCategories];
export type TimingInterface = {
  markTime: (category: TimingCategory, label: string) => void;
  getTimingData: () => [string, string, number][];
};
