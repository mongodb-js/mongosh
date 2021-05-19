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
  'mongosh:connect': (ev: ConnectEvent) => void;
  'mongosh:driver-initialized': (driverMetadata: any) => void;
  'mongosh:new-user': (id: string, enableTelemetry: boolean) => void;
  'mongosh:update-user': (id: string, enableTelemetry: boolean) => void;
  'mongosh:error': (error: Error) => void;
  'mongosh:help': () => void;
  'mongosh:evaluate-input': (ev: EvaluateInputEvent) => void; // fired before user code is evaluated in ShellEvaluator
  'mongosh:evaluate-finished': () => void; // fired when the code evaluation is completed (regardless of success / error / interrupt) in AsyncRepl
  'mongosh:use': (ev: UseEvent) => void;
  'mongosh:getDB': (ev: UseEvent) => void;
  'mongosh:show': (ev: ShowEvent) => void;
  'mongosh:setCtx': (ev: ApiEvent) => void;
  'mongosh:api-call': (ev: ApiEvent) => void;
  'mongosh:deprecated-api-call': (ev: ApiEvent) => void;
  'mongosh:warn': (ev: ApiWarning) => void;
  'mongosh:api-load-file': (ev: ScriptLoadFileEvent) => void;
  'mongosh:start-loading-cli-scripts': (event: StartLoadingCliScriptsEvent) => void;
  'mongosh:start-mongosh-repl': (ev: StartMongoshReplEvent) => void;
  'mongosh:mongoshrc-load': () => void;
  'mongosh:mongoshrc-mongorc-warn': () => void;
  'mongosh:eval-cli-script': () => void;
  'mongosh:eval-interrupted': () => void;
  'mongosh:mongocryptd-tryspawn': (ev: MongocryptdTrySpawnEvent) => void;
  'mongosh:mongocryptd-error': (ev: MongocryptdErrorEvent) => void;
  'mongosh:mongocryptd-log': (ev: MongocryptdLogEvent) => void;
  'mongosh:closed': () => void; // For testing.
  'mongosh:eval-complete': () => void; // For testing - fired when the code evaluation in MongoshRepl finishes
  'mongosh:autocompletion-complete': () => void; // For testing.
  'mongosh:interrupt-complete': () => void; // For testing - fired when the interrupt code in MongoshRepl finishes
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
  inspectDepth = 6;
  historyLength = 1000;
  showStackTraces = false;
}

export class CliUserConfigValidator extends ShellUserConfigValidator {
  static async validate<K extends keyof CliUserConfig>(key: K, value: CliUserConfig[K]): Promise<string | null> {
    switch (key) {
      case 'userId':
      case 'disableGreetingMessage':
        return null; // Not modifiable by the user anyway.
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
