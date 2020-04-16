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
    log.info('mongosh:rewrittenAsyncInput', redactInfo(inputInfo));
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

  bus.on('mongosh:db.coll.aggregate', function(collection, pipeline) {
    const params = { collection, pipeline };
    log.info('mongosh:db.coll.aggregate', redactInfo(params));
  });

  bus.on('mongosh:db.coll.bulkWrite', function(collection, operations) {
    const params = { collection, operations };
    log.info('mongosh:db.coll.bulkWrite', redactInfo(params));
  });

  bus.on('mongosh:db.coll.count', function(collection, query = {}) {
    const params = { collection, query };
    log.info('mongosh:db.coll.count', redactInfo(params));
  });

  bus.on('mongosh:db.coll.countDocuments', function(collection, query = {}, options) {
    const params = { collection, query, options };
    log.info('mongosh:db.coll.countDocument', redactInfo(params));
  });

  bus.on('mongosh:db.coll.deleteMany', function(collection, filter) {
    const params = { collection, filter };
    log.info('mongosh:db.coll.deleteMany', redactInfo(params));
  });

  bus.on('mongosh:db.coll.deleteOne', function(collection, filter) {
    const params = { collection, filter };
    log.info('mongosh:db.coll.deleteOne', redactInfo(params));
  });

  bus.on('mongosh:db.coll.distinct', function(collection, field, query = {}) {
    const params = { collection, field, query };
    log.info('mongosh:db.coll.distinct', redactInfo(params));
  });

  bus.on('mongosh:db.coll.estimatedDocumentCount', function(collection) {
    const params = { collection };
    log.info('mongosh:db.coll.estimatedDocumentCount', redactInfo(params));
  });

  bus.on('mongosh:db.coll.find', function(collection, query = {}, projection = {}) {
    const params = { collection, query, projection };
    log.info('mongosh:db.coll.find', redactInfo(params));
  });

  bus.on('mongosh:db.coll.findOne', function(collection, query = {}, projection = {}) {
    const params = { collection, query, projection };
    log.info('mongosh:db.coll.findOne', redactInfo(params));
  });

  bus.on('mongosh:db.coll.findOneAndDelete', function(collection, filter = {}) {
    const params = { collection, filter };
    log.info('mongosh:db.coll.findOneAndDelete', redactInfo(params));
  });

  bus.on('mongosh:db.coll.findOneAndReplace', function(collection, filter) {
    const params = { collection, filter };
    log.info('mongosh:db.coll.findOneAndReplace', redactInfo(params));
  });

  bus.on('mongosh:db.coll.findOneAndUpdate', function(collection, filter) {
    const params = { collection, filter };
    log.info('mongosh:db.coll.findOneAndUpdate', redactInfo(params));
  });

  bus.on('mongosh:db.coll.insert', function(collection, docs) {
    const params = { collection, docs };
    log.info('mongosh:db.coll.insert', redactInfo(params));
  });

  bus.on('mongosh:db.coll.insertMany', function(collection, docs) {
    const params = { collection, docs };
    log.info('mongosh:db.coll.insertMany', redactInfo(params));
  });

  bus.on('mongosh:db.coll.insertOne', function(collection, doc) {
    const params = { collection, doc };
    log.info('mongosh:db.coll.insertOne', redactInfo(params));
  });

  bus.on('mongosh:db.coll.isCapped', function(collection) {
    const params = { collection };
    log.info('mongosh:db.coll.isCapped', redactInfo(params));
  });

  bus.on('mongosh:db.coll.remove', function(collection, query = {}) {
    const params = { collection, query };
    log.info('mongosh:db.coll.remove', redactInfo(params));
  });

  bus.on('mongosh:db.coll.save', function(collection, doc) {
    const params = { collection, doc };
    log.info('mongosh:db.coll.save', redactInfo(params));
  });

  bus.on('mongosh:db.coll.replaceOne', function(collection, filter) {
    const params = { collection, filter };
    log.info('mongosh:db.coll.replaceOne', redactInfo(params));
  });

  bus.on('mongosh:db.runCommand', function(database, cmd) {
    const params = { database, cmd };
    log.info('mongosh:db.runCommand', redactInfo(params));
  });

  bus.on('mongosh:db.coll.update', function(collection, filter) {
    const params = { collection, filter };
    log.info('mongosh:db.coll.update', redactInfo(params));
  });

  bus.on('mongosh:db.coll.updateMany', function(collection, filter) {
    const params = { collection, filter };
    log.info('mongosh:db.coll.updateMany', redactInfo(params));
  });

  bus.on('mongosh:db.coll.updateOne', function(collection, filter) {
    const params = { collection, filter };
    log.info('mongosh:db.coll.updateOne', redactInfo(params));
  });

  bus.on('mongosh:db.coll.convertToCapped', function(collection, size) {
    const params = { collection, size };
    log.info('mongosh:db.coll.convertToCapped', redactInfo(params));
  });

  bus.on('mongosh:db.coll.createIndexes', function(collection, keyPatterns, options) {
    const params = { collection, keyPatterns, options };
    log.info('mongosh:db.coll.createIndexes', redactInfo(params));
  });

  bus.on('mongosh:db.coll.createIndex', function(collection, keys, options) {
    const params = { collection, keys, options };
    log.info('mongosh:db.coll.createIndex', redactInfo(params));
  });

  bus.on('mongosh:db.coll.ensureIndex', function(collection, keys, options) {
    const params = { collection, keys, options };
    log.info('mongosh:db.coll.ensureIndex', redactInfo(params));
  });

  bus.on('mongosh:db.coll.getIndexes', function(collection) {
    const params = { collection };
    log.info('mongosh:db.coll.getIndexes', redactInfo(params));
  });

  bus.on('mongosh:db.coll.getIndexSpecs', function(collection) {
    const params = { collection };
    log.info('mongosh:db.coll.getIndexSpecs', redactInfo(params));
  });

  bus.on('mongosh:db.coll.getIndices', function(collection) {
    const params = { collection };
    log.info('mongosh:db.coll.getIndices', redactInfo(params));
  });

  bus.on('mongosh:db.coll.getIndexKeys', function(collection) {
    const params = { collection };
    log.info('mongosh:db.coll.getIndexKeys', redactInfo(params));
  });

  bus.on('mongosh:db.coll.dropIndexes', function(collection, indexes) {
    const params = { collection, indexes };
    log.info('mongosh:db.coll.dropIndexes', redactInfo(params));
  });

  bus.on('mongosh:db.coll.dropIndex', function(collection, index) {
    const params = { collection, index };
    log.info('mongosh:db.coll.dropIndex', redactInfo(params));
  });

  bus.on('mongosh:db.coll.getCollectionInfos', function(database, filter, options) {
    const params = { database, filter, options };
    log.info('mongosh:db.coll.getCollectionInfos', redactInfo(params));
  });

  bus.on('mongosh:db.coll.getCollectionNames', function(database) {
    const params = { database };
    log.info('mongosh:db.coll.getCollectionNames', redactInfo(params));
  });

  bus.on('mongosh:db.coll.totalIndexSize', function(collection) {
    const params = { collection };
    log.info('mongosh:db.coll.totalIndexSize', redactInfo(params));
  });

  bus.on('mongosh:db.coll.reIndex', function(collection) {
    const params = { collection };
    log.info('mongosh:db.coll.reIndex', redactInfo(params));
  });

  bus.on('mongosh:db.coll.getDB', function(collection) {
    const params = { collection };
    log.info('mongosh:db.coll.getDB', redactInfo(params));
  });

  bus.on('mongosh:db.coll.stats', function(collection, options) {
    const params = { collection, options };
    log.info('mongosh:db.coll.stats', redactInfo(params));
  });

  bus.on('mongosh:db.coll.dataSize', function(collection) {
    const params = { collection };
    log.info('mongosh:db.coll.dataSize', redactInfo(params));
  });

  bus.on('mongosh:db.coll.storageSize', function(collection) {
    const params = { collection };
    log.info('mongosh:db.coll.storageSize', redactInfo(params));
  });

  bus.on('mongosh:db.coll.totalSize', function(collection) {
    const params = { collection };
    log.info('mongosh:db.coll.totalSize', redactInfo(params));
  });
}

export default logger;
