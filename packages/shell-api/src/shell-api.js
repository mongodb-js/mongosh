/* AUTO-GENERATED SHELL API CLASSES*/
import {Help} from './help';

class AggregationCursor {
  constructor(_mapper, _cursor) {
    this._mapper = _mapper;
    this._cursor = _cursor;

    this.toReplString = () => {
      return this._mapper.it();
    };

    this.shellApiType = () => {
      return 'AggregationCursor';
    };
    this.help = () => new Help({'help': 'shell-api.aggregation-cursor.description'});
    this.bsonsize = function() {
      return this._cursor.bsonsize(...arguments);
    };
    this.bsonsize.help = () => new Help({'help': '!! No help defined for this method'});
    this.bsonsize.serverVersions = ['0.0.0', '4.4.0'];
    this.bsonsize.topologies = [0, 1, 2];
    this.bsonsize.returnsPromise = false;
    this.bsonsize.returnType = 'Unknown';
    this.close = function() {
      return this._cursor.close(...arguments);
    };
    this.close.help = () => new Help({'help': 'shell-api.aggregation-cursor.help.close'});
    this.close.serverVersions = ['0.0.0', '4.4.0'];
    this.close.topologies = [0, 1, 2];
    this.close.returnsPromise = false;
    this.close.returnType = 'Unknown';
    this.forEach = function() {
      return this._cursor.forEach(...arguments);
    };
    this.forEach.help = () => new Help({'help': 'shell-api.aggregation-cursor.help.for-each'});
    this.forEach.serverVersions = ['0.0.0', '4.4.0'];
    this.forEach.topologies = [0, 1, 2];
    this.forEach.returnsPromise = false;
    this.forEach.returnType = 'Unknown';
    this.hasNext = function() {
      return this._cursor.hasNext(...arguments);
    };
    this.hasNext.help = () => new Help({'help': 'shell-api.aggregation-cursor.help.has-next'});
    this.hasNext.serverVersions = ['0.0.0', '4.4.0'];
    this.hasNext.topologies = [0, 1, 2];
    this.hasNext.returnsPromise = false;
    this.hasNext.returnType = 'Unknown';
    this.isClosed = function() {
      return this._cursor.isClosed(...arguments);
    };
    this.isClosed.help = () => new Help({'help': 'shell-api.aggregation-cursor.help.is-closed'});
    this.isClosed.serverVersions = ['0.0.0', '4.4.0'];
    this.isClosed.topologies = [0, 1, 2];
    this.isClosed.returnsPromise = false;
    this.isClosed.returnType = 'Unknown';
    this.isExhausted = function() {
      return this._cursor.isExhausted(...arguments);
    };
    this.isExhausted.help = () => new Help({'help': 'shell-api.aggregation-cursor.help.is-exhausted'});
    this.isExhausted.serverVersions = ['0.0.0', '4.4.0'];
    this.isExhausted.topologies = [0, 1, 2];
    this.isExhausted.returnsPromise = false;
    this.isExhausted.returnType = 'Unknown';
    this.itcount = function() {
      return this._cursor.itcount(...arguments);
    };
    this.itcount.help = () => new Help({'help': 'shell-api.aggregation-cursor.help.itcount'});
    this.itcount.serverVersions = ['0.0.0', '4.4.0'];
    this.itcount.topologies = [0, 1, 2];
    this.itcount.returnsPromise = false;
    this.itcount.returnType = 'Unknown';
    this.map = function() {
      return this._cursor.map(...arguments);
    };
    this.map.help = () => new Help({'help': 'shell-api.aggregation-cursor.help.map'});
    this.map.serverVersions = ['0.0.0', '4.4.0'];
    this.map.topologies = [0, 1, 2];
    this.map.returnsPromise = false;
    this.map.returnType = 'Unknown';
    this.next = function() {
      return this._cursor.next(...arguments);
    };
    this.next.help = () => new Help({'help': 'shell-api.aggregation-cursor.help.next'});
    this.next.serverVersions = ['0.0.0', '4.4.0'];
    this.next.topologies = [0, 1, 2];
    this.next.returnsPromise = false;
    this.next.returnType = 'Unknown';
    this.objsLeftInBatch = function() {
      return this._cursor.objsLeftInBatch(...arguments);
    };
    this.objsLeftInBatch.help = () => new Help({'help': 'shell-api.aggregation-cursor.help.objs-left-in-batch'});
    this.objsLeftInBatch.serverVersions = ['0.0.0', '4.4.0'];
    this.objsLeftInBatch.topologies = [0, 1, 2];
    this.objsLeftInBatch.returnsPromise = false;
    this.objsLeftInBatch.returnType = 'Unknown';
    this.toArray = function() {
      return this._cursor.toArray(...arguments);
    };
    this.toArray.help = () => new Help({'help': 'shell-api.aggregation-cursor.help.to-array'});
    this.toArray.serverVersions = ['0.0.0', '4.4.0'];
    this.toArray.topologies = [0, 1, 2];
    this.toArray.returnsPromise = false;
    this.toArray.returnType = 'Unknown';
  }
}
class BulkWriteResult {
  constructor(ackowledged, insertedCount, insertedIds, matchedCount, modifedCount, deletedCount, upsertedCount, upsertedIds) {
    this.ackowledged = ackowledged;
    this.insertedCount = insertedCount;
    this.insertedIds = insertedIds;
    this.matchedCount = matchedCount;
    this.modifedCount = modifedCount;
    this.deletedCount = deletedCount;
    this.upsertedCount = upsertedCount;
    this.upsertedIds = upsertedIds;

    this.toReplString = () => {
      return JSON.parse(JSON.stringify(this));
    };

    this.shellApiType = () => {
      return 'BulkWriteResult';
    };
    this.help = () => new Help({'help': 'shell-api.bulk-write-result.description'});
  }
}
class Collection {
  constructor(_mapper, _database, _collection) {
    this._mapper = _mapper;
    this._database = _database;
    this._collection = _collection;

    this.toReplString = () => {
      return this._collection;
    };

    this.shellApiType = () => {
      return 'Collection';
    };
    this.help = () => new Help({'help': 'The collection class.'});
    this.aggregate = function() {
      return this._mapper.aggregate(this, ...arguments);
    };
    this.aggregate.help = () => new Help({'help': 'shell-api.collection.help.aggregate'});
    this.aggregate.serverVersions = ['0.0.0', '4.4.0'];
    this.aggregate.topologies = [0, 1, 2];
    this.aggregate.returnsPromise = false;
    this.aggregate.returnType = 'AggregationCursor';
    this.bulkWrite = function() {
      return this._mapper.bulkWrite(this, ...arguments);
    };
    this.bulkWrite.help = () => new Help({'help': 'shell-api.collection.help.bulk-write'});
    this.bulkWrite.serverVersions = ['3.2.0', '4.4.0'];
    this.bulkWrite.topologies = [0, 1, 2];
    this.bulkWrite.returnsPromise = true;
    this.bulkWrite.returnType = 'Unknown';
    this.countDocuments = function() {
      return this._mapper.countDocuments(this, ...arguments);
    };
    this.countDocuments.help = () => new Help({'help': 'shell-api.collection.help.count-documents'});
    this.countDocuments.serverVersions = ['4.0.3', '4.4.0'];
    this.countDocuments.topologies = [0, 1, 2];
    this.countDocuments.returnsPromise = true;
    this.countDocuments.returnType = 'Unknown';
    this.count = function() {
      return this._mapper.count(this, ...arguments);
    };
    this.count.help = () => new Help({'help': 'shell-api.collection.help.count'});
    this.count.serverVersions = ['0.0.0', '4.4.0'];
    this.count.topologies = [0, 1, 2];
    this.count.returnsPromise = true;
    this.count.returnType = 'Unknown';
    this.deleteMany = function() {
      return this._mapper.deleteMany(this, ...arguments);
    };
    this.deleteMany.help = () => new Help({'help': 'shell-api.collection.help.delete-many'});
    this.deleteMany.serverVersions = ['0.0.0', '4.4.0'];
    this.deleteMany.topologies = [0, 1, 2];
    this.deleteMany.returnsPromise = true;
    this.deleteMany.returnType = 'Unknown';
    this.deleteOne = function() {
      return this._mapper.deleteOne(this, ...arguments);
    };
    this.deleteOne.help = () => new Help({'help': 'shell-api.collection.help.delete-one'});
    this.deleteOne.serverVersions = ['0.0.0', '4.4.0'];
    this.deleteOne.topologies = [0, 1, 2];
    this.deleteOne.returnsPromise = true;
    this.deleteOne.returnType = 'Unknown';
    this.distinct = function() {
      return this._mapper.distinct(this, ...arguments);
    };
    this.distinct.help = () => new Help({'help': 'shell-api.collection.help.distinct'});
    this.distinct.serverVersions = ['0.0.0', '4.4.0'];
    this.distinct.topologies = [0, 1, 2];
    this.distinct.returnsPromise = false;
    this.distinct.returnType = 'Cursor';
    this.estimatedDocumentCount = function() {
      return this._mapper.estimatedDocumentCount(this, ...arguments);
    };
    this.estimatedDocumentCount.help = () => new Help({'help': 'shell-api.collection.help.estimated-document-count'});
    this.estimatedDocumentCount.serverVersions = ['4.0.3', '4.4.0'];
    this.estimatedDocumentCount.topologies = [0, 1, 2];
    this.estimatedDocumentCount.returnsPromise = true;
    this.estimatedDocumentCount.returnType = 'Unknown';
    this.find = function() {
      return this._mapper.find(this, ...arguments);
    };
    this.find.help = () => new Help({'help': 'shell-api.collection.help.find'});
    this.find.serverVersions = ['0.0.0', '4.4.0'];
    this.find.topologies = [0, 1, 2];
    this.find.returnsPromise = false;
    this.find.returnType = 'Cursor';
    this.findAndModify = function() {
      return this._mapper.findAndModify(this, ...arguments);
    };
    this.findAndModify.help = () => new Help({'help': 'shell-api.collection.help.find-and-modify'});
    this.findAndModify.serverVersions = ['0.0.0', '4.4.0'];
    this.findAndModify.topologies = [0, 1, 2];
    this.findAndModify.returnsPromise = false;
    this.findAndModify.returnType = 'Unknown';
    this.findOne = function() {
      return this._mapper.findOne(this, ...arguments);
    };
    this.findOne.help = () => new Help({'help': 'shell-api.collection.help.find-one'});
    this.findOne.serverVersions = ['0.0.0', '4.4.0'];
    this.findOne.topologies = [0, 1, 2];
    this.findOne.returnsPromise = false;
    this.findOne.returnType = 'Unknown';
    this.findOneAndDelete = function() {
      return this._mapper.findOneAndDelete(this, ...arguments);
    };
    this.findOneAndDelete.help = () => new Help({'help': 'shell-api.collection.help.find-one-and-delete'});
    this.findOneAndDelete.serverVersions = ['3.2.0', '4.4.0'];
    this.findOneAndDelete.topologies = [0, 1, 2];
    this.findOneAndDelete.returnsPromise = true;
    this.findOneAndDelete.returnType = 'Unknown';
    this.findOneAndReplace = function() {
      return this._mapper.findOneAndReplace(this, ...arguments);
    };
    this.findOneAndReplace.help = () => new Help({'help': 'shell-api.collection.help.find-one-and-replace'});
    this.findOneAndReplace.serverVersions = ['3.2.0', '4.4.0'];
    this.findOneAndReplace.topologies = [0, 1, 2];
    this.findOneAndReplace.returnsPromise = true;
    this.findOneAndReplace.returnType = 'Unknown';
    this.findOneAndUpdate = function() {
      return this._mapper.findOneAndUpdate(this, ...arguments);
    };
    this.findOneAndUpdate.help = () => new Help({'help': 'shell-api-collection.help.find-one-and-update'});
    this.findOneAndUpdate.serverVersions = ['3.2.0', '4.4.0'];
    this.findOneAndUpdate.topologies = [0, 1, 2];
    this.findOneAndUpdate.returnsPromise = true;
    this.findOneAndUpdate.returnType = 'Unknown';
    this.insert = function() {
      return this._mapper.insert(this, ...arguments);
    };
    this.insert.help = () => new Help({'help': 'shell-api.collection.help.insert'});
    this.insert.serverVersions = ['0.0.0', '4.4.0'];
    this.insert.topologies = [0, 1, 2];
    this.insert.returnsPromise = true;
    this.insert.returnType = 'Unknown';
    this.insertMany = function() {
      return this._mapper.insertMany(this, ...arguments);
    };
    this.insertMany.help = () => new Help({'help': 'shell-api.collection.help.insert-many'});
    this.insertMany.serverVersions = ['3.2.0', '4.4.0'];
    this.insertMany.topologies = [0, 1, 2];
    this.insertMany.returnsPromise = true;
    this.insertMany.returnType = 'Unknown';
    this.insertOne = function() {
      return this._mapper.insertOne(this, ...arguments);
    };
    this.insertOne.help = () => new Help({'help': 'shell-api.collection.help.insert-one'});
    this.insertOne.serverVersions = ['3.2.0', '4.4.0'];
    this.insertOne.topologies = [0, 1, 2];
    this.insertOne.returnsPromise = true;
    this.insertOne.returnType = 'Unknown';
    this.isCapped = function() {
      return this._mapper.isCapped(this, ...arguments);
    };
    this.isCapped.help = () => new Help({'help': 'shell-api.collection.help.is-capped'});
    this.isCapped.serverVersions = ['0.0.0', '4.4.0'];
    this.isCapped.topologies = [0, 1, 2];
    this.isCapped.returnsPromise = true;
    this.isCapped.returnType = 'Unknown';
    this.remove = function() {
      return this._mapper.remove(this, ...arguments);
    };
    this.remove.help = () => new Help({'help': 'shell-api.collection.help.remove'});
    this.remove.serverVersions = ['0.0.0', '4.4.0'];
    this.remove.topologies = [0, 1, 2];
    this.remove.returnsPromise = true;
    this.remove.returnType = 'Unknown';
    this.save = function() {
      return this._mapper.save(this, ...arguments);
    };
    this.save.help = () => new Help({'help': 'shell-api.collection.help.save'});
    this.save.serverVersions = ['0.0.0', '4.4.0'];
    this.save.topologies = [0, 1, 2];
    this.save.returnsPromise = true;
    this.save.returnType = 'Unknown';
    this.replaceOne = function() {
      return this._mapper.replaceOne(this, ...arguments);
    };
    this.replaceOne.help = () => new Help({'help': 'shell-api.collection.help.replace-one'});
    this.replaceOne.serverVersions = ['3.2.0', '4.4.0'];
    this.replaceOne.topologies = [0, 1, 2];
    this.replaceOne.returnsPromise = true;
    this.replaceOne.returnType = 'Unknown';
    this.update = function() {
      return this._mapper.update(this, ...arguments);
    };
    this.update.help = () => new Help({'help': 'shell-api.collection.help.update'});
    this.update.serverVersions = ['0.0.0', '4.4.0'];
    this.update.topologies = [0, 1, 2];
    this.update.returnsPromise = true;
    this.update.returnType = 'Unknown';
    this.updateMany = function() {
      return this._mapper.updateMany(this, ...arguments);
    };
    this.updateMany.help = () => new Help({'help': 'shell-api.collection.help.update-many'});
    this.updateMany.serverVersions = ['3.2.0', '4.4.0'];
    this.updateMany.topologies = [0, 1, 2];
    this.updateMany.returnsPromise = true;
    this.updateMany.returnType = 'Unknown';
    this.updateOne = function() {
      return this._mapper.updateOne(this, ...arguments);
    };
    this.updateOne.help = () => new Help({'help': 'shell-api.collection.help.update-one'});
    this.updateOne.serverVersions = ['3.2.0', '4.4.0'];
    this.updateOne.topologies = [0, 1, 2];
    this.updateOne.returnsPromise = true;
    this.updateOne.returnType = 'Unknown';
  }
}
class Cursor {
  constructor(_mapper, _cursor) {
    this._mapper = _mapper;
    this._cursor = _cursor;

    this.toReplString = () => {
      return this._mapper.it();
    };

    this.shellApiType = () => {
      return 'Cursor';
    };
    this.help = () => new Help({'help': ''});
    this.addOption = function() {
      return this._cursor.addOption(...arguments);
    };
    this.addOption.help = () => new Help({'help': 'shell-api.cursor.help.add-option'});
    this.addOption.serverVersions = ['0.0.0', '3.2.0'];
    this.addOption.topologies = [0, 1, 2];
    this.addOption.returnsPromise = false;
    this.addOption.returnType = 'Unknown';
    this.allowPartialResults = function() {
      return this._cursor.allowPartialResults(...arguments);
    };
    this.allowPartialResults.help = () => new Help({'help': 'shell-api.cursor.help.allow-partial-results'});
    this.allowPartialResults.serverVersions = ['0.0.0', '4.4.0'];
    this.allowPartialResults.topologies = [0, 1, 2];
    this.allowPartialResults.returnsPromise = false;
    this.allowPartialResults.returnType = 'Unknown';
    this.arrayAccess = function() {
      return this._cursor.arrayAccess(...arguments);
    };
    this.arrayAccess.help = () => new Help({'help': '!! No help defined for this method'});
    this.arrayAccess.serverVersions = ['0.0.0', '4.4.0'];
    this.arrayAccess.topologies = [0, 1, 2];
    this.arrayAccess.returnsPromise = false;
    this.arrayAccess.returnType = 'Unknown';
    this.batchSize = function() {
      return this._cursor.batchSize(...arguments);
    };
    this.batchSize.help = () => new Help({'help': 'shell-api.cursor.help.batch-size'});
    this.batchSize.serverVersions = ['0.0.0', '4.4.0'];
    this.batchSize.topologies = [0, 1, 2];
    this.batchSize.returnsPromise = false;
    this.batchSize.returnType = 'Unknown';
    this.clone = function() {
      return this._cursor.clone(...arguments);
    };
    this.clone.help = () => new Help({'help': 'shell-api.cursor.help.clone'});
    this.clone.serverVersions = ['0.0.0', '4.4.0'];
    this.clone.topologies = [0, 1, 2];
    this.clone.returnsPromise = false;
    this.clone.returnType = 'Unknown';
    this.close = function() {
      return this._cursor.close(...arguments);
    };
    this.close.help = () => new Help({'help': 'shell-api.cursor.help.close'});
    this.close.serverVersions = ['0.0.0', '4.4.0'];
    this.close.topologies = [0, 1, 2];
    this.close.returnsPromise = false;
    this.close.returnType = 'Unknown';
    this.collation = function() {
      return this._cursor.collation(...arguments);
    };
    this.collation.help = () => new Help({'help': 'shell-api.cursor.help.collation'});
    this.collation.serverVersions = ['3.4.0', '4.4.0'];
    this.collation.topologies = [0, 1, 2];
    this.collation.returnsPromise = false;
    this.collation.returnType = 'Unknown';
    this.comment = function() {
      return this._cursor.comment(...arguments);
    };
    this.comment.help = () => new Help({'help': 'shell-api.cursor.help.comment'});
    this.comment.serverVersions = ['3.2.0', '4.4.0'];
    this.comment.topologies = [0, 1, 2];
    this.comment.returnsPromise = false;
    this.comment.returnType = 'Unknown';
    this.count = function() {
      return this._cursor.count(...arguments);
    };
    this.count.help = () => new Help({'help': 'shell-api.cursor.help.count'});
    this.count.serverVersions = ['0.0.0', '4.4.0'];
    this.count.topologies = [0, 1, 2];
    this.count.returnsPromise = false;
    this.count.returnType = 'Unknown';
    this.count.serverVersion = ['0.0.0', '4.0.0'];
    this.explain = function() {
      return this._cursor.explain(...arguments);
    };
    this.explain.help = () => new Help({'help': 'shell-api.cursor.help.explain'});
    this.explain.serverVersions = ['0.0.0', '4.4.0'];
    this.explain.topologies = [0, 1, 2];
    this.explain.returnsPromise = false;
    this.explain.returnType = 'Unknown';
    this.forEach = function() {
      return this._cursor.forEach(...arguments);
    };
    this.forEach.help = () => new Help({'help': 'shell-api.cursor.help.for-each'});
    this.forEach.serverVersions = ['0.0.0', '4.4.0'];
    this.forEach.topologies = [0, 1, 2];
    this.forEach.returnsPromise = false;
    this.forEach.returnType = 'Unknown';
    this.getQueryPlan = function() {
      return this._cursor.getQueryPlan(...arguments);
    };
    this.getQueryPlan.help = () => new Help({'help': 'shell-api.cursor.help.get-query-plan'});
    this.getQueryPlan.serverVersions = ['0.0.0', '4.4.0'];
    this.getQueryPlan.topologies = [0, 1, 2];
    this.getQueryPlan.returnsPromise = false;
    this.getQueryPlan.returnType = 'Unknown';
    this.hasNext = function() {
      return this._cursor.hasNext(...arguments);
    };
    this.hasNext.help = () => new Help({'help': 'shell-api.cursor.help.has-next'});
    this.hasNext.serverVersions = ['0.0.0', '4.4.0'];
    this.hasNext.topologies = [0, 1, 2];
    this.hasNext.returnsPromise = false;
    this.hasNext.returnType = 'Unknown';
    this.hint = function() {
      return this._cursor.hint(...arguments);
    };
    this.hint.help = () => new Help({'help': 'shell-api.cursor.help.hint'});
    this.hint.serverVersions = ['0.0.0', '4.4.0'];
    this.hint.topologies = [0, 1, 2];
    this.hint.returnsPromise = false;
    this.hint.returnType = 'Unknown';
    this.isClosed = function() {
      return this._cursor.isClosed(...arguments);
    };
    this.isClosed.help = () => new Help({'help': 'shell-api.cursor.help.is-closed'});
    this.isClosed.serverVersions = ['0.0.0', '4.4.0'];
    this.isClosed.topologies = [0, 1, 2];
    this.isClosed.returnsPromise = false;
    this.isClosed.returnType = 'Unknown';
    this.isExhausted = function() {
      return this._cursor.isExhausted(...arguments);
    };
    this.isExhausted.help = () => new Help({'help': 'shell-api.cursor.help.is-exhausted'});
    this.isExhausted.serverVersions = ['0.0.0', '4.4.0'];
    this.isExhausted.topologies = [0, 1, 2];
    this.isExhausted.returnsPromise = false;
    this.isExhausted.returnType = 'Unknown';
    this.itcount = function() {
      return this._cursor.itcount(...arguments);
    };
    this.itcount.help = () => new Help({'help': 'shell-api.cursor.help.itcount'});
    this.itcount.serverVersions = ['0.0.0', '4.4.0'];
    this.itcount.topologies = [0, 1, 2];
    this.itcount.returnsPromise = false;
    this.itcount.returnType = 'Unknown';
    this.length = function() {
      return this._cursor.length(...arguments);
    };
    this.length.help = () => new Help({'help': 'shell-api.cursor.help.length'});
    this.length.serverVersions = ['0.0.0', '4.4.0'];
    this.length.topologies = [0, 1, 2];
    this.length.returnsPromise = false;
    this.length.returnType = 'Unknown';
    this.limit = function() {
      return this._cursor.limit(...arguments);
    };
    this.limit.help = () => new Help({'help': 'shell-api.cursor.help.limit'});
    this.limit.serverVersions = ['0.0.0', '4.4.0'];
    this.limit.topologies = [0, 1, 2];
    this.limit.returnsPromise = false;
    this.limit.returnType = 'Unknown';
    this.map = function() {
      return this._cursor.map(...arguments);
    };
    this.map.help = () => new Help({'help': 'shell-api.cursor.help.map'});
    this.map.serverVersions = ['0.0.0', '4.4.0'];
    this.map.topologies = [0, 1, 2];
    this.map.returnsPromise = false;
    this.map.returnType = 'Unknown';
    this.max = function() {
      return this._cursor.max(...arguments);
    };
    this.max.help = () => new Help({'help': 'shell-api.cursor.help.max'});
    this.max.serverVersions = ['0.0.0', '4.4.0'];
    this.max.topologies = [0, 1, 2];
    this.max.returnsPromise = false;
    this.max.returnType = 'Unknown';
    this.maxScan = function() {
      return this._cursor.maxScan(...arguments);
    };
    this.maxScan.help = () => new Help({'help': 'shell-api.cursor.help.max-scan'});
    this.maxScan.serverVersions = ['0.0.0', '4.0.0'];
    this.maxScan.topologies = [0, 1, 2];
    this.maxScan.returnsPromise = false;
    this.maxScan.returnType = 'Unknown';
    this.maxTimeMS = function() {
      return this._cursor.maxTimeMS(...arguments);
    };
    this.maxTimeMS.help = () => new Help({'help': 'shell-api.cursor.help.max-time-ms'});
    this.maxTimeMS.serverVersions = ['0.0.0', '4.4.0'];
    this.maxTimeMS.topologies = [0, 1, 2];
    this.maxTimeMS.returnsPromise = false;
    this.maxTimeMS.returnType = 'Unknown';
    this.min = function() {
      return this._cursor.min(...arguments);
    };
    this.min.help = () => new Help({'help': 'shell-api.cursor.help.min'});
    this.min.serverVersions = ['0.0.0', '4.4.0'];
    this.min.topologies = [0, 1, 2];
    this.min.returnsPromise = false;
    this.min.returnType = 'Unknown';
    this.modifiers = function() {
      return this._cursor.modifiers(...arguments);
    };
    this.modifiers.help = () => new Help({'help': 'shell-api.cursor.help.modifiers'});
    this.modifiers.serverVersions = ['0.0.0', '4.4.0'];
    this.modifiers.topologies = [0, 1, 2];
    this.modifiers.returnsPromise = false;
    this.modifiers.returnType = 'Unknown';
    this.next = function() {
      return this._cursor.next(...arguments);
    };
    this.next.help = () => new Help({'help': 'shell-api.cursor.help.next'});
    this.next.serverVersions = ['0.0.0', '4.4.0'];
    this.next.topologies = [0, 1, 2];
    this.next.returnsPromise = false;
    this.next.returnType = 'Unknown';
    this.noCursorTimeout = function() {
      return this._cursor.noCursorTimeout(...arguments);
    };
    this.noCursorTimeout.help = () => new Help({'help': 'shell-api.cursor.help.no-cursor-timeout'});
    this.noCursorTimeout.serverVersions = ['0.0.0', '4.4.0'];
    this.noCursorTimeout.topologies = [0, 1, 2];
    this.noCursorTimeout.returnsPromise = false;
    this.noCursorTimeout.returnType = 'Unknown';
    this.objsLeftInBatch = function() {
      return this._cursor.objsLeftInBatch(...arguments);
    };
    this.objsLeftInBatch.help = () => new Help({'help': 'shell-api.cursor.help.objs-left-in-batch'});
    this.objsLeftInBatch.serverVersions = ['0.0.0', '4.4.0'];
    this.objsLeftInBatch.topologies = [0, 1, 2];
    this.objsLeftInBatch.returnsPromise = false;
    this.objsLeftInBatch.returnType = 'Unknown';
    this.oplogReplay = function() {
      return this._cursor.oplogReplay(...arguments);
    };
    this.oplogReplay.help = () => new Help({'help': 'shell-api.cursor.help.oplog-replay'});
    this.oplogReplay.serverVersions = ['0.0.0', '4.4.0'];
    this.oplogReplay.topologies = [0, 1, 2];
    this.oplogReplay.returnsPromise = false;
    this.oplogReplay.returnType = 'Unknown';
    this.projection = function() {
      return this._cursor.projection(...arguments);
    };
    this.projection.help = () => new Help({'help': 'shell-api.cursor.help.projection'});
    this.projection.serverVersions = ['0.0.0', '4.4.0'];
    this.projection.topologies = [0, 1, 2];
    this.projection.returnsPromise = false;
    this.projection.returnType = 'Unknown';
    this.pretty = function() {
      return this._cursor.pretty(...arguments);
    };
    this.pretty.help = () => new Help({'help': 'shell-api.cursor.help.pretty'});
    this.pretty.serverVersions = ['0.0.0', '4.4.0'];
    this.pretty.topologies = [0, 1, 2];
    this.pretty.returnsPromise = false;
    this.pretty.returnType = 'Unknown';
    this.readConcern = function() {
      return this._cursor.readConcern(...arguments);
    };
    this.readConcern.help = () => new Help({'help': 'shell-api.cursor.help.read-concern'});
    this.readConcern.serverVersions = ['3.2.0', '4.4.0'];
    this.readConcern.topologies = [0, 1, 2];
    this.readConcern.returnsPromise = false;
    this.readConcern.returnType = 'Unknown';
    this.readOnly = function() {
      return this._cursor.readOnly(...arguments);
    };
    this.readOnly.help = () => new Help({'help': 'shell-api.cursor.help.readonly'});
    this.readOnly.serverVersions = ['0.0.0', '4.4.0'];
    this.readOnly.topologies = [0, 1, 2];
    this.readOnly.returnsPromise = false;
    this.readOnly.returnType = 'Unknown';
    this.readPref = function() {
      return this._cursor.readPref(...arguments);
    };
    this.readPref.help = () => new Help({'help': 'shell-api.cursor.help.read-pref'});
    this.readPref.serverVersions = ['0.0.0', '4.4.0'];
    this.readPref.topologies = [0, 1, 2];
    this.readPref.returnsPromise = false;
    this.readPref.returnType = 'Unknown';
    this.returnKey = function() {
      return this._cursor.returnKey(...arguments);
    };
    this.returnKey.help = () => new Help({'help': 'shell-api.cursor.help.return-key'});
    this.returnKey.serverVersions = ['3.2.0', '4.4.0'];
    this.returnKey.topologies = [0, 1, 2];
    this.returnKey.returnsPromise = false;
    this.returnKey.returnType = 'Unknown';
    this.showDiskLoc = function() {
      return this._cursor.showDiskLoc(...arguments);
    };
    this.showDiskLoc.help = () => new Help({'help': 'shell-api.cursor.help.show-disk-loc'});
    this.showDiskLoc.serverVersions = ['0.0.0', '4.4.0'];
    this.showDiskLoc.topologies = [0, 1, 2];
    this.showDiskLoc.returnsPromise = false;
    this.showDiskLoc.returnType = 'Unknown';
    this.showRecordId = function() {
      return this._cursor.showRecordId(...arguments);
    };
    this.showRecordId.help = () => new Help({'help': 'shell-api.cursor.help.show-record-id'});
    this.showRecordId.serverVersions = ['0.0.0', '4.4.0'];
    this.showRecordId.topologies = [0, 1, 2];
    this.showRecordId.returnsPromise = false;
    this.showRecordId.returnType = 'Unknown';
    this.size = function() {
      return this._cursor.size(...arguments);
    };
    this.size.help = () => new Help({'help': 'shell-api.cursor.help.size'});
    this.size.serverVersions = ['0.0.0', '4.4.0'];
    this.size.topologies = [0, 1, 2];
    this.size.returnsPromise = false;
    this.size.returnType = 'Unknown';
    this.skip = function() {
      return this._cursor.skip(...arguments);
    };
    this.skip.help = () => new Help({'help': 'shell-api.cursor.help.skip'});
    this.skip.serverVersions = ['0.0.0', '4.4.0'];
    this.skip.topologies = [0, 1, 2];
    this.skip.returnsPromise = false;
    this.skip.returnType = 'Unknown';
    this.snapshot = function() {
      return this._cursor.snapshot(...arguments);
    };
    this.snapshot.help = () => new Help({'help': 'shell-api.cursor.help.snapshot'});
    this.snapshot.serverVersions = ['0.0.0', '4.0.0'];
    this.snapshot.topologies = [0, 1, 2];
    this.snapshot.returnsPromise = false;
    this.snapshot.returnType = 'Unknown';
    this.sort = function() {
      return this._cursor.sort(...arguments);
    };
    this.sort.help = () => new Help({'help': 'shell-api.cursor.help.sort'});
    this.sort.serverVersions = ['0.0.0', '4.4.0'];
    this.sort.topologies = [0, 1, 2];
    this.sort.returnsPromise = false;
    this.sort.returnType = 'Unknown';
    this.tailable = function() {
      return this._cursor.tailable(...arguments);
    };
    this.tailable.help = () => new Help({'help': 'shell-api.cursor.help.tailable'});
    this.tailable.serverVersions = ['3.2.0', '4.4.0'];
    this.tailable.topologies = [0, 1, 2];
    this.tailable.returnsPromise = false;
    this.tailable.returnType = 'Unknown';
    this.toArray = function() {
      return this._cursor.toArray(...arguments);
    };
    this.toArray.help = () => new Help({'help': 'shell-api.cursor.help.to-array'});
    this.toArray.serverVersions = ['0.0.0', '4.4.0'];
    this.toArray.topologies = [0, 1, 2];
    this.toArray.returnsPromise = false;
    this.toArray.returnType = 'Unknown';
  }
}
class Database {
  constructor(_mapper, _database) {
    const handler = {
      get: function(obj, prop) {
        if (!(prop in obj)) {
          obj[prop] = new Collection(_mapper, _database, prop);
        }
        return obj[prop];
      }
    };
    this._mapper = _mapper;
    this._database = _database;

    this.toReplString = () => {
      return this._database;
    };

    this.shellApiType = () => {
      return 'Database';
    };
    this.help = () => new Help({'help': 'shell-api.database.description'});
    this.runCommand = function() {
      return this._mapper.runCommand(this, ...arguments);
    };
    this.runCommand.help = () => new Help({'help': 'shell-api.database.help.run-command'});
    this.runCommand.serverVersions = ['0.0.0', '4.4.0'];
    this.runCommand.topologies = [0, 1, 2];
    this.runCommand.returnsPromise = false;
    this.runCommand.returnType = 'Unknown';

    return new Proxy(this, handler);
  }
}
class DeleteResult {
  constructor(acknowleged, deletedCount) {
    this.acknowleged = acknowleged;
    this.deletedCount = deletedCount;

    this.toReplString = () => {
      return JSON.parse(JSON.stringify(this));
    };

    this.shellApiType = () => {
      return 'DeleteResult';
    };
    this.help = () => new Help({'help': 'The DeleteResult class.'});
  }
}
class InsertManyResult {
  constructor(acknowleged, insertedIds) {
    this.acknowleged = acknowleged;
    this.insertedIds = insertedIds;

    this.toReplString = () => {
      return JSON.parse(JSON.stringify(this));
    };

    this.shellApiType = () => {
      return 'InsertManyResult';
    };
    this.help = () => new Help({'help': 'The InsertManyResult class.'});
  }
}
class InsertOneResult {
  constructor(acknowleged, insertedId) {
    this.acknowleged = acknowleged;
    this.insertedId = insertedId;

    this.toReplString = () => {
      return JSON.parse(JSON.stringify(this));
    };

    this.shellApiType = () => {
      return 'InsertOneResult';
    };
    this.help = () => new Help({'help': 'The InsertManyResult class.'});
  }
}
class ReplicaSet {
  constructor(_mapper) {
    this._mapper = _mapper;

    this.toReplString = () => {
      return JSON.parse(JSON.stringify(this));
    };

    this.shellApiType = () => {
      return 'ReplicaSet';
    };
    this.help = () => new Help({'help': 'shell-api.replica-set.description'});
  }
}
class Shard {
  constructor(_mapper) {
    this._mapper = _mapper;

    this.toReplString = () => {
      return JSON.parse(JSON.stringify(this));
    };

    this.shellApiType = () => {
      return 'Shard';
    };
    this.help = () => new Help({'help': 'shell-api.shard.description'});
  }
}
class ShellApi {
  constructor(_mapper) {
    this._mapper = _mapper;

    this.toReplString = () => {
      return JSON.parse(JSON.stringify(this));
    };

    this.shellApiType = () => {
      return 'ShellApi';
    };
    this.help = () => new Help({'help': 'shell-api.help', 'docs': 'https://docs.mongodb.com/manual/reference/mongo-shell/#command-helpers', 'attr': [{'name': 'use', 'description': 'Set current database'}, {'name': 'it', 'description': 'Result of the last line evaluated; use to further iterate'}, {'name': '.exit', 'description': 'Quit the mongo shell'}, {'name': 'db.help()', 'description': 'Help on db methods'}, {'name': 'db.mycoll.help()', 'description': 'Help on collection methods'}, {'name': 'sh.help()', 'description': 'Sharding helpers'}, {'name': 'rs.help()', 'description': 'Replica set helpers'}, {'name': 'help admin', 'description': 'Administrative help'}]});
    this.use = function() {
      return this._mapper.use(this, ...arguments);
    };
    this.use.help = () => new Help({'help': '!! No help defined for this method'});
    this.use.serverVersions = ['0.0.0', '4.4.0'];
    this.use.topologies = [0, 1, 2];
    this.use.returnsPromise = false;
    this.use.returnType = 'Unknown';
    this.it = function() {
      return this._mapper.it(this, ...arguments);
    };
    this.it.help = () => new Help({'help': '!! No help defined for this method'});
    this.it.serverVersions = ['0.0.0', '4.4.0'];
    this.it.topologies = [0, 1, 2];
    this.it.returnsPromise = false;
    this.it.returnType = 'Unknown';
  }
}
class UpdateResult {
  constructor(acknowleged, matchedCount, modifiedCount, upsertedCount, insertedId) {
    this.acknowleged = acknowleged;
    this.matchedCount = matchedCount;
    this.modifiedCount = modifiedCount;
    this.upsertedCount = upsertedCount;
    this.insertedId = insertedId;

    this.toReplString = () => {
      return JSON.parse(JSON.stringify(this));
    };

    this.shellApiType = () => {
      return 'UpdateResult';
    };
    this.help = () => new Help({'help': 'The UpdateResult class.'});
  }
}

const ReadPreference = Object.freeze({
  'PRIMARY': 0,
  'PRIMARY_PREFERRED': 1,
  'SECONDARY': 2,
  'SECONDARY_PREFERRED': 3,
  'NEAREST': 4
});
const DBQuery = Object.freeze({
  'Option': {
    'tailable': 2,
    'slaveOk': 4,
    'oplogReplay': 8,
    'noTimeout': 16,
    'awaitData': 32,
    'exhaust': 64,
    'partial': 128
  }
});
const ServerVersions = Object.freeze({
  'latest': '4.4.0',
  'earliest': '0.0.0'
});
const Topologies = Object.freeze({
  'ReplSet': 0,
  'Standalone': 1,
  'Shard': 2
});

export default ShellApi;
export { AggregationCursor };
export { BulkWriteResult };
export { Collection };
export { Cursor };
export { Database };
export { DeleteResult };
export { InsertManyResult };
export { InsertOneResult };
export { ReplicaSet };
export { Shard };
export { ShellApi };
export { UpdateResult };
export { ReadPreference };
export { DBQuery };
export { ServerVersions };
export { Topologies };
