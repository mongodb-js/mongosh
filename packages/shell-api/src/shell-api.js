/* AUTO-GENERATED SHELL API CLASSES*/
import { Help } from './help';


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
    this.help = () => new Help({ 'help': 'shell-api.aggregation-cursor.description', 'docs': 'https://docs.mongodb.com/manual/reference/operator/aggregation-pipeline', 'attr': [{ 'name': 'close', 'description': 'shell-api.aggregation-cursor.help.close' }, { 'name': 'forEeach', 'description': 'shell-api.aggregation-cursor.help.for-each' }, { 'name': 'hasNext', 'description': 'shell-api.aggregation-cursor.help.has-next' }, { 'name': 'isClosed', 'description': 'shell-api.aggregation-cursor.help.isClosed' }, { 'name': 'isExhausted', 'description': 'shell-api.aggregation-cursor.help.isExhausted' }, { 'name': 'itcount', 'description': 'shell-api.aggregation-cursor.help.itcount' }, { 'name': 'map', 'description': 'shell-api.aggregation-cursor.help.map' }, { 'name': 'next', 'description': 'shell-api.aggregation-cursor.help.next' }, { 'name': 'objsLeftInBatch', 'description': 'shell-api.aggregation-cursor.help.objs-left-in-batch' }, { 'name': 'toArray', 'description': 'shell-api.aggregation-cursor.help.to-array' }] });
  }

  bsonsize(...args) {
    return this._cursor.bsonsize(...args);
  }

  close(...args) {
    return this._cursor.close(...args);
  }

  forEach(...args) {
    return this._cursor.forEach(...args);
  }

  hasNext(...args) {
    return this._cursor.hasNext(...args);
  }

  isClosed(...args) {
    return this._cursor.isClosed(...args);
  }

  isExhausted(...args) {
    return this._cursor.isExhausted(...args);
  }

  itcount(...args) {
    return this._cursor.itcount(...args);
  }

  map(...args) {
    return this._cursor.map(...args);
  }

  next(...args) {
    return this._cursor.next(...args);
  }

  objsLeftInBatch(...args) {
    return this._cursor.objsLeftInBatch(...args);
  }

  toArray(...args) {
    return this._cursor.toArray(...args);
  }
}


AggregationCursor.prototype.bsonsize.help = () => new Help({ 'help': '!! No help defined for this method' });
AggregationCursor.prototype.bsonsize.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.bsonsize.topologies = [0, 1, 2];
AggregationCursor.prototype.bsonsize.returnsPromise = false;
AggregationCursor.prototype.bsonsize.returnType = 'Unknown';

AggregationCursor.prototype.close.help = () => new Help({ 'help': 'shell-api.aggregation-cursor.help.close' });
AggregationCursor.prototype.close.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.close.topologies = [0, 1, 2];
AggregationCursor.prototype.close.returnsPromise = false;
AggregationCursor.prototype.close.returnType = 'Unknown';

AggregationCursor.prototype.forEach.help = () => new Help({ 'help': 'shell-api.aggregation-cursor.help.for-each' });
AggregationCursor.prototype.forEach.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.forEach.topologies = [0, 1, 2];
AggregationCursor.prototype.forEach.returnsPromise = false;
AggregationCursor.prototype.forEach.returnType = 'Unknown';

AggregationCursor.prototype.hasNext.help = () => new Help({ 'help': 'shell-api.aggregation-cursor.help.has-next' });
AggregationCursor.prototype.hasNext.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.hasNext.topologies = [0, 1, 2];
AggregationCursor.prototype.hasNext.returnsPromise = false;
AggregationCursor.prototype.hasNext.returnType = 'Unknown';

AggregationCursor.prototype.isClosed.help = () => new Help({ 'help': 'shell-api.aggregation-cursor.help.is-closed' });
AggregationCursor.prototype.isClosed.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.isClosed.topologies = [0, 1, 2];
AggregationCursor.prototype.isClosed.returnsPromise = false;
AggregationCursor.prototype.isClosed.returnType = 'Unknown';

AggregationCursor.prototype.isExhausted.help = () => new Help({ 'help': 'shell-api.aggregation-cursor.help.is-exhausted' });
AggregationCursor.prototype.isExhausted.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.isExhausted.topologies = [0, 1, 2];
AggregationCursor.prototype.isExhausted.returnsPromise = false;
AggregationCursor.prototype.isExhausted.returnType = 'Unknown';

AggregationCursor.prototype.itcount.help = () => new Help({ 'help': 'shell-api.aggregation-cursor.help.itcount' });
AggregationCursor.prototype.itcount.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.itcount.topologies = [0, 1, 2];
AggregationCursor.prototype.itcount.returnsPromise = false;
AggregationCursor.prototype.itcount.returnType = 'Unknown';

AggregationCursor.prototype.map.help = () => new Help({ 'help': 'shell-api.aggregation-cursor.help.map' });
AggregationCursor.prototype.map.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.map.topologies = [0, 1, 2];
AggregationCursor.prototype.map.returnsPromise = false;
AggregationCursor.prototype.map.returnType = 'Unknown';

AggregationCursor.prototype.next.help = () => new Help({ 'help': 'shell-api.aggregation-cursor.help.next' });
AggregationCursor.prototype.next.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.next.topologies = [0, 1, 2];
AggregationCursor.prototype.next.returnsPromise = false;
AggregationCursor.prototype.next.returnType = 'Unknown';

