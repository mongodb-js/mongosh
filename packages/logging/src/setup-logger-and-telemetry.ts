/* eslint-disable camelcase */
import redactInfo from 'mongodb-redact';
import { redactURICredentials } from '@mongosh/history';
import type {
  MongoshBus,
  ApiEventWithArguments,
  ApiEvent,
  UseEvent,
  EvaluateInputEvent,
  ShowEvent,
  ConnectEvent,
  ScriptLoadFileEvent,
  StartLoadingCliScriptsEvent,
  StartMongoshReplEvent,
  MongocryptdTrySpawnEvent,
  MongocryptdLogEvent,
  MongocryptdErrorEvent,
  SnippetsCommandEvent,
  SnippetsErrorEvent,
  SnippetsFetchIndexErrorEvent,
  SnippetsFetchIndexEvent,
  SnippetsLoadedEvent,
  SnippetsLoadSnippetEvent,
  SnippetsNpmDownloadActiveEvent,
  SnippetsNpmDownloadFailedEvent,
  SnippetsNpmLookupEvent,
  SnippetsRunNpmEvent,
  SnippetsTransformErrorEvent,
  EditorRunEditCommandEvent,
  EditorReadVscodeExtensionsDoneEvent,
  EditorReadVscodeExtensionsFailedEvent
} from '@mongosh/types';
import { inspect } from 'util';
import { MongoLogWriter, mongoLogId } from 'mongodb-log-writer';
import { hookLogger as devtoolsConnectHookLogger } from '@mongodb-js/devtools-connect';

/**
 * General interface for an Analytics provider that mongosh can use.
 */
export interface MongoshAnalytics {
  identify(message: {
    userId: string,
    traits: { platform: string }
  }): void;

  track(message: {
    userId: string,
    event: string,
    properties: {
      mongosh_version: string,
      [key: string]: any;
    }
  }): void;
}

/**
 * A no-op implementation of MongoshAnalytics that can be used when
 * actually connecting to the telemetry provider is not possible
 * (e.g. because we are running without an API key).
 */
class NoopAnalytics implements MongoshAnalytics {
  identify(_info: any): void {} // eslint-disable-line @typescript-eslint/no-unused-vars
  track(_info: any): void {} // eslint-disable-line @typescript-eslint/no-unused-vars
}

/**
 * A helper class for keeping track of how often specific events occurred.
 */
class MultiSet<T> {
  _entries: Map<string, number> = new Map();

  add(entry: T): void {
    const key = JSON.stringify(Object.entries(entry).sort());
    this._entries.set(key, (this._entries.get(key) ?? 0) + 1);
  }

  clear(): void {
    this._entries.clear();
  }

  *[Symbol.iterator](): Iterator<[T, number]> {
    for (const [key, count] of this._entries) {
      yield [Object.fromEntries(JSON.parse(key)) as T, count];
    }
  }
}

/**
 * Connect a MongoshBus instance that emits events to logging and analytics providers.
 *
 * @param bus A MongoshBus instance
 * @param log A MongoLogWriter instance
 * @param makeAnalytics A function that returns an analytics provider (or throws otherwise)
 */
