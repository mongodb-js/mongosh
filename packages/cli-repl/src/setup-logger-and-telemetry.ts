/* eslint-disable camelcase */
import redactInfo from 'mongodb-redact';
import { redactURICredentials } from '@mongosh/history';
import type {
  MongoshBus,
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
  SpConnectHeartbeatFailureEvent,
  SpConnectHeartbeatSucceededEvent,
  SpResolveSrvErrorEvent,
  SpResolveSrvSucceededEvent,
  SpMissingOptionalDependencyEvent
} from '@mongosh/types';
import { inspect } from 'util';
import { buildInfo } from './build-info';
import { MongoLogWriter, mongoLogId } from 'mongodb-log-writer';

/**
 * General interface for an Analytics provider that mongosh can use.
 */
interface MongoshAnalytics {
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
 * Connect a MongoshBus instance that emits events to logging and analytics providers.
 *
 * @param logId The id of the current session
 * @param bus A MongoshBus instance
 * @param makeLogger A function that returns a log file writer
 * @param makeAnalytics A function that returns an analytics provider
 */
export default function setupLoggerAndTelemetry(
  logId: string,
  bus: MongoshBus,
  makeLogger: () => MongoLogWriter,
  makeAnalytics: () => MongoshAnalytics): void {
  const log = makeLogger();
  const mongosh_version = require('../package.json').version;
  let userId: string;
  let telemetry: boolean;
  const userTraits = {
    platform: process.platform,
    arch: process.arch
  };

  log.info('MONGOSH', mongoLogId(1_000_000_000), 'log', 'Starting log', {
    execPath: process.execPath,
    ...buildInfo()
  });

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
  bus.addListener('mongosh:start-mongosh-repl', (ev: StartMongoshReplEvent) => {
    log.info('MONGOSH', mongoLogId(1_000_000_002), 'repl', 'Started REPL', ev);
    hasStartedMongoshRepl = true;
  });

  let usesShellOption = false;
  bus.addListener('mongosh:start-loading-cli-scripts', (event: StartLoadingCliScriptsEvent) => {
    log.info('MONGOSH', mongoLogId(1_000_000_003), 'repl', 'Start loading CLI scripts');
    usesShellOption = event.usesShellOption;
  });

  bus.addListener('mongosh:connect', function(args: ConnectEvent) {
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

  bus.addListener('mongosh:driver-initialized', function(driverMetadata: any) {
    log.info('MONGOSH', mongoLogId(1_000_000_004), 'connect', 'Driver initialized', driverMetadata);
  });

  bus.addListener('mongosh:new-user', function(id: string, enableTelemetry: boolean) {
    userId = id;
    telemetry = enableTelemetry;
    if (telemetry) analytics.identify({ userId, traits: userTraits });
  });

  bus.addListener('mongosh:update-user', function(id: string, enableTelemetry: boolean) {
    userId = id;
    telemetry = enableTelemetry;
    if (telemetry) analytics.identify({ userId, traits: userTraits });
    log.info('MONGOSH', mongoLogId(1_000_000_005), 'config', 'User updated', { enableTelemetry });
  });

  bus.addListener('mongosh:error', function(error: any, context: string) {
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

  bus.addListener('mongosh:evaluate-input', function(args: EvaluateInputEvent) {
    log.info('MONGOSH', mongoLogId(1_000_000_007), 'repl', 'Evaluating input', args);
  });

  bus.addListener('mongosh:use', function(args: UseEvent) {
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

  bus.addListener('mongosh:show', function(args: ShowEvent) {
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

  bus.addListener('mongosh:setCtx', function(args: ApiEvent) {
    log.info('MONGOSH', mongoLogId(1_000_000_010), 'shell-api', 'Initialized context', args);
  });

  bus.addListener('mongosh:api-call', function(args: ApiEvent) {
    // TODO: redactInfo cannot handle circular or otherwise nontrivial input
    let arg;
    try {
      arg = JSON.parse(JSON.stringify(args));
    } catch {
      arg = { _inspected: inspect(args) };
    }
    log.info('MONGOSH', mongoLogId(1_000_000_011), 'shell-api', 'Performed API call', redactInfo(arg));
  });

  bus.addListener('mongosh:api-load-file', function(args: ScriptLoadFileEvent) {
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

  bus.addListener('mongosh:eval-cli-script', function() {
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

  bus.addListener('mongosh:mongoshrc-load', function() {
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

  bus.addListener('mongosh:mongoshrc-mongorc-warn', function() {
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

  bus.addListener('mongosh:mongocryptd-tryspawn', function(ev: MongocryptdTrySpawnEvent) {
    log.info('MONGOCRYPTD', mongoLogId(1_000_000_016), 'mongocryptd', 'Trying to spawn mongocryptd', ev);
  });

  bus.addListener('mongosh:mongocryptd-error', function(ev: MongocryptdErrorEvent) {
    log.warn('MONGOCRYPTD', mongoLogId(1_000_000_017), 'mongocryptd', 'Error running mongocryptd', ev);
  });

  bus.addListener('mongosh:mongocryptd-log', function(ev: MongocryptdLogEvent) {
    log.info('MONGOCRYPTD', mongoLogId(1_000_000_018), 'mongocryptd', 'mongocryptd log message', ev);
  });

  bus.addListener('mongosh-snippets:loaded', function(ev: SnippetsLoadedEvent) {
    log.info('MONGOSH-SNIPPETS', mongoLogId(1_000_000_019), 'snippets', 'Loaded snippets', ev);
  });

  bus.addListener('mongosh-snippets:npm-lookup', function(ev: SnippetsNpmLookupEvent) {
    log.info('MONGOSH-SNIPPETS', mongoLogId(1_000_000_020), 'snippets', 'Performing npm lookup', ev);
  });

  bus.addListener('mongosh-snippets:npm-lookup-stopped', function() {
    log.info('MONGOSH-SNIPPETS', mongoLogId(1_000_000_021), 'snippets', 'npm lookup stopped');
  });

  bus.addListener('mongosh-snippets:npm-download-failed', function(ev: SnippetsNpmDownloadFailedEvent) {
    log.info('MONGOSH-SNIPPETS', mongoLogId(1_000_000_022), 'snippets', 'npm download failed', ev);
  });

  bus.addListener('mongosh-snippets:npm-download-active', function(ev: SnippetsNpmDownloadActiveEvent) {
    log.info('MONGOSH-SNIPPETS', mongoLogId(1_000_000_023), 'snippets', 'npm download active', ev);
  });

  bus.addListener('mongosh-snippets:fetch-index', function(ev: SnippetsFetchIndexEvent) {
    log.info('MONGOSH-SNIPPETS', mongoLogId(1_000_000_024), 'snippets', 'Fetching snippet index', ev);
  });

  bus.addListener('mongosh-snippets:fetch-cache-invalid', function() {
    log.info('MONGOSH-SNIPPETS', mongoLogId(1_000_000_025), 'snippets', 'Snippet cache invalid');
  });

  bus.addListener('mongosh-snippets:fetch-index-error', function(ev: SnippetsFetchIndexErrorEvent) {
    log.info('MONGOSH-SNIPPETS', mongoLogId(1_000_000_026), 'snippets', 'Fetching snippet index failed', ev);
  });

  bus.addListener('mongosh-snippets:fetch-index-done', function() {
    log.info('MONGOSH-SNIPPETS', mongoLogId(1_000_000_027), 'snippets', 'Fetching snippet index done');
  });

  bus.addListener('mongosh-snippets:package-json-edit-error', function(ev: SnippetsErrorEvent) {
    log.info('MONGOSH-SNIPPETS', mongoLogId(1_000_000_028), 'snippets', 'Modifying snippets package.json failed', ev);
  });

  bus.addListener('mongosh-snippets:spawn-child', function(ev: SnippetsRunNpmEvent) {
    log.info('MONGOSH-SNIPPETS', mongoLogId(1_000_000_029), 'snippets', 'Spawning helper', ev);
  });

  bus.addListener('mongosh-snippets:load-snippet', function(ev: SnippetsLoadSnippetEvent) {
    log.info('MONGOSH-SNIPPETS', mongoLogId(1_000_000_030), 'snippets', 'Loading snippet', ev);
  });

  bus.addListener('mongosh-snippets:snippet-command', function(ev: SnippetsCommandEvent) {
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

  bus.addListener('mongosh-snippets:transform-error', function(ev: SnippetsTransformErrorEvent) {
    log.info('MONGOSH-SNIPPETS', mongoLogId(1_000_000_032), 'snippets', 'Rewrote error message', ev);
  });

  const deprecatedApiCalls = new Set<string>();
  bus.addListener('mongosh:deprecated-api-call', function(ev: ApiEvent) {
    deprecatedApiCalls.add(`${ev.class}#${ev.method}`);
  });
  bus.addListener('mongosh:evaluate-finished', function() {
    deprecatedApiCalls.forEach(e => {
      const [clazz, method] = e.split('#');
      log.warn('MONGOSH', mongoLogId(1_000_000_033), 'shell-api', 'Deprecated API call', { class: clazz, method });

      if (telemetry) {
        analytics.track({
          userId,
          event: 'Deprecated Method',
          properties: {
            mongosh_version,
            class: clazz,
            method
          }
        });
      }
    });
    deprecatedApiCalls.clear();
  });

  bus.addListener('mongosh-sp:connect-heartbeat-failure', function(ev: SpConnectHeartbeatFailureEvent) {
    log.warn('MONGOSH-SP', mongoLogId(1_000_000_034), 'connect', 'Server heartbeat failure', {
      ...ev,
      failure: ev.failure?.message
    });
  });

  bus.addListener('mongosh-sp:connect-heartbeat-succeeded', function(ev: SpConnectHeartbeatSucceededEvent) {
    log.info('MONGOSH-SP', mongoLogId(1_000_000_035), 'connect', 'Server heartbeat succeeded', ev);
  });

  bus.addListener('mongosh-sp:connect-fail-early', function() {
    log.warn('MONGOSH-SP', mongoLogId(1_000_000_036), 'connect', 'Aborting connection attempt as irrecoverable');
  });

  bus.addListener('mongosh-sp:connect-attempt-finished', function() {
    log.info('MONGOSH-SP', mongoLogId(1_000_000_037), 'connect', 'Connection attempt finished');
  });

  bus.addListener('mongosh-sp:resolve-srv-error', function(ev: SpResolveSrvErrorEvent) {
    log.error('MONGOSH-SP', mongoLogId(1_000_000_038), 'connect', 'Resolving SRV record failed', {
      from: redactURICredentials(ev.from),
      error: ev.error?.message,
      duringLoad: ev.duringLoad
    });
  });

  bus.addListener('mongosh-sp:resolve-srv-succeeded', function(ev: SpResolveSrvSucceededEvent) {
    log.info('MONGOSH-SP', mongoLogId(1_000_000_039), 'connect', 'Resolving SRV record succeeded', {
      from: redactURICredentials(ev.from),
      to: redactURICredentials(ev.to)
    });
  });

  bus.addListener('mongosh-sp:reset-connection-options', function() {
    log.info('MONGOSH-SP', mongoLogId(1_000_000_040), 'connect', 'Reconnect because of changed connection options');
  });

  bus.addListener('mongosh-sp:missing-optional-dependency', function(ev: SpMissingOptionalDependencyEvent) {
    log.error('MONGOSH-SP', mongoLogId(1_000_000_041), 'deps', 'Missing optional dependency', {
      name: ev.name,
      error: ev?.error.message
    });
  });
}