AggregationCursor.prototype.objsLeftInBatch.help = () => new Help({ 'help': 'shell-api.aggregation-cursor.help.objs-left-in-batch' });
AggregationCursor.prototype.objsLeftInBatch.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.objsLeftInBatch.topologies = [0, 1, 2];
AggregationCursor.prototype.objsLeftInBatch.returnsPromise = false;
AggregationCursor.prototype.objsLeftInBatch.returnType = 'Unknown';

AggregationCursor.prototype.toArray.help = () => new Help({ 'help': 'shell-api.aggregation-cursor.help.to-array' });
AggregationCursor.prototype.toArray.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.toArray.topologies = [0, 1, 2];
AggregationCursor.prototype.toArray.returnsPromise = false;
AggregationCursor.prototype.toArray.returnType = 'Unknown';


class BulkWriteResult {
  constructor(ackowledged, insertedCount, insertedIds, matchedCount, modifiedCount, deletedCount, upsertedCount, upsertedIds) {
    this.ackowledged = ackowledged;
    this.insertedCount = insertedCount;
    this.insertedIds = insertedIds;
    this.matchedCount = matchedCount;
    this.modifiedCount = modifiedCount;
    this.deletedCount = deletedCount;
    this.upsertedCount = upsertedCount;
    this.upsertedIds = upsertedIds;

    this.toReplString = () => {
      return JSON.parse(JSON.stringify(this));
    };

    this.shellApiType = () => {
      return 'BulkWriteResult';
    };
    this.help = () => new Help({ 'help': 'shell-api.bulk-write-result.description' });
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
    this.help = () => new Help({ 'help': 'shell-api.collection.description', 'docs': 'https://docs.mongodb.com/manual/reference/method/js-collection', 'attr': [{ 'name': 'aggregate', 'description': 'shell-api.collection.help.aggregate.description' }, { 'name': 'bulkWrite', 'description': 'shell-api.collection.help.bulk-write.description' }, { 'name': 'countDocuments', 'description': 'shell-api.collection.help.count-documents.description' }, { 'name': 'count', 'description': 'shell-api.collection.help.count.description' }, { 'name': 'deleteMany', 'description': 'shell-api.collection.help.delete-many.description' }, { 'name': 'deleteOne', 'description': 'shell-api.collection.help.delete-one.description' }, { 'name': 'distinct', 'description': 'shell-api.collection.help.distinct.description' }, { 'name': 'estimatedDocumentCount', 'description': 'shell-api.collection.help.estimated-document-coun.descriptiont' }, { 'name': 'find', 'description': 'shell-api.collection.help.find.description' }, { 'name': 'findAndModify', 'description': 'shell-api.collection.help.find-and-modify.description' }, { 'name': 'findOne', 'description': 'shell-api.collection.help.find-one.description' }, { 'name': 'findOneAndDelete', 'description': 'shell-api.collection.help.find-one-and-delete.description' }, { 'name': 'findOneAndReplace', 'description': 'shell-api.collection.help.find-one-and-replace.description' }, { 'name': 'findOneAndUpdate', 'description': 'shell-api.collection.help.find-one-and-update.description' }, { 'name': 'insert', 'description': 'shell-api.collection.help.insert.description' }, { 'name': 'insertMany', 'description': 'shell-api.collection.help.insert-many.description' }, { 'name': 'insertOne', 'description': 'shell-api.collection.help.insert-one.description' }, { 'name': 'isCapped', 'description': 'shell-api.collection.help.is-capped.description' }, { 'name': 'remove', 'description': 'shell-api.collection.help.remove.description' }, { 'name': 'save', 'description': 'shell-api.collection.help.save.description' }, { 'name': 'replaceOne', 'description': 'shell-api.collection.help.replace-one.description' }, { 'name': 'update', 'description': 'shell-api.collection.help.update.description' }, { 'name': 'updateMany', 'description': 'shell-api.collection.help.update-many.description' }, { 'name': 'updateOne', 'description': 'shell-api.collection.help.update-one.description' }] });
  }

  aggregate(...args) {
    return this._mapper.aggregate(this, ...args);
  }

  bulkWrite(...args) {
    return this._mapper.bulkWrite(this, ...args);
  }

  countDocuments(...args) {
    return this._mapper.countDocuments(this, ...args);
  }

  count(...args) {
    return this._mapper.count(this, ...args);
  }

  deleteMany(...args) {
    return this._mapper.deleteMany(this, ...args);
  }

  deleteOne(...args) {
    return this._mapper.deleteOne(this, ...args);
  }

  distinct(...args) {
    return this._mapper.distinct(this, ...args);
  }

  estimatedDocumentCount(...args) {
    return this._mapper.estimatedDocumentCount(this, ...args);
  }

  find(...args) {
    return this._mapper.find(this, ...args);
  }

  findAndModify(...args) {
    return this._mapper.findAndModify(this, ...args);
  }

  findOne(...args) {
    return this._mapper.findOne(this, ...args);
  }

  findOneAndDelete(...args) {
    return this._mapper.findOneAndDelete(this, ...args);
  }

  findOneAndReplace(...args) {
    return this._mapper.findOneAndReplace(this, ...args);
  }

  findOneAndUpdate(...args) {
    return this._mapper.findOneAndUpdate(this, ...args);
  }

  insert(...args) {
    return this._mapper.insert(this, ...args);
  }

  insertMany(...args) {
    return this._mapper.insertMany(this, ...args);
  }

  insertOne(...args) {
    return this._mapper.insertOne(this, ...args);
  }

  isCapped(...args) {
    return this._mapper.isCapped(this, ...args);
  }

  remove(...args) {
    return this._mapper.remove(this, ...args);
  }

