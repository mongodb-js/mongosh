import redactInfo from 'mongodb-redact';
import redactPwd from './redact-pwd';
import { uuid } from 'uuidv4';
import pino from 'pino';
import path from 'path';
import os from 'os';

function logger(bus: any, logDir: string) {
  const time = Date.now();
  const logDest = path.join(logDir, `${time}_log`);
  const log = pino({ name: 'monogsh' }, pino.destination(logDest));
  const sessionID = uuid();

  bus.on('*', function() {});

  bus.on('mongosh:connect', function(info) {
    const params = { sessionID, info: redactPwd(info) };
    log.info('connect', params);
  });

  bus.on('mongosh:error', function(error) {
    log.error(error);
  });

  bus.on('mongosh:help', function() {
    log.info('mongosh:help');
  });

  bus.on('mongosh:rewrittenAsyncInput', function(inputInfo) {
    log.info('mongosh:rewrittenAsyncInput', inputInfo);
  });

  bus.on('mongosh:use', function(database) {
    log.info('mongosh:use', database);
  });

  bus.on('mongosh:show', function(databases) {
    log.info('mongosh:show', databases);
  });

  bus.on('mongosh:it', function(info) {
    log.info('mongosh:it', info);
  });

  bus.on('mongosh:api-call', function(args) {
    log.info(redactInfo(args));
  });
}

export default logger;
