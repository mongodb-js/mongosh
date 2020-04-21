import redactInfo from 'mongodb-redact';
import Analytics from 'analytics-node';
import redactPwd from './redact-pwd';
import { ObjectId } from 'bson';
import pino from 'pino';
import path from 'path';
import os from 'os';

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

interface ShowEvent {
  method: string;
}

interface ErrorEvent {
  error: object;
}

interface ConnectEvent {
  driverUri: string;
}

function logger(bus: any, logDir: string) {
  const sessionID = new ObjectId(Date.now());
  const logDest = path.join(logDir, `${sessionID}_log`);
  const log = pino({ name: 'monogsh' }, pino.destination(logDest));
  console.log(`Current sessionID: ${sessionID}`);
  let userId;
  let telemetry;

  let analytics = new NoopAnalytics();
  try {
    analytics = new Analytics(process.env.SEGMENT_API_KEY);
  } catch (e) {
    bus.emit('mongosh:error', e)
  }

  bus.on('mongosh:connect', function(info: ConnectEvent) {
    const params = { sessionID, userId, info: redactPwd(info) };
    log.info('connect', params);

    if (telemetry) {
      analytics.track({
        userId,
        event: 'mongosh:connect',
        properties: { sessionID, info: redactPwd(info) }
      });
    }
  });

  bus.on('mongosh:new-user', function(id, enableTelemetry) {
    userId = id;
    telemetry = enableTelemetry;
    if (telemetry) analytics.identify({ userId });
  })

  bus.on('mongosh:update-user', function(id, enableTelemetry) {
    userId = id;
    telemetry = enableTelemetry;
  })

  bus.on('mongosh:toggleTelemetry', function(enableTelemetry) {
    telemetry = enableTelemetry;
    log.info('mongosh:toggleTelemetry', { enableTelemetry })
  })

  bus.on('mongosh:error', function(error: ErrorEvent) {
    log.error(error);

    if (telemetry) {
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

  bus.on('mongosh:rewrittenAsyncInput', function(inputInfo) {
    log.info('mongosh:rewrittenAsyncInput', inputInfo);
  });

  bus.on('mongosh:use', function(args: UseEvent) {
    log.info(args);

    if (telemetry) {
      analytics.track({
        userId,
        event: 'mongosh:use'
      });
    }
  });

  bus.on('mongosh:show', function(args: ShowEvent) {
    log.info(args);

    if (telemetry) {
      analytics.track({
        userId,
        event: 'mongosh:show',
        properties: { method: args.method }
      });
    }
  });

  bus.on('mongosh:it', function() {
    log.info('mongosh:it');

    if (telemetry) {
      analytics.track({
        userId,
        event: 'mongosh:it'
      });
    }
  });

  bus.on('mongosh:setCtx', function(args) {
    log.info(args)
  })

  bus.on('mongosh:api-call', function(args: ApiEvent) {
    log.info(redactInfo(args));

    // analytics properties to include if they are present in an api-call
    let properties: ApiEvent = {};
    properties.arguments = {};
    if (args.method) properties.method = args.method;
    if (args.class) properties.class = args.class;
    if (args.arguments.pipeline) properties.arguments.pipeline = args.arguments.pipeline;
    if (args.arguments.query) properties.arguments.query = args.arguments.query;
    if (args.arguments.options) properties.arguments.options = args.arguments.options;
    if (args.arguments.filter) properties.arguments.filter= args.arguments.filter;

    if (telemetry) {
      analytics.track({
        userId,
        event: 'mongosh:api-call',
        properties: redactInfo(properties)
      });
    }
  });
}

// set up a noop, in case we are not able to connect to segment.
function NoopAnalytics() {}

NoopAnalytics.prototype.identify = function() {}
NoopAnalytics.prototype.track = function() {}

export default logger;