  save(...args) {
    return this._mapper.save(this, ...args);
  }

  replaceOne(...args) {
    return this._mapper.replaceOne(this, ...args);
  }

  update(...args) {
    return this._mapper.update(this, ...args);
  }

  updateMany(...args) {
    return this._mapper.updateMany(this, ...args);
  }

  updateOne(...args) {
    return this._mapper.updateOne(this, ...args);
  }
}


Collection.prototype.aggregate.help = () => new Help({ 'help': 'shell-api.collection.help.aggregate' });
Collection.prototype.aggregate.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.aggregate.topologies = [0, 1, 2];
Collection.prototype.aggregate.returnsPromise = false;
Collection.prototype.aggregate.returnType = 'AggregationCursor';

Collection.prototype.bulkWrite.help = () => new Help({ 'help': 'shell-api.collection.help.bulk-write' });
Collection.prototype.bulkWrite.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.bulkWrite.topologies = [0, 1, 2];
Collection.prototype.bulkWrite.returnsPromise = true;
Collection.prototype.bulkWrite.returnType = 'Unknown';

Collection.prototype.countDocuments.help = () => new Help({ 'help': 'shell-api.collection.help.count-documents' });
Collection.prototype.countDocuments.serverVersions = ['4.0.3', '4.4.0'];
Collection.prototype.countDocuments.topologies = [0, 1, 2];
Collection.prototype.countDocuments.returnsPromise = true;
Collection.prototype.countDocuments.returnType = 'Unknown';

Collection.prototype.count.help = () => new Help({ 'help': 'shell-api.collection.help.count' });
Collection.prototype.count.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.count.topologies = [0, 1, 2];
Collection.prototype.count.returnsPromise = true;
Collection.prototype.count.returnType = 'Unknown';

Collection.prototype.deleteMany.help = () => new Help({ 'help': 'shell-api.collection.help.delete-many' });
Collection.prototype.deleteMany.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.deleteMany.topologies = [0, 1, 2];
Collection.prototype.deleteMany.returnsPromise = true;
Collection.prototype.deleteMany.returnType = 'Unknown';

Collection.prototype.deleteOne.help = () => new Help({ 'help': 'shell-api.collection.help.delete-one' });
Collection.prototype.deleteOne.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.deleteOne.topologies = [0, 1, 2];
Collection.prototype.deleteOne.returnsPromise = true;
Collection.prototype.deleteOne.returnType = 'Unknown';

Collection.prototype.distinct.help = () => new Help({ 'help': 'shell-api.collection.help.distinct' });
Collection.prototype.distinct.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.distinct.topologies = [0, 1, 2];
Collection.prototype.distinct.returnsPromise = false;
Collection.prototype.distinct.returnType = 'Cursor';

Collection.prototype.estimatedDocumentCount.help = () => new Help({ 'help': 'shell-api.collection.help.estimated-document-count' });
Collection.prototype.estimatedDocumentCount.serverVersions = ['4.0.3', '4.4.0'];
Collection.prototype.estimatedDocumentCount.topologies = [0, 1, 2];
Collection.prototype.estimatedDocumentCount.returnsPromise = true;
Collection.prototype.estimatedDocumentCount.returnType = 'Unknown';

Collection.prototype.find.help = () => new Help({ 'help': 'shell-api.collection.help.find' });
Collection.prototype.find.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.find.topologies = [0, 1, 2];
Collection.prototype.find.returnsPromise = false;
Collection.prototype.find.returnType = 'Cursor';

Collection.prototype.findAndModify.help = () => new Help({ 'help': 'shell-api.collection.help.find-and-modify' });
Collection.prototype.findAndModify.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.findAndModify.topologies = [0, 1, 2];
Collection.prototype.findAndModify.returnsPromise = false;
Collection.prototype.findAndModify.returnType = 'Unknown';

Collection.prototype.findOne.help = () => new Help({ 'help': 'shell-api.collection.help.find-one' });
Collection.prototype.findOne.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.findOne.topologies = [0, 1, 2];
Collection.prototype.findOne.returnsPromise = false;
Collection.prototype.findOne.returnType = 'Unknown';

Collection.prototype.findOneAndDelete.help = () => new Help({ 'help': 'shell-api.collection.help.find-one-and-delete' });
Collection.prototype.findOneAndDelete.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.findOneAndDelete.topologies = [0, 1, 2];
Collection.prototype.findOneAndDelete.returnsPromise = true;
Collection.prototype.findOneAndDelete.returnType = 'Unknown';

Collection.prototype.findOneAndReplace.help = () => new Help({ 'help': 'shell-api.collection.help.find-one-and-replace' });
Collection.prototype.findOneAndReplace.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.findOneAndReplace.topologies = [0, 1, 2];
Collection.prototype.findOneAndReplace.returnsPromise = true;
Collection.prototype.findOneAndReplace.returnType = 'Unknown';

Collection.prototype.findOneAndUpdate.help = () => new Help({ 'help': 'shell-api-collection.help.find-one-and-update' });
Collection.prototype.findOneAndUpdate.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.findOneAndUpdate.topologies = [0, 1, 2];
Collection.prototype.findOneAndUpdate.returnsPromise = true;
Collection.prototype.findOneAndUpdate.returnType = 'Unknown';

Collection.prototype.insert.help = () => new Help({ 'help': 'shell-api.collection.help.insert' });
Collection.prototype.insert.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.insert.topologies = [0, 1, 2];
Collection.prototype.insert.returnsPromise = true;
Collection.prototype.insert.returnType = 'Unknown';

