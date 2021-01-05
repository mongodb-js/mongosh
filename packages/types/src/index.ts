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

export interface AsyncRewriterEvent {
  original: string;
  rewritten: string;
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

interface MongoshBusEventsMap {
  'mongosh:connect': (ev: ConnectEvent) => void;
  'mongosh:driver-initialized': (driverMetadata: any) => void;
  'mongosh:new-user': (id: string, enableTelemetry: boolean) => void;
  'mongosh:update-user': (id: string, enableTelemetry: boolean) => void;
  'mongosh:error': (error: Error) => void;
  'mongosh:help': () => void;
  'mongosh:rewritten-async-input': (ev: AsyncRewriterEvent) => void;
  'mongosh:use': (ev: UseEvent) => void;
  'mongosh:getDB': (ev: UseEvent) => void;
  'mongosh:show': (ev: ShowEvent) => void;
  'mongosh:setCtx': (ev: ApiEvent) => void;
  'mongosh:api-call': (ev: ApiEvent) => void;
  'mongosh:warn': (ev: ApiWarning) => void;
  'mongosh:closed': () => void; // For testing.
  'mongosh:eval-complete': () => void; // For testing.
}

export interface MongoshBus {
  // TypeScript uses something like this itself for its EventTarget definitions.
  on<K extends keyof MongoshBusEventsMap>(event: K, listener: MongoshBusEventsMap[K]): this;
  emit<K extends keyof MongoshBusEventsMap>(event: K, ...args: MongoshBusEventsMap[K] extends (...args: infer P) => any ? P : never): unknown;
}

export class UserConfig {
  userId = '';
  enableTelemetry = false;
  disableGreetingMessage = false;
}
