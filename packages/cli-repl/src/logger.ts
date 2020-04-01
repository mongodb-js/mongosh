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

  bus.on('connect', function(info) {
    const params = { sessionID, info };
    log.info('connect', params);
  });

  bus.on('error', function(error) {
    log.error(error);
  });

  bus.on('cmd:help', function() {
    log.info('cmd:help');
  });

  bus.on('cmd:use', function(database) {
    log.info('cmd:use', database);
  });

  bus.on('cmd:show', function(databases) {
    log.info('cmd:show', databases);
  });

  bus.on('cmd:it', function(info) {
    log.info('cmd:it', info);
  });

  bus.on('method:aggregate', function(collection, pipeline) {
    const params = { collection, pipeline };
    log.info('method:aggregate', params);
  });

  bus.on('method:bulkWrite', function(collection, operations) {
    const params = { collection, operations };
    log.info('method:bulkWrite', params);
  });

  bus.on('method:count', function(collection, query = {}) {
    const params = { collection, query };
    log.info('method:count', params);
  });

  bus.on('method:countDocuments', function(collection, query = {}, options) {
    const params = { collection, query, options };
    log.info('method:countDocument', params);
  });

  bus.on('method:deleteMany', function(collection, filter) {
    const params = { collection, filter };
    log.info('method:deleteMany', params);
  });

  bus.on('method:deleteOne', function(collection, filter) {
    const params = { collection, filter };
    log.info('method:deleteOne', params);
  });

  bus.on('method:distinct', function(collection, field, query = {}) {
    const params = { collection, field, query };
    log.info('method:distinct', params);
  });

  bus.on('method:estimatedDocumentCount', function(collection) {
    const params = { collection };
    log.info('method:estimatedDocumentCount', params);
  });

  bus.on('method:find', function(collection, query = {}, projection = {}) {
    const params = { collection, query, projection };
    log.info('method:find', params);
  });

  bus.on('method:findOne', function(collection, query = {}, projection = {}) {
    const params = { collection, query, projection };
    log.info('method:findOne', params);
  });

  bus.on('method:findOneAndDelete', function(collection, filter = {}) {
    const params = { collection, filter };
    log.info('method:findOneAndDelete', params);
  });

  bus.on('method:findOneAndReplace', function(collection, filter) {
    const params = { collection, filter };
    log.info('method:findOneAndReplace', params);
  });

  bus.on('method:findOneAndUpdate', function(collection, filter) {
    const params = { collection, filter };
    log.info('method:findOneAndUpdate', params);
  });

  bus.on('method:insert', function(collection, docs) {
    const params = { collection, docs };
    log.info('method:insert', params);
  });

  bus.on('method:insertMany', function(collection, docs) {
    const params = { collection, docs };
    log.info('method:insertMany', params);
  });

  bus.on('method:insertOne', function(collection, doc) {
    const params = { collection, doc };
    log.info('method:insertOne', params);
  });

  bus.on('method:isCapped', function(collection) {
    const params = { collection };
    log.info('method:isCapped', params);
  });

  bus.on('method:remove', function(collection, query = {}) {
    const params = { collection, query };
    log.info('method:remove', params);
  });

  bus.on('method:save', function(collection, doc) {
    const params = { collection, doc };
    log.info('method:save', params);
  });

  bus.on('method:replaceOne', function(collection, filter) {
    const params = { collection, filter };
    log.info('method:replaceOne', params);
  });

  bus.on('method:runCommand', function(database, cmd) {
    const params = { database, cmd };
    log.info('method:runCommand', params);
  });

  bus.on('method:update', function(collection, filter) {
    const params = { collection, filter };
    log.info('method:update', params);
  });

  bus.on('method:updateMany', function(collection, filter) {
    const params = { collection, filter };
    log.info('method:updateMany', params);
  });

  bus.on('method:updateOne', function(collection, filter) {
    const params = { collection, filter };
    log.info('method:updateOne', params);
  });

  bus.on('method:convertToCapped', function(collection, size) {
    const params = { collection, size };
    log.info('method:convertToCapped', params);
  });

  bus.on('method:createIndexes', function(collection, keyPatterns, options) {
    const params = { collection, keyPatterns, options };
    log.info('method:createIndexes', params);
  });

  bus.on('method:createIndex', function(collection, keys, options) {
    const params = { collection, keys, options };
    log.info('method:createIndex', params);
  });

  bus.on('method:ensureIndex', function(collection, keys, options) {
    const params = { collection, keys, options };
    log.info('method:ensureIndex', params);
  });

  bus.on('method:getIndexes', function(collection) {
    const params = { collection };
    log.info('method:getIndexes', params);
  });

  bus.on('method:getIndexSpecs', function(collection) {
    const params = { collection };
    log.info('method:getIndexSpecs', params);
  });

  bus.on('method:getIndices', function(collection) {
    const params = { collection };
    log.info('method:getIndices', params);
  });

  bus.on('method:getIndexKeys', function(collection) {
    const params = { collection };
    log.info('method:getIndexKeys', params);
  });

  bus.on('method:dropIndexes', function(collection, indexes) {
    const params = { collection, indexes };
    log.info('method:dropIndexes', params);
  });

  bus.on('method:dropIndex', function(collection, index) {
    const params = { collection, index };
    log.info('method:dropIndex', params);
  });

  bus.on('method:getCollectionInfos', function(database, filter, options) {
    const params = { database, filter, options };
    log.info('method:getCollectionInfos', params);
  });

  bus.on('method:getCollectionNames', function(database) {
    const params = { database };
    log.info('method:getCollectionNames', params);
  });

  bus.on('method:totalIndexSize', function(collection) {
    const params = { collection };
    log.info('method:totalIndexSize', params);
  });

  bus.on('method:reIndex', function(collection) {
    const params = { collection };
    log.info('method:reIndex', params);
  });

  bus.on('method:getDB', function(collection) {
    const params = { collection };
    log.info('method:getDB', params);
  });

  bus.on('method:stats', function(collection, options) {
    const params = { collection, options };
    log.info('method:stats', params);
  });

  bus.on('method:dataSize', function(collection) {
    const params = { collection };
    log.info('method:dataSize', params);
  });

  bus.on('method:storageSize', function(collection) {
    const params = { collection };
    log.info('method:storageSize', params);
  });

  bus.on('method:totalSize', function(collection) {
    const params = { collection };
    log.info('method:totalSize', params);
  });
}

export default logger;