Collection.prototype.insertMany.help = () => new Help({ 'help': 'shell-api.collection.help.insert-many' });
Collection.prototype.insertMany.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.insertMany.topologies = [0, 1, 2];
Collection.prototype.insertMany.returnsPromise = true;
Collection.prototype.insertMany.returnType = 'Unknown';

Collection.prototype.insertOne.help = () => new Help({ 'help': 'shell-api.collection.help.insert-one' });
Collection.prototype.insertOne.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.insertOne.topologies = [0, 1, 2];
Collection.prototype.insertOne.returnsPromise = true;
Collection.prototype.insertOne.returnType = 'Unknown';

Collection.prototype.isCapped.help = () => new Help({ 'help': 'shell-api.collection.help.is-capped' });
Collection.prototype.isCapped.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.isCapped.topologies = [0, 1, 2];
Collection.prototype.isCapped.returnsPromise = true;
Collection.prototype.isCapped.returnType = 'Unknown';

Collection.prototype.remove.help = () => new Help({ 'help': 'shell-api.collection.help.remove' });
Collection.prototype.remove.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.remove.topologies = [0, 1, 2];
Collection.prototype.remove.returnsPromise = true;
Collection.prototype.remove.returnType = 'Unknown';

Collection.prototype.save.help = () => new Help({ 'help': 'shell-api.collection.help.save' });
Collection.prototype.save.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.save.topologies = [0, 1, 2];
Collection.prototype.save.returnsPromise = true;
Collection.prototype.save.returnType = 'Unknown';

Collection.prototype.replaceOne.help = () => new Help({ 'help': 'shell-api.collection.help.replace-one' });
Collection.prototype.replaceOne.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.replaceOne.topologies = [0, 1, 2];
Collection.prototype.replaceOne.returnsPromise = true;
Collection.prototype.replaceOne.returnType = 'Unknown';

Collection.prototype.update.help = () => new Help({ 'help': 'shell-api.collection.help.update' });
Collection.prototype.update.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.update.topologies = [0, 1, 2];
Collection.prototype.update.returnsPromise = true;
Collection.prototype.update.returnType = 'Unknown';

Collection.prototype.updateMany.help = () => new Help({ 'help': 'shell-api.collection.help.update-many' });
Collection.prototype.updateMany.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.updateMany.topologies = [0, 1, 2];
Collection.prototype.updateMany.returnsPromise = true;
Collection.prototype.updateMany.returnType = 'Unknown';

