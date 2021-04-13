/* eslint-disable camelcase */
import redactInfo from 'mongodb-redact';
import { redactCredentials } from '@mongosh/history';
import type { Logger } from 'pino';
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
  SnippetsTransformErrorEvent
} from '@mongosh/types';

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

// set up a noop, in case we are not able to connect to segment.
class NoopAnalytics implements MongoshAnalytics {
  identify(_info: any): void {} // eslint-disable-line @typescript-eslint/no-unused-vars
  track(_info: any): void {} // eslint-disable-line @typescript-eslint/no-unused-vars
}

export default function setupLoggerAndTelemetry(
  logId: string,
  bus: MongoshBus,
  makeLogger: () => Logger,
  makeAnalytics: () => MongoshAnalytics): void {
  const log = makeLogger();
  const mongosh_version = require('../package.json').version;
  let userId: string;
  let telemetry: boolean;
  const userTraits = {
    platform: process.platform,
    arch: process.arch
  };

  log.info('mongosh:start-logging', {
    version: mongosh_version,
    execPath: process.execPath,
    isCompiledBinary: process.execPath === process.argv[1]
  });

  let analytics: MongoshAnalytics = new NoopAnalytics();
  try {
    analytics = makeAnalytics();
  } catch (e) {
    log.error(e);
  }

  // We emit different analytics events for loading files and evaluating scripts
  // depending on whether we're already in the REPL or not yet. We store the
  // state here so that the places where the events are emitted don't have to
  // be aware of this distinction.
  let hasStartedMongoshRepl = false;
  bus.on('mongosh:start-mongosh-repl', (ev: StartMongoshReplEvent) => {
    log.info('mongosh:start-mongosh-repl', ev);
    hasStartedMongoshRepl = true;
  });

  let usesShellOption = false;
  bus.on('mongosh:start-loading-cli-scripts', (event: StartLoadingCliScriptsEvent) => {
    log.info('mongosh:start-loading-cli-scripts');
    usesShellOption = event.usesShellOption;
  });

  bus.on('mongosh:connect', function(args: ConnectEvent) {
    const connectionUri = redactCredentials(args.uri);
    const { uri: _uri, ...argsWithoutUri } = args; // eslint-disable-line @typescript-eslint/no-unused-vars
    const params = { session_id: logId, userId, connectionUri, ...argsWithoutUri };
    log.info('mongosh:connect', params);

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

  bus.on('mongosh:driver-initialized', function(driverMetadata: any) {
    log.info('mongosh:driver-initialized', driverMetadata);
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
    log.info('mongosh:update-user', { enableTelemetry });
  });

  bus.on('mongosh:error', function(error: any) {
    log.error(error);

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
    log.info('mongosh:evaluate-input', args);
  });

  bus.on('mongosh:use', function(args: UseEvent) {
    log.info('mongosh:use', args);

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
    log.info('mongosh:show', args);

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

  bus.on('mongosh:setCtx', function(args: ApiEvent) {
    log.info('mongosh:setCtx', args);
  });

  bus.on('mongosh:api-call', function(args: ApiEvent) {
    log.info('mongosh:api-call', redactInfo(args));
  });

  bus.on('mongosh:api-load-file', function(args: ScriptLoadFileEvent) {
    log.info('mongosh:api-load-file', args);

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
    log.info('mongosh:eval-cli-script');

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
    log.info('mongosh:mongoshrc-load');

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
    log.info('mongosh:mongoshrc-mongorc-warn');

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
    log.info('mongosh:mongocryptd-tryspawn', ev);
  });

  bus.on('mongosh:mongocryptd-error', function(ev: MongocryptdErrorEvent) {
    log.error('mongosh:mongocryptd-error', ev);
  });

  bus.on('mongosh:mongocryptd-log', function(ev: MongocryptdLogEvent) {
    log.info('mongosh:mongocryptd-log', ev);
  });

  bus.on('mongosh-snippets:loaded', function(ev: SnippetsLoadedEvent) {
    log.info('mongosh-snippets:loaded', ev);
  });

  bus.on('mongosh-snippets:npm-lookup', function(ev: SnippetsNpmLookupEvent) {
    log.info('mongosh-snippets:npm-lookup', ev);
  });

  bus.on('mongosh-snippets:npm-lookup-stopped', function() {
    log.info('mongosh-snippets:npm-lookup-stopped');
  });

  bus.on('mongosh-snippets:npm-download-failed', function(ev: SnippetsNpmDownloadFailedEvent) {
    log.error('mongosh-snippets:npm-download-failed', ev);
  });

  bus.on('mongosh-snippets:npm-download-active', function(ev: SnippetsNpmDownloadActiveEvent) {
    log.info('mongosh-snippets:npm-download-active', ev);
  });

  bus.on('mongosh-snippets:fetch-index', function(ev: SnippetsFetchIndexEvent) {
    log.info('mongosh-snippets:fetch-index', ev);
  });

  bus.on('mongosh-snippets:fetch-cache-invalid', function() {
    log.info('mongosh-snippets:fetch-cache-invalid');
  });

  bus.on('mongosh-snippets:fetch-index-error', function(ev: SnippetsFetchIndexErrorEvent) {
    log.error('mongosh-snippets:fetch-index-error', ev);
  });

  bus.on('mongosh-snippets:fetch-index-done', function() {
    log.info('mongosh-snippets:fetch-index-done');
  });

  bus.on('mongosh-snippets:package-json-edit-error', function(ev: SnippetsErrorEvent) {
    log.error('mongosh-snippets:package-json-edit-error', ev);
  });

  bus.on('mongosh-snippets:spawn-child', function(ev: SnippetsRunNpmEvent) {
    log.info('mongosh-snippets:spawn-child', ev);
  });

  bus.on('mongosh-snippets:load-snippet', function(ev: SnippetsLoadSnippetEvent) {
    log.info('mongosh-snippets:load-snippet', ev);
  });

  bus.on('mongosh-snippets:snippet-command', function(ev: SnippetsCommandEvent) {
    log.info('mongosh-snippets:snippet-command', ev);

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
    log.info('mongosh-snippets:transform-error', ev);
  });

  const deprecatedApiCalls = new Set<string>();
  bus.on('mongosh:deprecated-api-call', function(ev: ApiEvent) {
    deprecatedApiCalls.add(`${ev.class}#${ev.method}`);
  });
  bus.on('mongosh:evaluate-finished', function() {
    deprecatedApiCalls.forEach(e => {
      const [clazz, method] = e.split('#');
      log.info('mongosh:deprecated-api-call', { class: clazz, method });

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
}
