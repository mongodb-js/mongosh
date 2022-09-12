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
  GlobalConfigFileLoadEvent,
  CryptLibrarySkipEvent,
  CryptLibraryFoundEvent,
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
import { MongoshAnalytics } from './analytics-helpers';

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
  analytics: MongoshAnalytics,
  userTraits: any,
  mongosh_version: string): void {
  const { logId } = log;
  let userId: string;
  let telemetryAnonymousId: string;

  const getTelemetryUserIdentity = () => {
    if (telemetryAnonymousId) {
      return {
        anonymousId: telemetryAnonymousId
      };
    }

    return { userId };
  };

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
    const params = {
      session_id: logId,
      userId,
      telemetryAnonymousId,
      connectionUri,
      ...argsWithoutUri
    };
    log.info('MONGOSH', mongoLogId(1_000_000_004), 'connect', 'Connecting to server', params);

    analytics.track({
      ...getTelemetryUserIdentity(),
      event: 'New Connection',
      properties: {
        mongosh_version,
        session_id: logId,
        ...argsWithoutUri
      }
    });
  });

  bus.on('mongosh:new-user', function(newTelemetryUserIdentity: { userId: string; anonymousId: string }) {
    if (!newTelemetryUserIdentity.anonymousId) {
      userId = newTelemetryUserIdentity.userId;
    }
    telemetryAnonymousId = newTelemetryUserIdentity.anonymousId;
    analytics.identify({
      anonymousId: newTelemetryUserIdentity.anonymousId,
      traits: userTraits
    });
  });

  bus.on('mongosh:update-user', function(updatedTelemetryUserIdentity: { userId: string; anonymousId?: string }) {
    if (updatedTelemetryUserIdentity.anonymousId) {
      telemetryAnonymousId = updatedTelemetryUserIdentity.anonymousId;
      analytics.identify({
        anonymousId: updatedTelemetryUserIdentity.anonymousId,
        traits: userTraits
      });
    } else {
      userId = updatedTelemetryUserIdentity.userId;
      analytics.identify({
        userId: updatedTelemetryUserIdentity.userId,
        traits: userTraits
      });
    }
    log.info('MONGOSH', mongoLogId(1_000_000_005), 'config', 'User updated');
  });

  bus.on('mongosh:error', function(error: any, context: string) {
    if (context === 'fatal') {
      log.fatal('MONGOSH', mongoLogId(1_000_000_006), context, `${error.name}: ${error.message}`, error);
    } else {
      log.error('MONGOSH', mongoLogId(1_000_000_006), context, `${error.name}: ${error.message}`, error);
    }

    if (error.name.includes('Mongosh')) {
      analytics.track({
        ...getTelemetryUserIdentity(),
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

  bus.on('mongosh:globalconfig-load', function(args: GlobalConfigFileLoadEvent) {
    log.info('MONGOSH', mongoLogId(1_000_000_048), 'config', 'Loading global configuration file', args);
  });

  bus.on('mongosh:evaluate-input', function(args: EvaluateInputEvent) {
    log.info('MONGOSH', mongoLogId(1_000_000_007), 'repl', 'Evaluating input', args);
  });

  bus.on('mongosh:use', function(args: UseEvent) {
    log.info('MONGOSH', mongoLogId(1_000_000_008), 'shell-api', 'Used "use" command', args);

    analytics.track({
      ...getTelemetryUserIdentity(),
      event: 'Use',
      properties: {
        mongosh_version
      }
    });
  });

  bus.on('mongosh:show', function(args: ShowEvent) {
    log.info('MONGOSH', mongoLogId(1_000_000_009), 'shell-api', 'Used "show" command', args);

    analytics.track({
      ...getTelemetryUserIdentity(),
      event: 'Show',
      properties: {
        mongosh_version,
        method: args.method
      }
    });
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

    analytics.track({
      ...getTelemetryUserIdentity(),
      event: hasStartedMongoshRepl ? 'Script Loaded' : 'Script Loaded CLI',
      properties: {
        mongosh_version,
        nested: args.nested,
        ...(hasStartedMongoshRepl ? {} : { shell: usesShellOption })
      }
    });
  });

  bus.on('mongosh:eval-cli-script', function() {
    log.info('MONGOSH', mongoLogId(1_000_000_013), 'repl', 'Evaluating script passed on the command line');

    analytics.track({
      ...getTelemetryUserIdentity(),
      event: 'Script Evaluated',
      properties: {
        mongosh_version,
        shell: usesShellOption
      }
    });
  });

  bus.on('mongosh:mongoshrc-load', function() {
    log.info('MONGOSH', mongoLogId(1_000_000_014), 'repl', 'Loading .mongoshrc.js');

    analytics.track({
      ...getTelemetryUserIdentity(),
      event: 'Mongoshrc Loaded',
      properties: {
        mongosh_version
      }
    });
  });

  bus.on('mongosh:mongoshrc-mongorc-warn', function() {
    log.info('MONGOSH', mongoLogId(1_000_000_015), 'repl', 'Warning about .mongorc.js/.mongoshrc.js mismatch');

    analytics.track({
      ...getTelemetryUserIdentity(),
      event: 'Mongorc Warning',
      properties: {
        mongosh_version
      }
    });
  });

  bus.on('mongosh:crypt-library-load-skip', function(ev: CryptLibrarySkipEvent) {
    log.info('AUTO-ENCRYPTION', mongoLogId(1_000_000_050), 'crypt-library', 'Skipping shared library candidate', ev);
  });

  bus.on('mongosh:crypt-library-load-found', function(ev: CryptLibraryFoundEvent) {
    log.warn('AUTO-ENCRYPTION', mongoLogId(1_000_000_051), 'crypt-library', 'Accepted shared library candidate', {
      cryptSharedLibPath: ev.cryptSharedLibPath,
      expectedVersion: ev.expectedVersion.versionStr
    });
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

    if (ev.args[0] === 'install') {
      analytics.track({
        ...getTelemetryUserIdentity(),
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

      analytics.track({
        ...getTelemetryUserIdentity(),
        event: 'Deprecated Method',
        properties: {
          mongosh_version,
          ...entry
        }
      });
    }
    for (const [entry, count] of apiCalls) {
      analytics.track({
        ...getTelemetryUserIdentity(),
        event: 'API Call',
        properties: {
          mongosh_version,
          ...entry,
          count
        }
      });
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
    log.error('MONGOSH-EDITOR', mongoLogId(1_000_000_047), 'editor', 'Open external editor', redactInfo(ev));
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
  // NB: mongoLogId(1_000_000_034) through mongoLogId(1_000_000_042) are used in devtools-connect
  // NB: mongoLogId(1_000_000_049) is used in devtools-connect
}