Collection.prototype.updateOne.help = () => new Help({ 'help': 'shell-api.collection.help.update-one' });
Collection.prototype.updateOne.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.updateOne.topologies = [0, 1, 2];
Collection.prototype.updateOne.returnsPromise = true;
Collection.prototype.updateOne.returnType = 'Unknown';


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
    this.help = () => new Help({ 'help': 'shell-api.cursor.description', 'docs': 'https://docs.mongodb.com/manual/reference/method/js-cursor', 'attr': [{ 'name': 'addOption', 'description': 'shell-api.cursor.help.add-option' }, { 'name': 'allowPartialResults', 'description': 'shell-api.cursor.help.allow-partial-results' }, { 'name': 'arrayAccess', 'description': 'shell-api.cursor.help.array-access' }, { 'name': 'batchSize', 'description': 'shell-api.cursor.help.batch-size' }, { 'name': 'clone', 'description': 'shell-api.cursor.help.clone' }, { 'name': 'close', 'description': 'shell-api.cursor.help.close' }, { 'name': 'collation', 'description': 'shell-api.cursor.help.collation' }, { 'name': 'comment', 'description': 'shell-api.cursor.help.comment' }, { 'name': 'count', 'description': 'shell-api.cursor.help.count' }, { 'name': 'explain', 'description': 'shell-api.cursor.help.explain' }, { 'name': 'forEach', 'description': 'shell-api.cursor.help.for-each' }, { 'name': 'getQueryPlan', 'description': 'shell-api.cursor.help.get-query-plan' }, { 'name': 'hasNext', 'description': 'shell-api.cursor.help.has-next' }, { 'name': 'hint', 'description': 'shell-api.cursor.help.hint' }, { 'name': 'isClosed', 'description': 'shell-api.cursor.help.is-closed' }, { 'name': 'isExhausted', 'description': 'shell-api.cursor.help.is-exhausted' }, { 'name': 'itcount', 'description': 'shell-api.cursor.help.itcount' }, { 'name': 'length', 'description': 'shell-api.cursor.help.length' }, { 'name': 'limit', 'description': 'shell-api.cursor.help.limit' }, { 'name': 'map', 'description': 'shell-api.cursor.help.map' }, { 'name': 'max', 'description': 'shell-api.cursor.help.max' }, { 'name': 'maxScan', 'description': 'shell-api.cursor.help.max-scan' }, { 'name': 'maxTimeMS', 'description': 'shell-api.cursor.help.max-time-ms' }, { 'name': 'min', 'description': 'shell-api.cursor.help.min' }, { 'name': 'modifiers', 'description': 'shell-api.cursor.help.modifiers' }, { 'name': 'next', 'description': 'shell-api.cursor.help.next' }, { 'name': 'noCursorTimeout', 'description': 'shell-api.cursor.help.no-cursor-timeout' }, { 'name': 'objsLeftInBatch', 'description': 'shell-api.cursor.help.objs-left-in-batch' }, { 'name': 'oplog', 'description': 'shell-api.cursor.help.oplog-replay' }, { 'name': 'projection', 'description': 'shell-api.cursor.help.projection' }, { 'name': 'pretty', 'description': 'shell-api.cursor.help.pretty' }, { 'name': 'readConcern', 'description': 'shell-api.cursor.help.read-concern' }, { 'name': 'readOnly', 'description': 'shell-api.cursor.help.read-only' }, { 'name': 'readPref', 'description': 'shell-api.cursor.help.read-pref' }, { 'name': 'returnKey', 'description': 'shell-api.cursor.help.return-key' }, { 'name': 'showDiskLoc', 'description': 'shell-api.cursor.help.show-disk-loc' }, { 'name': 'showRecordId', 'description': 'shell-api.cursor.help.show-record-id' }, { 'name': 'size', 'description': 'shell-api.cursor.help.size' }, { 'name': 'skip', 'description': 'shell-api.cursor.help.skip' }, { 'name': 'snapshot', 'description': 'shell-api.cursor.help.snapshot' }, { 'name': 'sort', 'description': 'shell-api.cursor.help.sort' }, { 'name': 'tailable', 'description': 'shell-api.cursor.help.tailable' }, { 'name': 'toArray', 'description': 'shell-api.cursor.help.to-array' }] });
  }

  addOption(...args) {
    return this._cursor.addOption(...args);
  }

  allowPartialResults(...args) {
    return this._cursor.allowPartialResults(...args);
  }

  arrayAccess(...args) {
    return this._cursor.arrayAccess(...args);
  }

  batchSize(...args) {
    return this._cursor.batchSize(...args);
  }

  clone(...args) {
    return this._cursor.clone(...args);
  }

  close(...args) {
    return this._cursor.close(...args);
  }

  collation(...args) {
    return this._cursor.collation(...args);
  }

  comment(...args) {
    return this._cursor.comment(...args);
  }

  count(...args) {
    return this._cursor.count(...args);
  }

  explain(...args) {
    return this._cursor.explain(...args);
  }

  forEach(...args) {
    return this._cursor.forEach(...args);
  }

  getQueryPlan(...args) {
    return this._cursor.getQueryPlan(...args);
  }

  hasNext(...args) {
    return this._cursor.hasNext(...args);
  }

  hint(...args) {
    return this._cursor.hint(...args);
  }

  isClosed(...args) {
    return this._cursor.isClosed(...args);
  }

  isExhausted(...args) {
    return this._cursor.isExhausted(...args);
  }

  itcount(...args) {
    return this._cursor.itcount(...args);
  }

  length(...args) {
    return this._cursor.length(...args);
  }

  limit(...args) {
    this._cursor.limit(...args);
    return this;
  }

  map(...args) {
    return this._cursor.map(...args);
  }

  max(...args) {
    return this._cursor.max(...args);
  }

  maxScan(...args) {
    return this._cursor.maxScan(...args);
  }

  maxTimeMS(...args) {
    return this._cursor.maxTimeMS(...args);
  }

  min(...args) {
    return this._cursor.min(...args);
  }

  modifiers(...args) {
    return this._cursor.modifiers(...args);
  }

  next(...args) {
    return this._cursor.next(...args);
  }

  noCursorTimeout(...args) {
    return this._cursor.noCursorTimeout(...args);
  }

  objsLeftInBatch(...args) {
    return this._cursor.objsLeftInBatch(...args);
  }

  oplogReplay(...args) {
    return this._cursor.oplogReplay(...args);
  }

  projection(...args) {
    return this._cursor.projection(...args);
  }

  pretty(...args) {
    return this._cursor.pretty(...args);
  }

  readConcern(...args) {
    return this._cursor.readConcern(...args);
  }

  readOnly(...args) {
    return this._cursor.readOnly(...args);
  }

  readPref(...args) {
    return this._cursor.readPref(...args);
  }

  returnKey(...args) {
    return this._cursor.returnKey(...args);
  }

  showDiskLoc(...args) {
    return this._cursor.showDiskLoc(...args);
  }

  showRecordId(...args) {
    return this._cursor.showRecordId(...args);
  }

  size(...args) {
    return this._cursor.size(...args);
  }

  skip(...args) {
    this._cursor.skip(...args);
    return this;
  }

  snapshot(...args) {
    return this._cursor.snapshot(...args);
  }

  sort(...args) {
    return this._cursor.sort(...args);
  }

  tailable(...args) {
    return this._cursor.tailable(...args);
  }

  toArray(...args) {
    return this._cursor.toArray(...args);
  }
}


Cursor.prototype.addOption.help = () => new Help({ 'help': 'shell-api.cursor.help.add-option' });
Cursor.prototype.addOption.serverVersions = ['0.0.0', '3.2.0'];
Cursor.prototype.addOption.topologies = [0, 1, 2];
Cursor.prototype.addOption.returnsPromise = false;
Cursor.prototype.addOption.returnType = 'Unknown';

Cursor.prototype.allowPartialResults.help = () => new Help({ 'help': 'shell-api.cursor.help.allow-partial-results' });
Cursor.prototype.allowPartialResults.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.allowPartialResults.topologies = [0, 1, 2];
Cursor.prototype.allowPartialResults.returnsPromise = false;
Cursor.prototype.allowPartialResults.returnType = 'Unknown';

Cursor.prototype.arrayAccess.help = () => new Help({ 'help': '!! No help defined for this method' });
Cursor.prototype.arrayAccess.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.arrayAccess.topologies = [0, 1, 2];
Cursor.prototype.arrayAccess.returnsPromise = false;
Cursor.prototype.arrayAccess.returnType = 'Unknown';

