/* eslint no-console:0, no-empty-function: 0 */

import redactInfo from 'mongodb-redact';
import Analytics from 'analytics-node';
import redactPwd from './redact-pwd';
import { ObjectId } from 'bson';
import pino from 'pino';
import path from 'path';

interface ApiEventArguments {
  pipeline?: any[];
  query?: object;
  options?: object;
  filter?: object;
}

interface ApiEvent {
  method?: string;
  class?: string;
  db?: string;
  coll?: string;
  arguments?: ApiEventArguments;
}

interface UseEvent {
  db: string;
}

interface AsyncRewriterEvent {
  original: string;
  rewritten: string;
}

interface ShowEvent {
  method: string;
}

interface ConnectEvent {
  uri: string;
  isAtlas: boolean;
  isLocalhost: boolean;
  serverVersion: string;
  isEnterprise: boolean;
  authType: string;
  isDataLake: boolean;
  dlVersion?: string;
  isGenuine: boolean;
  serverName: string;
}

// set up a noop, in case we are not able to connect to segment.
function NoopAnalytics(): void {}

NoopAnalytics.prototype.identify = function(): void {};
NoopAnalytics.prototype.track = function(): void {};

export default function logger(bus: any, logDir: string): void {
  const sessionID = new ObjectId(Date.now());
  const logDest = path.join(logDir, `${sessionID}_log`);
  const log = pino({ name: 'monogsh' }, pino.destination(logDest));
  console.log(`Current sessionID: ${sessionID}`);
  let userId;
  let telemetry;

  let analytics = new NoopAnalytics();
  try {
    // this file gets written as a part of a release
    log.warn(require('./analytics-config.js').SEGMENT_API_KEY);
    analytics = new Analytics(require('./analytics-config.js').SEGMENT_API_KEY);
  } catch (e) {
    bus.emit('mongosh:error', e);
  }

  bus.on('mongosh:connect', function(args: ConnectEvent) {
    const connectionUri = redactPwd(args.uri);
    delete args.uri;
    const params = { sessionID, userId, connectionUri, ...args };
    log.info('mongosh:connect', params);

    if (telemetry) {
      analytics.track({
        userId,
        event: 'mongosh:connect',
        properties: { sessionID, connectionUri, ...args }
      });
    }
  });

  bus.on('mongosh:new-user', function(id, enableTelemetry) {
    userId = id;
    telemetry = enableTelemetry;
    if (telemetry) analytics.identify({ userId });
  });

  bus.on('mongosh:update-user', function(id, enableTelemetry) {
    userId = id;
    telemetry = enableTelemetry;
    log.info('mongosh:update-user', { enableTelemetry });
  });


  bus.on('mongosh:error', function(error: any) {
    log.error(error);

    if (telemetry && error.name.includes('Mongosh')) {
      analytics.track({
        userId,
        event: 'mongosh:error',
        properties: { error }
      });
    }
  });

  bus.on('mongosh:help', function() {
    log.info('mongosh:help');

    if (telemetry) {
      analytics.track({
        userId,
        event: 'mongosh:help'
      });
    }
  });

  bus.on('mongosh:rewritten-async-input', function(args: AsyncRewriterEvent) {
    log.info('mongosh:rewritten-async-input', args);
  });

  bus.on('mongosh:use', function(args: UseEvent) {
    log.info('mongosh:use', args);

    if (telemetry) {
      analytics.track({
        userId,
        event: 'mongosh:use'
      });
    }
  });

  bus.on('mongosh:show', function(args: ShowEvent) {
    log.info('mongosh:show', args);

    if (telemetry) {
      analytics.track({
        userId,
        event: 'mongosh:show',
        properties: { method: args.method }
      });
    }
  });

  bus.on('mongosh:setCtx', function(args) {
    log.info('mongosh:setCtx', args);
  });

  bus.on('mongosh:api-call', function(args: ApiEvent) {
    log.info('mongosh:api-call', redactInfo(args));

    // analytics properties to include if they are present in an api-call
    const properties: ApiEvent = {};
    properties.arguments = {};
    if (args.method) properties.method = args.method;
    if (args.class) properties.class = args.class;
    if (args.arguments) properties.arguments = properties.arguments;

    if (telemetry) {
      analytics.track({
        userId,
        event: 'mongosh:api-call',
        properties: redactInfo(properties)
      });
    }
  });
}