export function setupLoggerAndTelemetry(
  bus: MongoshBus,
  log: MongoLogWriter,
  makeAnalytics: () => MongoshAnalytics,
  userTraits: any,
  mongosh_version: string): void {
  const { logId } = log;
  let userId: string;
  let telemetry: boolean;

  let analytics: MongoshAnalytics = new NoopAnalytics();
  try {
    analytics = makeAnalytics();
  } catch (e) {
    log.error('MONGOSH', mongoLogId(1_000_000_001), 'analytics', 'Failed to instantiate analytics provider', e);
  }

  // We emit different analytics events for loading files and evaluating scripts
  // depending on whether we're already in the REPL or not yet. We store the
  // state here so that the places where the events are emitted don't have to
  // be aware of this distinction.
  let hasStartedMongoshRepl = false;
  bus.on('mongosh:start-mongosh-repl', (ev: StartMongoshReplEvent) => {
    log.info('MONGOSH', mongoLogId(1_000_000_002), 'repl', 'Started REPL', ev);
    hasStartedMongoshRepl = true;
  });

  let usesShellOption = false;
  bus.on('mongosh:start-loading-cli-scripts', (event: StartLoadingCliScriptsEvent) => {
    log.info('MONGOSH', mongoLogId(1_000_000_003), 'repl', 'Start loading CLI scripts');
    usesShellOption = event.usesShellOption;
  });

  bus.on('mongosh:connect', function(args: ConnectEvent) {
    const connectionUri = redactURICredentials(args.uri);
    const { uri: _uri, ...argsWithoutUri } = args; // eslint-disable-line @typescript-eslint/no-unused-vars
    const params = { session_id: logId, userId, connectionUri, ...argsWithoutUri };
    log.info('MONGOSH', mongoLogId(1_000_000_004), 'connect', 'Connecting to server', params);

    if (telemetry) {
      analytics.track({
        userId,
        event: 'New Connection',
        properties: {
          mongosh_version,
          session_id: logId,
          ...argsWithoutUri
        }
      });
    }
  });

  bus.on('mongosh:new-user', function(id: string, enableTelemetry: boolean) {
    userId = id;
    telemetry = enableTelemetry;
    if (telemetry) analytics.identify({ userId, traits: userTraits });
  });

  bus.on('mongosh:update-user', function(id: string, enableTelemetry: boolean) {
    userId = id;
    telemetry = enableTelemetry;
    if (telemetry) analytics.identify({ userId, traits: userTraits });
    log.info('MONGOSH', mongoLogId(1_000_000_005), 'config', 'User updated', { enableTelemetry });
  });

  bus.on('mongosh:error', function(error: any, context: string) {
    if (context === 'fatal') {
      log.fatal('MONGOSH', mongoLogId(1_000_000_006), context, `${error.name}: ${error.message}`, error);
    } else {
      log.error('MONGOSH', mongoLogId(1_000_000_006), context, `${error.name}: ${error.message}`, error);
    }

    if (telemetry && error.name.includes('Mongosh')) {
      analytics.track({
        userId,
        event: 'Error',
        properties: {
          mongosh_version,
          name: error.name,
          code: error.code,
          scope: error.scope,
          metadata: error.metadata
        }
      });
    }
  });

  bus.on('mongosh:evaluate-input', function(args: EvaluateInputEvent) {
    log.info('MONGOSH', mongoLogId(1_000_000_007), 'repl', 'Evaluating input', args);
  });

  bus.on('mongosh:use', function(args: UseEvent) {
    log.info('MONGOSH', mongoLogId(1_000_000_008), 'shell-api', 'Used "use" command', args);

    if (telemetry) {
      analytics.track({
        userId,
        event: 'Use',
        properties: {
          mongosh_version
        }
      });
    }
  });

  bus.on('mongosh:show', function(args: ShowEvent) {
    log.info('MONGOSH', mongoLogId(1_000_000_009), 'shell-api', 'Used "show" command', args);

    if (telemetry) {
      analytics.track({
        userId,
        event: 'Show',
        properties: {
          mongosh_version,
          method: args.method
        }
      });
    }
  });

  bus.on('mongosh:setCtx', function(args: ApiEventWithArguments) {
    log.info('MONGOSH', mongoLogId(1_000_000_010), 'shell-api', 'Initialized context', args);
  });

  bus.on('mongosh:api-call-with-arguments', function(args: ApiEventWithArguments) {
    // TODO: redactInfo cannot handle circular or otherwise nontrivial input
    let arg;
    try {
      arg = JSON.parse(JSON.stringify(args));
    } catch {
      arg = { _inspected: inspect(args) };
    }
    log.info('MONGOSH', mongoLogId(1_000_000_011), 'shell-api', 'Performed API call', redactInfo(arg));
  });

  bus.on('mongosh:api-load-file', function(args: ScriptLoadFileEvent) {
    log.info('MONGOSH', mongoLogId(1_000_000_012), 'shell-api', 'Loading file via load()', args);

    if (telemetry) {
      analytics.track({
        userId,
        event: hasStartedMongoshRepl ? 'Script Loaded' : 'Script Loaded CLI',
        properties: {
          mongosh_version,
          nested: args.nested,
          ...(hasStartedMongoshRepl ? {} : { shell: usesShellOption })
        }
      });
    }
  });

  bus.on('mongosh:eval-cli-script', function() {
    log.info('MONGOSH', mongoLogId(1_000_000_013), 'repl', 'Evaluating script passed on the command line');

    if (telemetry) {
      analytics.track({
        userId,
        event: 'Script Evaluated',
        properties: {
          mongosh_version,
          shell: usesShellOption
        }
      });
    }
  });

  bus.on('mongosh:mongoshrc-load', function() {
    log.info('MONGOSH', mongoLogId(1_000_000_014), 'repl', 'Loading .mongoshrc.js');

    if (telemetry) {
      analytics.track({
        userId,
        event: 'Mongoshrc Loaded',
        properties: {
          mongosh_version
        }
      });
    }
  });

  bus.on('mongosh:mongoshrc-mongorc-warn', function() {
    log.info('MONGOSH', mongoLogId(1_000_000_015), 'repl', 'Warning about .mongorc.js/.mongoshrc.js mismatch');

    if (telemetry) {
      analytics.track({
        userId,
        event: 'Mongorc Warning',
        properties: {
          mongosh_version
        }
      });
    }
  });

  bus.on('mongosh:mongocryptd-tryspawn', function(ev: MongocryptdTrySpawnEvent) {
    log.info('MONGOCRYPTD', mongoLogId(1_000_000_016), 'mongocryptd', 'Trying to spawn mongocryptd', ev);
  });

  bus.on('mongosh:mongocryptd-error', function(ev: MongocryptdErrorEvent) {
    log.warn('MONGOCRYPTD', mongoLogId(1_000_000_017), 'mongocryptd', 'Error running mongocryptd', {
      ...ev,
      error: ev.error?.message
    });
  });

  bus.on('mongosh:mongocryptd-log', function(ev: MongocryptdLogEvent) {
    log.info('MONGOCRYPTD', mongoLogId(1_000_000_018), 'mongocryptd', 'mongocryptd log message', ev);
  });

  bus.on('mongosh-snippets:loaded', function(ev: SnippetsLoadedEvent) {
    log.info('MONGOSH-SNIPPETS', mongoLogId(1_000_000_019), 'snippets', 'Loaded snippets', ev);
  });

  bus.on('mongosh-snippets:npm-lookup', function(ev: SnippetsNpmLookupEvent) {
    log.info('MONGOSH-SNIPPETS', mongoLogId(1_000_000_020), 'snippets', 'Performing npm lookup', ev);
  });

  bus.on('mongosh-snippets:npm-lookup-stopped', function() {
    log.info('MONGOSH-SNIPPETS', mongoLogId(1_000_000_021), 'snippets', 'npm lookup stopped');
  });

  bus.on('mongosh-snippets:npm-download-failed', function(ev: SnippetsNpmDownloadFailedEvent) {
    log.info('MONGOSH-SNIPPETS', mongoLogId(1_000_000_022), 'snippets', 'npm download failed', ev);
  });

  bus.on('mongosh-snippets:npm-download-active', function(ev: SnippetsNpmDownloadActiveEvent) {
    log.info('MONGOSH-SNIPPETS', mongoLogId(1_000_000_023), 'snippets', 'npm download active', ev);
  });

  bus.on('mongosh-snippets:fetch-index', function(ev: SnippetsFetchIndexEvent) {
    log.info('MONGOSH-SNIPPETS', mongoLogId(1_000_000_024), 'snippets', 'Fetching snippet index', ev);
  });

  bus.on('mongosh-snippets:fetch-cache-invalid', function() {
    log.info('MONGOSH-SNIPPETS', mongoLogId(1_000_000_025), 'snippets', 'Snippet cache invalid');
  });

  bus.on('mongosh-snippets:fetch-index-error', function(ev: SnippetsFetchIndexErrorEvent) {
    log.info('MONGOSH-SNIPPETS', mongoLogId(1_000_000_026), 'snippets', 'Fetching snippet index failed', ev);
  });

  bus.on('mongosh-snippets:fetch-index-done', function() {
    log.info('MONGOSH-SNIPPETS', mongoLogId(1_000_000_027), 'snippets', 'Fetching snippet index done');
  });

  bus.on('mongosh-snippets:package-json-edit-error', function(ev: SnippetsErrorEvent) {
    log.info('MONGOSH-SNIPPETS', mongoLogId(1_000_000_028), 'snippets', 'Modifying snippets package.json failed', ev);
  });

  bus.on('mongosh-snippets:spawn-child', function(ev: SnippetsRunNpmEvent) {
    log.info('MONGOSH-SNIPPETS', mongoLogId(1_000_000_029), 'snippets', 'Spawning helper', ev);
  });

  bus.on('mongosh-snippets:load-snippet', function(ev: SnippetsLoadSnippetEvent) {
    log.info('MONGOSH-SNIPPETS', mongoLogId(1_000_000_030), 'snippets', 'Loading snippet', ev);
  });

  bus.on('mongosh-snippets:snippet-command', function(ev: SnippetsCommandEvent) {
    log.info('MONGOSH-SNIPPETS', mongoLogId(1_000_000_031), 'snippets', 'Running snippet command', ev);

    if (telemetry && ev.args[0] === 'install') {
      analytics.track({
        userId,
        event: 'Snippet Install',
        properties: {
          mongosh_version
        }
      });
    }
  });

  bus.on('mongosh-snippets:transform-error', function(ev: SnippetsTransformErrorEvent) {
    log.info('MONGOSH-SNIPPETS', mongoLogId(1_000_000_032), 'snippets', 'Rewrote error message', ev);
  });

  const deprecatedApiCalls = new MultiSet<Pick<ApiEvent, 'class' | 'method'>>();
  const apiCalls = new MultiSet<Pick<ApiEvent, 'class' | 'method'>>();
  bus.on('mongosh:api-call', function(ev: ApiEvent) {
    if (ev.deprecated) {
      deprecatedApiCalls.add({ class: ev.class, method: ev.method });
    }
    if (ev.callDepth === 0 && ev.isAsync) {
      apiCalls.add({ class: ev.class, method: ev.method });
    }
  });
  bus.on('mongosh:evaluate-started', function() {
    // Clear API calls before evaluation starts. This is important because
    // some API calls are also emitted by mongosh CLI repl internals,
    // but we only care about those emitted from user code (i.e. during
    // evaluation).
    deprecatedApiCalls.clear();
    apiCalls.clear();
  });
  bus.on('mongosh:evaluate-finished', function() {
    for (const [entry] of deprecatedApiCalls) {
      log.warn('MONGOSH', mongoLogId(1_000_000_033), 'shell-api', 'Deprecated API call', entry);

      if (telemetry) {
        analytics.track({
          userId,
          event: 'Deprecated Method',
          properties: {
            mongosh_version,
            ...entry
          }
        });
      }
    }
    for (const [entry, count] of apiCalls) {
      if (telemetry) {
        analytics.track({
          userId,
          event: 'API Call',
          properties: {
            mongosh_version,
            ...entry,
            count
          }
        });
      }
    }
    deprecatedApiCalls.clear();
    apiCalls.clear();
  });

  // Log ids 1_000_000_034 through 1_000_000_042 are reserved for the
  // devtools-connect package which was split out from mongosh.
  devtoolsConnectHookLogger(bus, log, 'mongosh', redactURICredentials);

  bus.on('mongosh-sp:reset-connection-options', function() {
    log.info('MONGOSH-SP', mongoLogId(1_000_000_040), 'connect', 'Reconnect because of changed connection options');
  });

  bus.on('mongosh-editor:run-edit-command', function(ev: EditorRunEditCommandEvent) {
    log.error('MONGOSH-EDITOR', mongoLogId(1_000_000_045), 'editor', 'Open external editor', redactInfo(ev));
  });

  bus.on('mongosh-editor:read-vscode-extensions-done', function(ev: EditorReadVscodeExtensionsDoneEvent) {
    log.error('MONGOSH-EDITOR', mongoLogId(1_000_000_043), 'editor', 'Reading vscode extensions from file system succeeded', ev);
  });

  bus.on('mongosh-editor:read-vscode-extensions-failed', function(ev: EditorReadVscodeExtensionsFailedEvent) {
    log.error('MONGOSH-EDITOR', mongoLogId(1_000_000_044), 'editor', 'Reading vscode extensions from file system failed', {
      ...ev,
      error: ev.error.message
    });
  });

  // NB: mongoLogId(1_000_000_045) is used in cli-repl itself
}