Cursor.prototype.batchSize.help = () => new Help({ 'help': 'shell-api.cursor.help.batch-size' });
Cursor.prototype.batchSize.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.batchSize.topologies = [0, 1, 2];
Cursor.prototype.batchSize.returnsPromise = false;
Cursor.prototype.batchSize.returnType = 'Unknown';

Cursor.prototype.clone.help = () => new Help({ 'help': 'shell-api.cursor.help.clone' });
Cursor.prototype.clone.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.clone.topologies = [0, 1, 2];
Cursor.prototype.clone.returnsPromise = false;
Cursor.prototype.clone.returnType = 'Unknown';

Cursor.prototype.close.help = () => new Help({ 'help': 'shell-api.cursor.help.close' });
Cursor.prototype.close.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.close.topologies = [0, 1, 2];
Cursor.prototype.close.returnsPromise = false;
Cursor.prototype.close.returnType = 'Unknown';

Cursor.prototype.collation.help = () => new Help({ 'help': 'shell-api.cursor.help.collation' });
Cursor.prototype.collation.serverVersions = ['3.4.0', '4.4.0'];
Cursor.prototype.collation.topologies = [0, 1, 2];
Cursor.prototype.collation.returnsPromise = false;
Cursor.prototype.collation.returnType = 'Unknown';

Cursor.prototype.comment.help = () => new Help({ 'help': 'shell-api.cursor.help.comment' });
Cursor.prototype.comment.serverVersions = ['3.2.0', '4.4.0'];
Cursor.prototype.comment.topologies = [0, 1, 2];
Cursor.prototype.comment.returnsPromise = false;
Cursor.prototype.comment.returnType = 'Unknown';

Cursor.prototype.count.help = () => new Help({ 'help': 'shell-api.cursor.help.count' });
Cursor.prototype.count.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.count.topologies = [0, 1, 2];
Cursor.prototype.count.returnsPromise = false;
Cursor.prototype.count.returnType = 'Unknown';
Cursor.prototype.count.serverVersion = ['0.0.0', '4.0.0'];

Cursor.prototype.explain.help = () => new Help({ 'help': 'shell-api.cursor.help.explain' });
Cursor.prototype.explain.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.explain.topologies = [0, 1, 2];
Cursor.prototype.explain.returnsPromise = false;
Cursor.prototype.explain.returnType = 'Unknown';

Cursor.prototype.forEach.help = () => new Help({ 'help': 'shell-api.cursor.help.for-each' });
Cursor.prototype.forEach.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.forEach.topologies = [0, 1, 2];
Cursor.prototype.forEach.returnsPromise = false;
Cursor.prototype.forEach.returnType = 'Unknown';

Cursor.prototype.getQueryPlan.help = () => new Help({ 'help': 'shell-api.cursor.help.get-query-plan' });
Cursor.prototype.getQueryPlan.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.getQueryPlan.topologies = [0, 1, 2];
Cursor.prototype.getQueryPlan.returnsPromise = false;
Cursor.prototype.getQueryPlan.returnType = 'Unknown';

Cursor.prototype.hasNext.help = () => new Help({ 'help': 'shell-api.cursor.help.has-next' });
Cursor.prototype.hasNext.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.hasNext.topologies = [0, 1, 2];
Cursor.prototype.hasNext.returnsPromise = false;
Cursor.prototype.hasNext.returnType = 'Unknown';

Cursor.prototype.hint.help = () => new Help({ 'help': 'shell-api.cursor.help.hint' });
Cursor.prototype.hint.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.hint.topologies = [0, 1, 2];
Cursor.prototype.hint.returnsPromise = false;
Cursor.prototype.hint.returnType = 'Unknown';

Cursor.prototype.isClosed.help = () => new Help({ 'help': 'shell-api.cursor.help.is-closed' });
Cursor.prototype.isClosed.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.isClosed.topologies = [0, 1, 2];
Cursor.prototype.isClosed.returnsPromise = false;
Cursor.prototype.isClosed.returnType = 'Unknown';

Cursor.prototype.isExhausted.help = () => new Help({ 'help': 'shell-api.cursor.help.is-exhausted' });
Cursor.prototype.isExhausted.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.isExhausted.topologies = [0, 1, 2];
Cursor.prototype.isExhausted.returnsPromise = false;
Cursor.prototype.isExhausted.returnType = 'Unknown';

Cursor.prototype.itcount.help = () => new Help({ 'help': 'shell-api.cursor.help.itcount' });
Cursor.prototype.itcount.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.itcount.topologies = [0, 1, 2];
Cursor.prototype.itcount.returnsPromise = false;
Cursor.prototype.itcount.returnType = 'Unknown';

Cursor.prototype.length.help = () => new Help({ 'help': 'shell-api.cursor.help.length' });
Cursor.prototype.length.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.length.topologies = [0, 1, 2];
Cursor.prototype.length.returnsPromise = false;
Cursor.prototype.length.returnType = 'Unknown';

Cursor.prototype.limit.help = () => new Help({ 'help': 'shell-api.cursor.help.limit' });
Cursor.prototype.limit.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.limit.topologies = [0, 1, 2];
Cursor.prototype.limit.returnsPromise = false;
Cursor.prototype.limit.returnType = 'Unknown';

Cursor.prototype.map.help = () => new Help({ 'help': 'shell-api.cursor.help.map' });
Cursor.prototype.map.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.map.topologies = [0, 1, 2];
Cursor.prototype.map.returnsPromise = false;
Cursor.prototype.map.returnType = 'Unknown';

Cursor.prototype.max.help = () => new Help({ 'help': 'shell-api.cursor.help.max' });
Cursor.prototype.max.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.max.topologies = [0, 1, 2];
Cursor.prototype.max.returnsPromise = false;
Cursor.prototype.max.returnType = 'Unknown';

Cursor.prototype.maxScan.help = () => new Help({ 'help': 'shell-api.cursor.help.max-scan' });
Cursor.prototype.maxScan.serverVersions = ['0.0.0', '4.0.0'];
Cursor.prototype.maxScan.topologies = [0, 1, 2];
Cursor.prototype.maxScan.returnsPromise = false;
Cursor.prototype.maxScan.returnType = 'Unknown';

Cursor.prototype.maxTimeMS.help = () => new Help({ 'help': 'shell-api.cursor.help.max-time-ms' });
Cursor.prototype.maxTimeMS.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.maxTimeMS.topologies = [0, 1, 2];
Cursor.prototype.maxTimeMS.returnsPromise = false;
Cursor.prototype.maxTimeMS.returnType = 'Unknown';

Cursor.prototype.min.help = () => new Help({ 'help': 'shell-api.cursor.help.min' });
Cursor.prototype.min.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.min.topologies = [0, 1, 2];
Cursor.prototype.min.returnsPromise = false;
Cursor.prototype.min.returnType = 'Unknown';

Cursor.prototype.modifiers.help = () => new Help({ 'help': 'shell-api.cursor.help.modifiers' });
Cursor.prototype.modifiers.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.modifiers.topologies = [0, 1, 2];
Cursor.prototype.modifiers.returnsPromise = false;
Cursor.prototype.modifiers.returnType = 'Unknown';

Cursor.prototype.next.help = () => new Help({ 'help': 'shell-api.cursor.help.next' });
Cursor.prototype.next.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.next.topologies = [0, 1, 2];
Cursor.prototype.next.returnsPromise = false;
Cursor.prototype.next.returnType = 'Unknown';

Cursor.prototype.noCursorTimeout.help = () => new Help({ 'help': 'shell-api.cursor.help.no-cursor-timeout' });
Cursor.prototype.noCursorTimeout.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.noCursorTimeout.topologies = [0, 1, 2];
Cursor.prototype.noCursorTimeout.returnsPromise = false;
Cursor.prototype.noCursorTimeout.returnType = 'Unknown';

Cursor.prototype.objsLeftInBatch.help = () => new Help({ 'help': 'shell-api.cursor.help.objs-left-in-batch' });
Cursor.prototype.objsLeftInBatch.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.objsLeftInBatch.topologies = [0, 1, 2];
Cursor.prototype.objsLeftInBatch.returnsPromise = false;
Cursor.prototype.objsLeftInBatch.returnType = 'Unknown';

Cursor.prototype.oplogReplay.help = () => new Help({ 'help': 'shell-api.cursor.help.oplog-replay' });
Cursor.prototype.oplogReplay.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.oplogReplay.topologies = [0, 1, 2];
Cursor.prototype.oplogReplay.returnsPromise = false;
Cursor.prototype.oplogReplay.returnType = 'Unknown';

Cursor.prototype.projection.help = () => new Help({ 'help': 'shell-api.cursor.help.projection' });
Cursor.prototype.projection.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.projection.topologies = [0, 1, 2];
Cursor.prototype.projection.returnsPromise = false;
Cursor.prototype.projection.returnType = 'Unknown';

Cursor.prototype.pretty.help = () => new Help({ 'help': 'shell-api.cursor.help.pretty' });
Cursor.prototype.pretty.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.pretty.topologies = [0, 1, 2];
Cursor.prototype.pretty.returnsPromise = false;
Cursor.prototype.pretty.returnType = 'Unknown';

Cursor.prototype.readConcern.help = () => new Help({ 'help': 'shell-api.cursor.help.read-concern' });
Cursor.prototype.readConcern.serverVersions = ['3.2.0', '4.4.0'];
Cursor.prototype.readConcern.topologies = [0, 1, 2];
Cursor.prototype.readConcern.returnsPromise = false;
Cursor.prototype.readConcern.returnType = 'Unknown';

Cursor.prototype.readOnly.help = () => new Help({ 'help': 'shell-api.cursor.help.readonly' });
Cursor.prototype.readOnly.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.readOnly.topologies = [0, 1, 2];
Cursor.prototype.readOnly.returnsPromise = false;
Cursor.prototype.readOnly.returnType = 'Unknown';

Cursor.prototype.readPref.help = () => new Help({ 'help': 'shell-api.cursor.help.read-pref' });
Cursor.prototype.readPref.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.readPref.topologies = [0, 1, 2];
Cursor.prototype.readPref.returnsPromise = false;
Cursor.prototype.readPref.returnType = 'Unknown';

Cursor.prototype.returnKey.help = () => new Help({ 'help': 'shell-api.cursor.help.return-key' });
Cursor.prototype.returnKey.serverVersions = ['3.2.0', '4.4.0'];
Cursor.prototype.returnKey.topologies = [0, 1, 2];
Cursor.prototype.returnKey.returnsPromise = false;
Cursor.prototype.returnKey.returnType = 'Unknown';

Cursor.prototype.showDiskLoc.help = () => new Help({ 'help': 'shell-api.cursor.help.show-disk-loc' });
Cursor.prototype.showDiskLoc.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.showDiskLoc.topologies = [0, 1, 2];
Cursor.prototype.showDiskLoc.returnsPromise = false;
Cursor.prototype.showDiskLoc.returnType = 'Unknown';

Cursor.prototype.showRecordId.help = () => new Help({ 'help': 'shell-api.cursor.help.show-record-id' });
Cursor.prototype.showRecordId.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.showRecordId.topologies = [0, 1, 2];
Cursor.prototype.showRecordId.returnsPromise = false;
Cursor.prototype.showRecordId.returnType = 'Unknown';

Cursor.prototype.size.help = () => new Help({ 'help': 'shell-api.cursor.help.size' });
Cursor.prototype.size.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.size.topologies = [0, 1, 2];
Cursor.prototype.size.returnsPromise = false;
Cursor.prototype.size.returnType = 'Unknown';

Cursor.prototype.skip.help = () => new Help({ 'help': 'shell-api.cursor.help.skip' });
Cursor.prototype.skip.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.skip.topologies = [0, 1, 2];
Cursor.prototype.skip.returnsPromise = false;
Cursor.prototype.skip.returnType = 'Unknown';

Cursor.prototype.snapshot.help = () => new Help({ 'help': 'shell-api.cursor.help.snapshot' });
Cursor.prototype.snapshot.serverVersions = ['0.0.0', '4.0.0'];
Cursor.prototype.snapshot.topologies = [0, 1, 2];
Cursor.prototype.snapshot.returnsPromise = false;
Cursor.prototype.snapshot.returnType = 'Unknown';

Cursor.prototype.sort.help = () => new Help({ 'help': 'shell-api.cursor.help.sort' });
Cursor.prototype.sort.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.sort.topologies = [0, 1, 2];
Cursor.prototype.sort.returnsPromise = false;
Cursor.prototype.sort.returnType = 'Unknown';

Cursor.prototype.tailable.help = () => new Help({ 'help': 'shell-api.cursor.help.tailable' });
Cursor.prototype.tailable.serverVersions = ['3.2.0', '4.4.0'];
Cursor.prototype.tailable.topologies = [0, 1, 2];
Cursor.prototype.tailable.returnsPromise = false;
Cursor.prototype.tailable.returnType = 'Unknown';

Cursor.prototype.toArray.help = () => new Help({ 'help': 'shell-api.cursor.help.to-array' });
Cursor.prototype.toArray.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.toArray.topologies = [0, 1, 2];
Cursor.prototype.toArray.returnsPromise = false;
Cursor.prototype.toArray.returnType = 'Unknown';


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
    this.help = () => new Help({ 'help': 'shell-api.database.description', 'docs': 'https://docs.mongodb.com/manual/reference/method/js-database/', 'attr': [{ 'name': 'runCommand', 'description': 'shell-api.database.help.run-command' }] });

    return new Proxy(this, handler);
  }

  runCommand(...args) {
    return this._mapper.runCommand(this, ...args);
  }
}


Database.prototype.runCommand.help = () => new Help({ 'help': 'shell-api.database.help.run-command' });
Database.prototype.runCommand.serverVersions = ['0.0.0', '4.4.0'];
Database.prototype.runCommand.topologies = [0, 1, 2];
Database.prototype.runCommand.returnsPromise = false;
Database.prototype.runCommand.returnType = 'Unknown';


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
    this.help = () => new Help({ 'help': 'The DeleteResult class.' });
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
    this.help = () => new Help({ 'help': 'The InsertManyResult class.' });
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
    this.help = () => new Help({ 'help': 'The InsertManyResult class.' });
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
    this.help = () => new Help({ 'help': 'shell-api.replica-set.description', 'docs': 'https://docs.mongodb.com/manual/reference/method/js-replication' });
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
    this.help = () => new Help({ 'help': 'shell-api.shard.description', 'docs': 'https://docs.mongodb.com/manual/reference/method/js-sharding' });
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
    this.help = () => new Help({ 'help': 'shell-api.help.description', 'docs': 'https://docs.mongodb.com/manual/reference/method', 'attr': [{ 'name': 'use', 'description': 'shell-api.help.help.use' }, { 'name': 'it', 'description': 'shell-api.help.help.it' }, { 'name': '.exit', 'description': 'shell-api.help.help.exit' }, { 'name': 'show', 'description': 'shell-api.help.help.show-dbs' }] });
  }

  use(...args) {
    return this._mapper.use(this, ...args);
  }

  it(...args) {
    return this._mapper.it(this, ...args);
  }

  show(...args) {
    return this._mapper.show(this, ...args);
  }
}


ShellApi.prototype.use.help = () => new Help({ 'help': '!! No help defined for this method' });
ShellApi.prototype.use.serverVersions = ['0.0.0', '4.4.0'];
ShellApi.prototype.use.topologies = [0, 1, 2];
ShellApi.prototype.use.returnsPromise = false;
ShellApi.prototype.use.returnType = 'Unknown';

ShellApi.prototype.it.help = () => new Help({ 'help': '!! No help defined for this method' });
ShellApi.prototype.it.serverVersions = ['0.0.0', '4.4.0'];
ShellApi.prototype.it.topologies = [0, 1, 2];
ShellApi.prototype.it.returnsPromise = false;
ShellApi.prototype.it.returnType = 'Unknown';

ShellApi.prototype.show.help = () => new Help({ 'help': '!! No help defined for this method' });
ShellApi.prototype.show.serverVersions = ['0.0.0', '4.4.0'];
ShellApi.prototype.show.topologies = [0, 1, 2];
ShellApi.prototype.show.returnsPromise = false;
ShellApi.prototype.show.returnType = 'Unknown';


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
    this.help = () => new Help({ 'help': 'The UpdateResult class.' });
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
