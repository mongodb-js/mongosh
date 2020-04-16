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
    this.help = () => new Help({ 'help': 'shell-api.aggregation-cursor.description', 'docs': 'shell-api.aggregation-cursor.link', 'attr': [{ 'name': 'close', 'description': 'shell-api.aggregation-cursor.help.close' }, { 'name': 'forEeach', 'description': 'shell-api.aggregation-cursor.help.for-each' }, { 'name': 'hasNext', 'description': 'shell-api.aggregation-cursor.help.has-next' }, { 'name': 'isClosed', 'description': 'shell-api.aggregation-cursor.help.isClosed' }, { 'name': 'isExhausted', 'description': 'shell-api.aggregation-cursor.help.isExhausted' }, { 'name': 'itcount', 'description': 'shell-api.aggregation-cursor.help.itcount' }, { 'name': 'map', 'description': 'shell-api.aggregation-cursor.help.map' }, { 'name': 'next', 'description': 'shell-api.aggregation-cursor.help.next' }, { 'name': 'objsLeftInBatch', 'description': 'shell-api.aggregation-cursor.help.objs-left-in-batch' }, { 'name': 'toArray', 'description': 'shell-api.aggregation-cursor.help.to-array' }] });
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
AggregationCursor.prototype.bsonsize.returnType = 'unknown';

AggregationCursor.prototype.close.help = () => new Help({ 'help': 'shell-api.aggregation-cursor.help.close.example', 'docs': 'shell-api.aggregation-cursor.help.close.link', 'attr': [{ 'description': 'shell-api.aggregation-cursor.help.close.description' }] });
AggregationCursor.prototype.close.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.close.topologies = [0, 1, 2];
AggregationCursor.prototype.close.returnsPromise = false;
AggregationCursor.prototype.close.returnType = 'unknown';

AggregationCursor.prototype.forEach.help = () => new Help({ 'help': 'shell-api.aggregation-cursor.help.for-each.example', 'docs': 'shell-api.aggregation-cursor.help.for-each.link', 'attr': [{ 'description': 'shell-api.aggregation-cursor.help.for-each.description' }] });
AggregationCursor.prototype.forEach.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.forEach.topologies = [0, 1, 2];
AggregationCursor.prototype.forEach.returnsPromise = false;
AggregationCursor.prototype.forEach.returnType = 'unknown';

AggregationCursor.prototype.hasNext.help = () => new Help({ 'help': 'shell-api.aggregation-cursor.help.has-next.example', 'docs': 'shell-api.aggregation-cursor.help.has-next.link', 'attr': [{ 'description': 'shell-api.aggregation-cursor.help.has-next.description' }] });
AggregationCursor.prototype.hasNext.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.hasNext.topologies = [0, 1, 2];
AggregationCursor.prototype.hasNext.returnsPromise = false;
AggregationCursor.prototype.hasNext.returnType = 'unknown';

AggregationCursor.prototype.isClosed.help = () => new Help({ 'help': 'shell-api.aggregation-cursor.help.is-closed.example', 'docs': 'shell-api.aggregation-cursor.help.is-closed.link', 'attr': [{ 'description': 'shell-api.aggregation-cursor.help.is-closed.description' }] });
AggregationCursor.prototype.isClosed.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.isClosed.topologies = [0, 1, 2];
AggregationCursor.prototype.isClosed.returnsPromise = false;
AggregationCursor.prototype.isClosed.returnType = 'unknown';

AggregationCursor.prototype.isExhausted.help = () => new Help({ 'help': 'shell-api.aggregation-cursor.help.is-exhausted.example', 'docs': 'shell-api.aggregation-cursor.help.is-exhausted.link', 'attr': [{ 'description': 'shell-api.aggregation-cursor.help.is-exhausted.description' }] });
AggregationCursor.prototype.isExhausted.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.isExhausted.topologies = [0, 1, 2];
AggregationCursor.prototype.isExhausted.returnsPromise = false;
AggregationCursor.prototype.isExhausted.returnType = 'unknown';

AggregationCursor.prototype.itcount.help = () => new Help({ 'help': 'shell-api.aggregation-cursor.help.itcount.example', 'docs': 'shell-api.aggregation-cursor.help.itcount.link', 'attr': [{ 'description': 'shell-api.aggregation-cursor.help.itcount.description' }] });
AggregationCursor.prototype.itcount.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.itcount.topologies = [0, 1, 2];
AggregationCursor.prototype.itcount.returnsPromise = false;
AggregationCursor.prototype.itcount.returnType = 'unknown';

AggregationCursor.prototype.map.help = () => new Help({ 'help': 'shell-api.aggregation-cursor.help.map.example', 'docs': 'shell-api.aggregation-cursor.help.map.link', 'attr': [{ 'description': 'shell-api.aggregation-cursor.help.map.description' }] });
AggregationCursor.prototype.map.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.map.topologies = [0, 1, 2];
AggregationCursor.prototype.map.returnsPromise = false;
AggregationCursor.prototype.map.returnType = 'unknown';

AggregationCursor.prototype.next.help = () => new Help({ 'help': 'shell-api.aggregation-cursor.help.next.example', 'docs': 'shell-api.aggregation-cursor.help.next.link', 'attr': [{ 'description': 'shell-api.aggregation-cursor.help.next.description' }] });
AggregationCursor.prototype.next.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.next.topologies = [0, 1, 2];
AggregationCursor.prototype.next.returnsPromise = false;
AggregationCursor.prototype.next.returnType = 'unknown';

AggregationCursor.prototype.objsLeftInBatch.help = () => new Help({ 'help': 'shell-api.aggregation-cursor.help.objs-left-in-batch.example', 'docs': 'shell-api.aggregation-cursor.help.objs-left-in-batch.link', 'attr': [{ 'description': 'shell-api.aggregation-cursor.help.objs-left-in-batch.description' }] });
AggregationCursor.prototype.objsLeftInBatch.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.objsLeftInBatch.topologies = [0, 1, 2];
AggregationCursor.prototype.objsLeftInBatch.returnsPromise = false;
AggregationCursor.prototype.objsLeftInBatch.returnType = 'unknown';

AggregationCursor.prototype.toArray.help = () => new Help({ 'help': 'shell-api.aggregation-cursor.help.to-array.example', 'docs': 'shell-api.aggregation-cursor.help.to-array.link', 'attr': [{ 'description': 'shell-api.aggregation-cursor.help.to-array.description' }] });
AggregationCursor.prototype.toArray.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.toArray.topologies = [0, 1, 2];
AggregationCursor.prototype.toArray.returnsPromise = false;
AggregationCursor.prototype.toArray.returnType = 'unknown';


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
  constructor(_mapper, _database, _name) {
    this._mapper = _mapper;
    this._database = _database;
    this._name = _name;

    this.toReplString = () => {
      return this._name;
    };

    this.shellApiType = () => {
      return 'Collection';
    };
    this.help = () => new Help({ 'help': 'shell-api.collection.description', 'docs': 'shell-api.collection.link', 'attr': [{ 'name': 'aggregate', 'description': 'shell-api.collection.help.aggregate.description' }, { 'name': 'bulkWrite', 'description': 'shell-api.collection.help.bulk-write.description' }, { 'name': 'countDocuments', 'description': 'shell-api.collection.help.count-documents.description' }, { 'name': 'count', 'description': 'shell-api.collection.help.count.description' }, { 'name': 'deleteMany', 'description': 'shell-api.collection.help.delete-many.description' }, { 'name': 'deleteOne', 'description': 'shell-api.collection.help.delete-one.description' }, { 'name': 'distinct', 'description': 'shell-api.collection.help.distinct.description' }, { 'name': 'estimatedDocumentCount', 'description': 'shell-api.collection.help.estimated-document-coun.descriptiont' }, { 'name': 'find', 'description': 'shell-api.collection.help.find.description' }, { 'name': 'findAndModify', 'description': 'shell-api.collection.help.find-and-modify.description' }, { 'name': 'findOne', 'description': 'shell-api.collection.help.find-one.description' }, { 'name': 'findOneAndDelete', 'description': 'shell-api.collection.help.find-one-and-delete.description' }, { 'name': 'findOneAndReplace', 'description': 'shell-api.collection.help.find-one-and-replace.description' }, { 'name': 'findOneAndUpdate', 'description': 'shell-api.collection.help.find-one-and-update.description' }, { 'name': 'insert', 'description': 'shell-api.collection.help.insert.description' }, { 'name': 'insertMany', 'description': 'shell-api.collection.help.insert-many.description' }, { 'name': 'insertOne', 'description': 'shell-api.collection.help.insert-one.description' }, { 'name': 'isCapped', 'description': 'shell-api.collection.help.is-capped.description' }, { 'name': 'remove', 'description': 'shell-api.collection.help.remove.description' }, { 'name': 'save', 'description': 'shell-api.collection.help.save.description' }, { 'name': 'replaceOne', 'description': 'shell-api.collection.help.replace-one.description' }, { 'name': 'update', 'description': 'shell-api.collection.help.update.description' }, { 'name': 'updateMany', 'description': 'shell-api.collection.help.update-many.description' }, { 'name': 'updateOne', 'description': 'shell-api.collection.help.update-one.description' }, { 'name': 'converToCapped', 'description': 'shell-api.collection.help.convert-to-capped.description' }, { 'name': 'createIndexes', 'description': 'shell-api.collection.help.create-indexes.description' }, { 'name': 'createIndex', 'description': 'shell-api.collection.help.create-index.description' }, { 'name': 'ensureIndex', 'description': 'shell-api.collection.help.ensure-index.description' }, { 'name': 'getIndexes', 'description': 'shell-api.collection.help.get-indexes.description' }, { 'name': 'getIndexSpecs', 'description': 'shell-api.collection.help.get-index-specs.description' }, { 'name': 'getIndexKeys', 'description': 'shell-api.collection.help.get-index-keys.description' }, { 'name': 'getIndices', 'description': 'shell-api.collection.help.get-indices.description' }, { 'name': 'dropIndexes', 'description': 'shell-api.collection.help.drop-indexes.description' }, { 'name': 'dropIndex', 'description': 'shell-api.collection.help.drop-index.description' }, { 'name': 'reIndex', 'description': 'shell-api.collection.help.re-index.description' }, { 'name': 'totalIndexSize', 'description': 'shell-api.collection.help.total-index-size.description' }, { 'name': 'getDB', 'description': 'shell-api.collection.help.get-db.description' }, { 'name': 'stats', 'description': 'shell-api.collection.help.stats.description' }] });
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

  convertToCapped(...args) {
    return this._mapper.convertToCapped(this, ...args);
  }

  createIndexes(...args) {
    return this._mapper.createIndexes(this, ...args);
  }

  createIndex(...args) {
    return this._mapper.createIndex(this, ...args);
  }

  ensureIndex(...args) {
    return this._mapper.ensureIndex(this, ...args);
  }

  getIndexes(...args) {
    return this._mapper.getIndexes(this, ...args);
  }

  getIndexSpecs(...args) {
    return this._mapper.getIndexSpecs(this, ...args);
  }

  getIndexKeys(...args) {
    return this._mapper.getIndexKeys(this, ...args);
  }

  getIndices(...args) {
    return this._mapper.getIndices(this, ...args);
  }

  dropIndexes(...args) {
    return this._mapper.dropIndexes(this, ...args);
  }

  dropIndex(...args) {
    return this._mapper.dropIndex(this, ...args);
  }

  reIndex(...args) {
    return this._mapper.reIndex(this, ...args);
  }

  totalIndexSize(...args) {
    return this._mapper.totalIndexSize(this, ...args);
  }

  getDB(...args) {
    return this._mapper.getDB(this, ...args);
  }

  stats(...args) {
    return this._mapper.stats(this, ...args);
  }

  dataSize(...args) {
    return this._mapper.dataSize(this, ...args);
  }

  storageSize(...args) {
    return this._mapper.storageSize(this, ...args);
  }

  totalSize(...args) {
    return this._mapper.totalSize(this, ...args);
  }
}


Collection.prototype.aggregate.help = () => new Help({ 'help': 'shell-api.collection.help.aggregate.example', 'docs': 'shell-api.collection.help.aggregate.link', 'attr': [{ 'description': 'shell-api.collection.help.aggregate.description' }] });
Collection.prototype.aggregate.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.aggregate.topologies = [0, 1, 2];
Collection.prototype.aggregate.returnsPromise = false;
Collection.prototype.aggregate.returnType = 'AggregationCursor';

Collection.prototype.bulkWrite.help = () => new Help({ 'help': 'shell-api.collection.help.bulk-write.example', 'docs': 'shell-api.collection.help.bulk-write.link', 'attr': [{ 'description': 'shell-api.collection.help.bulk-write.description' }] });
Collection.prototype.bulkWrite.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.bulkWrite.topologies = [0, 1, 2];
Collection.prototype.bulkWrite.returnsPromise = true;
Collection.prototype.bulkWrite.returnType = 'unknown';

Collection.prototype.countDocuments.help = () => new Help({ 'help': 'shell-api.collection.help.count-documents.example', 'docs': 'shell-api.collection.help.count-documents.link', 'attr': [{ 'description': 'shell-api.collection.help.count-documents.description' }] });
Collection.prototype.countDocuments.serverVersions = ['4.0.3', '4.4.0'];
Collection.prototype.countDocuments.topologies = [0, 1, 2];
Collection.prototype.countDocuments.returnsPromise = true;
Collection.prototype.countDocuments.returnType = 'unknown';

Collection.prototype.count.help = () => new Help({ 'help': 'shell-api.collection.help.count.example', 'docs': 'shell-api.collection.help.count.link', 'attr': [{ 'description': 'shell-api.collection.help.count.description' }] });
Collection.prototype.count.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.count.topologies = [0, 1, 2];
Collection.prototype.count.returnsPromise = true;
Collection.prototype.count.returnType = 'unknown';

Collection.prototype.deleteMany.help = () => new Help({ 'help': 'shell-api.collection.help.delete-many.example', 'docs': 'shell-api.collection.help.delete-many.link', 'attr': [{ 'description': 'shell-api.collection.help.delete-many.description' }] });
Collection.prototype.deleteMany.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.deleteMany.topologies = [0, 1, 2];
Collection.prototype.deleteMany.returnsPromise = true;
Collection.prototype.deleteMany.returnType = 'unknown';

Collection.prototype.deleteOne.help = () => new Help({ 'help': 'shell-api.collection.help.delete-one.example', 'docs': 'shell-api.collection.help.delete-one.link', 'attr': [{ 'description': 'shell-api.collection.help.delete-one.description' }] });
Collection.prototype.deleteOne.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.deleteOne.topologies = [0, 1, 2];
Collection.prototype.deleteOne.returnsPromise = true;
Collection.prototype.deleteOne.returnType = 'unknown';

Collection.prototype.distinct.help = () => new Help({ 'help': 'shell-api.collection.help.distinct.example', 'docs': 'shell-api.collection.help.distinct.link', 'attr': [{ 'description': 'shell-api.collection.help.distinct.description' }] });
Collection.prototype.distinct.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.distinct.topologies = [0, 1, 2];
Collection.prototype.distinct.returnsPromise = false;
Collection.prototype.distinct.returnType = 'Cursor';

Collection.prototype.estimatedDocumentCount.help = () => new Help({ 'help': 'shell-api.collection.help.estimated-document-count.example', 'docs': 'shell-api.collection.help.estimated-document-count.link', 'attr': [{ 'description': 'shell-api.collection.help.estimated-document-count.description' }] });
Collection.prototype.estimatedDocumentCount.serverVersions = ['4.0.3', '4.4.0'];
Collection.prototype.estimatedDocumentCount.topologies = [0, 1, 2];
Collection.prototype.estimatedDocumentCount.returnsPromise = true;
Collection.prototype.estimatedDocumentCount.returnType = 'unknown';

Collection.prototype.find.help = () => new Help({ 'help': 'shell-api.collection.help.find.example', 'docs': 'shell-api.collection.help.find.link', 'attr': [{ 'description': 'shell-api.collection.help.find.description' }] });
Collection.prototype.find.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.find.topologies = [0, 1, 2];
Collection.prototype.find.returnsPromise = false;
Collection.prototype.find.returnType = 'Cursor';

Collection.prototype.findAndModify.help = () => new Help({ 'help': 'shell-api.collection.help.find-and-modify.example', 'docs': 'shell-api.collection.help.find-and-modify.link', 'attr': [{ 'description': 'shell-api.collection.help.find-and-modify.description' }] });
Collection.prototype.findAndModify.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.findAndModify.topologies = [0, 1, 2];
Collection.prototype.findAndModify.returnsPromise = false;
Collection.prototype.findAndModify.returnType = 'unknown';

Collection.prototype.findOne.help = () => new Help({ 'help': 'shell-api.collection.help.find-one.example', 'docs': 'shell-api.collection.help.find-one.link', 'attr': [{ 'description': 'shell-api.collection.help.find-one.description' }] });
Collection.prototype.findOne.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.findOne.topologies = [0, 1, 2];
Collection.prototype.findOne.returnsPromise = false;
Collection.prototype.findOne.returnType = 'unknown';

Collection.prototype.findOneAndDelete.help = () => new Help({ 'help': 'shell-api.collection.help.find-one-and-delete.example', 'docs': 'shell-api.collection.help.find-one-and-delete.link', 'attr': [{ 'description': 'shell-api.collection.help.find-one-and-delete.description' }] });
Collection.prototype.findOneAndDelete.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.findOneAndDelete.topologies = [0, 1, 2];
Collection.prototype.findOneAndDelete.returnsPromise = true;
Collection.prototype.findOneAndDelete.returnType = 'unknown';

Collection.prototype.findOneAndReplace.help = () => new Help({ 'help': 'shell-api.collection.help.find-one-and-replace.example', 'docs': 'shell-api.collection.help.find-one-and-replace.link', 'attr': [{ 'description': 'shell-api.collection.help.find-one-and-replace.description' }] });
Collection.prototype.findOneAndReplace.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.findOneAndReplace.topologies = [0, 1, 2];
Collection.prototype.findOneAndReplace.returnsPromise = true;
Collection.prototype.findOneAndReplace.returnType = 'unknown';

Collection.prototype.findOneAndUpdate.help = () => new Help({ 'help': 'shell-api.collection.help.find-one-and-update.example', 'docs': 'shell-api.collection.help.find-one-and-update.link', 'attr': [{ 'description': 'shell-api.collection.help.find-one-and-update.description' }] });
Collection.prototype.findOneAndUpdate.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.findOneAndUpdate.topologies = [0, 1, 2];
Collection.prototype.findOneAndUpdate.returnsPromise = true;
Collection.prototype.findOneAndUpdate.returnType = 'unknown';

Collection.prototype.insert.help = () => new Help({ 'help': 'shell-api.collection.help.insert.example', 'docs': 'shell-api.collection.help.insert.link', 'attr': [{ 'description': 'shell-api.collection.help.insert.description' }] });
Collection.prototype.insert.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.insert.topologies = [0, 1, 2];
Collection.prototype.insert.returnsPromise = true;
Collection.prototype.insert.returnType = 'unknown';

Collection.prototype.insertMany.help = () => new Help({ 'help': 'shell-api.collection.help.insert-many.example', 'docs': 'shell-api.collection.help.insert-many.link', 'attr': [{ 'description': 'shell-api.collection.help.insert-many.description' }] });
Collection.prototype.insertMany.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.insertMany.topologies = [0, 1, 2];
Collection.prototype.insertMany.returnsPromise = true;
Collection.prototype.insertMany.returnType = 'unknown';

Collection.prototype.insertOne.help = () => new Help({ 'help': 'shell-api.collection.help.insert-one.example', 'docs': 'shell-api.collection.help.insert-one.link', 'attr': [{ 'description': 'shell-api.collection.help.insert-one.description' }] });
Collection.prototype.insertOne.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.insertOne.topologies = [0, 1, 2];
Collection.prototype.insertOne.returnsPromise = true;
Collection.prototype.insertOne.returnType = 'unknown';

Collection.prototype.isCapped.help = () => new Help({ 'help': 'shell-api.collection.help.is-capped.example', 'docs': 'shell-api.collection.help.is-capped.link', 'attr': [{ 'description': 'shell-api.collection.help.is-capped.description' }] });
Collection.prototype.isCapped.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.isCapped.topologies = [0, 1, 2];
Collection.prototype.isCapped.returnsPromise = true;
Collection.prototype.isCapped.returnType = 'unknown';

Collection.prototype.remove.help = () => new Help({ 'help': 'shell-api.collection.help.remove.example', 'docs': 'shell-api.collection.help.remove.link', 'attr': [{ 'description': 'shell-api.collection.help.remove.description' }] });
Collection.prototype.remove.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.remove.topologies = [0, 1, 2];
Collection.prototype.remove.returnsPromise = true;
Collection.prototype.remove.returnType = 'unknown';

Collection.prototype.save.help = () => new Help({ 'help': 'shell-api.collection.help.save.example', 'docs': 'shell-api.collection.help.save.link', 'attr': [{ 'description': 'shell-api.collection.help.save.description' }] });
Collection.prototype.save.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.save.topologies = [0, 1, 2];
Collection.prototype.save.returnsPromise = true;
Collection.prototype.save.returnType = 'unknown';

Collection.prototype.replaceOne.help = () => new Help({ 'help': 'shell-api.collection.help.replace-one.example', 'docs': 'shell-api.collection.help.replace-one.link', 'attr': [{ 'description': 'shell-api.collection.help.replace-one.description' }] });
Collection.prototype.replaceOne.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.replaceOne.topologies = [0, 1, 2];
Collection.prototype.replaceOne.returnsPromise = true;
Collection.prototype.replaceOne.returnType = 'unknown';

Collection.prototype.update.help = () => new Help({ 'help': 'shell-api.collection.help.update.example', 'docs': 'shell-api.collection.help.update.link', 'attr': [{ 'description': 'shell-api.collection.help.update.description' }] });
Collection.prototype.update.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.update.topologies = [0, 1, 2];
Collection.prototype.update.returnsPromise = true;
Collection.prototype.update.returnType = 'unknown';

Collection.prototype.updateMany.help = () => new Help({ 'help': 'shell-api.collection.help.update-many.example', 'docs': 'shell-api.collection.help.update-many.link', 'attr': [{ 'description': 'shell-api.collection.help.update-many.description' }] });
Collection.prototype.updateMany.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.updateMany.topologies = [0, 1, 2];
Collection.prototype.updateMany.returnsPromise = true;
Collection.prototype.updateMany.returnType = 'unknown';

Collection.prototype.updateOne.help = () => new Help({ 'help': 'shell-api.collection.help.update-one.example', 'docs': 'shell-api.collection.help.update-one.link', 'attr': [{ 'description': 'shell-api.collection.help.update-one.description' }] });
Collection.prototype.updateOne.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.updateOne.topologies = [0, 1, 2];
Collection.prototype.updateOne.returnsPromise = true;
Collection.prototype.updateOne.returnType = 'unknown';

Collection.prototype.convertToCapped.help = () => new Help({ 'help': 'shell-api.collection.help.convert-to-capped.example', 'docs': 'shell-api.collection.help.convert-to-capped.link', 'attr': [{ 'description': 'shell-api.collection.help.convert-to-capped.description' }] });
Collection.prototype.convertToCapped.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.convertToCapped.topologies = [0, 1, 2];
Collection.prototype.convertToCapped.returnsPromise = true;
Collection.prototype.convertToCapped.returnType = 'unknown';

Collection.prototype.createIndexes.help = () => new Help({ 'help': 'shell-api.collection.help.create-indexes.example', 'docs': 'shell-api.collection.help.create-indexes.link', 'attr': [{ 'description': 'shell-api.collection.help.create-indexes.description' }] });
Collection.prototype.createIndexes.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.createIndexes.topologies = [0, 1, 2];
Collection.prototype.createIndexes.returnsPromise = true;
Collection.prototype.createIndexes.returnType = 'unknown';

Collection.prototype.createIndex.help = () => new Help({ 'help': 'shell-api.collection.help.create-index.example', 'docs': 'shell-api.collection.help.create-index.link', 'attr': [{ 'description': 'shell-api.collection.help.create-index.description' }] });
Collection.prototype.createIndex.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.createIndex.topologies = [0, 1, 2];
Collection.prototype.createIndex.returnsPromise = true;
Collection.prototype.createIndex.returnType = 'unknown';

Collection.prototype.ensureIndex.help = () => new Help({ 'help': 'shell-api.collection.help.ensure-index.example', 'docs': 'shell-api.collection.help.ensure-index.link', 'attr': [{ 'description': 'shell-api.collection.help.ensure-index.description' }] });
Collection.prototype.ensureIndex.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.ensureIndex.topologies = [0, 1, 2];
Collection.prototype.ensureIndex.returnsPromise = true;
Collection.prototype.ensureIndex.returnType = 'unknown';

Collection.prototype.getIndexes.help = () => new Help({ 'help': 'shell-api.collection.help.get-indexes.example', 'docs': 'shell-api.collection.help.get-indexes.link', 'attr': [{ 'description': 'shell-api.collection.help.get-indexes.description' }] });
Collection.prototype.getIndexes.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.getIndexes.topologies = [0, 1, 2];
Collection.prototype.getIndexes.returnsPromise = true;
Collection.prototype.getIndexes.returnType = 'unknown';

Collection.prototype.getIndexSpecs.help = () => new Help({ 'help': 'shell-api.collection.help.get-index-specs.example', 'docs': 'shell-api.collection.help.get-index-specs.link', 'attr': [{ 'description': 'shell-api.collection.help.get-index-specs.description' }] });
Collection.prototype.getIndexSpecs.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.getIndexSpecs.topologies = [0, 1, 2];
Collection.prototype.getIndexSpecs.returnsPromise = true;
Collection.prototype.getIndexSpecs.returnType = 'unknown';

Collection.prototype.getIndexKeys.help = () => new Help({ 'help': 'shell-api.collection.help.get-index-keys.example', 'docs': 'shell-api.collection.help.get-index-keys.link', 'attr': [{ 'description': 'shell-api.collection.help.get-index-keys.description' }] });
Collection.prototype.getIndexKeys.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.getIndexKeys.topologies = [0, 1, 2];
Collection.prototype.getIndexKeys.returnsPromise = true;
Collection.prototype.getIndexKeys.returnType = 'unknown';

Collection.prototype.getIndices.help = () => new Help({ 'help': 'shell-api.collection.help.get-indices.example', 'docs': 'shell-api.collection.help.get-indices.link', 'attr': [{ 'description': 'shell-api.collection.help.get-indices.description' }] });
Collection.prototype.getIndices.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.getIndices.topologies = [0, 1, 2];
Collection.prototype.getIndices.returnsPromise = true;
Collection.prototype.getIndices.returnType = 'unknown';

Collection.prototype.dropIndexes.help = () => new Help({ 'help': 'shell-api.collection.help.drop-indexes.example', 'docs': 'shell-api.collection.help.drop-indexes.link', 'attr': [{ 'description': 'shell-api.collection.help.drop-indexes.description' }] });
Collection.prototype.dropIndexes.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.dropIndexes.topologies = [0, 1, 2];
Collection.prototype.dropIndexes.returnsPromise = true;
Collection.prototype.dropIndexes.returnType = 'unknown';

Collection.prototype.dropIndex.help = () => new Help({ 'help': 'shell-api.collection.help.drop-index.example', 'docs': 'shell-api.collection.help.drop-index.link', 'attr': [{ 'description': 'shell-api.collection.help.drop-index.description' }] });
Collection.prototype.dropIndex.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.dropIndex.topologies = [0, 1, 2];
Collection.prototype.dropIndex.returnsPromise = true;
Collection.prototype.dropIndex.returnType = 'unknown';

Collection.prototype.reIndex.help = () => new Help({ 'help': 'shell-api.collection.help.re-index.example', 'docs': 'shell-api.collection.help.re-index.link', 'attr': [{ 'description': 'shell-api.collection.help.re-index.description' }] });
Collection.prototype.reIndex.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.reIndex.topologies = [0, 1, 2];
Collection.prototype.reIndex.returnsPromise = true;
Collection.prototype.reIndex.returnType = 'unknown';

Collection.prototype.totalIndexSize.help = () => new Help({ 'help': 'shell-api.collection.help.total-index-size.example', 'docs': 'shell-api.collection.help.total-index-size.link', 'attr': [{ 'description': 'shell-api.collection.help.total-index-size.description' }] });
Collection.prototype.totalIndexSize.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.totalIndexSize.topologies = [0, 1, 2];
Collection.prototype.totalIndexSize.returnsPromise = true;
Collection.prototype.totalIndexSize.returnType = 'unknown';

Collection.prototype.getDB.help = () => new Help({ 'help': 'shell-api.collection.help.get-db.example', 'docs': 'shell-api.collection.help.get-db.link', 'attr': [{ 'description': 'shell-api.collection.help.get-db.description' }] });
Collection.prototype.getDB.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.getDB.topologies = [0, 1, 2];
Collection.prototype.getDB.returnsPromise = false;
Collection.prototype.getDB.returnType = 'Database';

Collection.prototype.stats.help = () => new Help({ 'help': 'shell-api.collection.help.stats.example', 'docs': 'shell-api.collection.help.stats.link', 'attr': [{ 'description': 'shell-api.collection.help.stats.description' }] });
Collection.prototype.stats.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.stats.topologies = [0, 1, 2];
Collection.prototype.stats.returnsPromise = true;
Collection.prototype.stats.returnType = 'unknown';

Collection.prototype.dataSize.help = () => new Help({ 'help': 'shell-api.collection.help.data-size.example', 'docs': 'shell-api.collection.help.data-size.link', 'attr': [{ 'description': 'shell-api.collection.help.data-size.description' }] });
Collection.prototype.dataSize.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.dataSize.topologies = [0, 1, 2];
Collection.prototype.dataSize.returnsPromise = true;
Collection.prototype.dataSize.returnType = 'unknown';

Collection.prototype.storageSize.help = () => new Help({ 'help': 'shell-api.collection.help.storage-size.example', 'docs': 'shell-api.collection.help.storage-size.link', 'attr': [{ 'description': 'shell-api.collection.help.storage-size.description' }] });
Collection.prototype.storageSize.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.storageSize.topologies = [0, 1, 2];
Collection.prototype.storageSize.returnsPromise = true;
Collection.prototype.storageSize.returnType = 'unknown';

Collection.prototype.totalSize.help = () => new Help({ 'help': 'shell-api.collection.help.total-size.example', 'docs': 'shell-api.collection.help.total-size.link', 'attr': [{ 'description': 'shell-api.collection.help.total-size.description' }] });
Collection.prototype.totalSize.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.totalSize.topologies = [0, 1, 2];
Collection.prototype.totalSize.returnsPromise = true;
Collection.prototype.totalSize.returnType = 'unknown';


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
    this.help = () => new Help({ 'help': 'shell-api.cursor.description', 'docs': 'shell-api.cursor.link', 'attr': [{ 'name': 'addOption', 'description': 'shell-api.cursor.help.add-option' }, { 'name': 'allowPartialResults', 'description': 'shell-api.cursor.help.allow-partial-results' }, { 'name': 'arrayAccess', 'description': 'shell-api.cursor.help.array-access' }, { 'name': 'batchSize', 'description': 'shell-api.cursor.help.batch-size' }, { 'name': 'clone', 'description': 'shell-api.cursor.help.clone' }, { 'name': 'close', 'description': 'shell-api.cursor.help.close' }, { 'name': 'collation', 'description': 'shell-api.cursor.help.collation' }, { 'name': 'comment', 'description': 'shell-api.cursor.help.comment' }, { 'name': 'count', 'description': 'shell-api.cursor.help.count' }, { 'name': 'explain', 'description': 'shell-api.cursor.help.explain' }, { 'name': 'forEach', 'description': 'shell-api.cursor.help.for-each' }, { 'name': 'getQueryPlan', 'description': 'shell-api.cursor.help.get-query-plan' }, { 'name': 'hasNext', 'description': 'shell-api.cursor.help.has-next' }, { 'name': 'hint', 'description': 'shell-api.cursor.help.hint' }, { 'name': 'isClosed', 'description': 'shell-api.cursor.help.is-closed' }, { 'name': 'isExhausted', 'description': 'shell-api.cursor.help.is-exhausted' }, { 'name': 'itcount', 'description': 'shell-api.cursor.help.itcount' }, { 'name': 'length', 'description': 'shell-api.cursor.help.length' }, { 'name': 'limit', 'description': 'shell-api.cursor.help.limit' }, { 'name': 'map', 'description': 'shell-api.cursor.help.map' }, { 'name': 'max', 'description': 'shell-api.cursor.help.max' }, { 'name': 'maxScan', 'description': 'shell-api.cursor.help.max-scan' }, { 'name': 'maxTimeMS', 'description': 'shell-api.cursor.help.max-time-ms' }, { 'name': 'min', 'description': 'shell-api.cursor.help.min' }, { 'name': 'modifiers', 'description': 'shell-api.cursor.help.modifiers' }, { 'name': 'next', 'description': 'shell-api.cursor.help.next' }, { 'name': 'noCursorTimeout', 'description': 'shell-api.cursor.help.no-cursor-timeout' }, { 'name': 'objsLeftInBatch', 'description': 'shell-api.cursor.help.objs-left-in-batch' }, { 'name': 'oplog', 'description': 'shell-api.cursor.help.oplog-replay' }, { 'name': 'projection', 'description': 'shell-api.cursor.help.projection' }, { 'name': 'pretty', 'description': 'shell-api.cursor.help.pretty' }, { 'name': 'readConcern', 'description': 'shell-api.cursor.help.read-concern' }, { 'name': 'readOnly', 'description': 'shell-api.cursor.help.read-only' }, { 'name': 'readPref', 'description': 'shell-api.cursor.help.read-pref' }, { 'name': 'returnKey', 'description': 'shell-api.cursor.help.return-key' }, { 'name': 'showDiskLoc', 'description': 'shell-api.cursor.help.show-disk-loc' }, { 'name': 'showRecordId', 'description': 'shell-api.cursor.help.show-record-id' }, { 'name': 'size', 'description': 'shell-api.cursor.help.size' }, { 'name': 'skip', 'description': 'shell-api.cursor.help.skip' }, { 'name': 'snapshot', 'description': 'shell-api.cursor.help.snapshot' }, { 'name': 'sort', 'description': 'shell-api.cursor.help.sort' }, { 'name': 'tailable', 'description': 'shell-api.cursor.help.tailable' }, { 'name': 'toArray', 'description': 'shell-api.cursor.help.to-array' }] });
  }

  addOption(...args) {
    this._cursor.addOption(...args);
    return this;
  }

  allowPartialResults(...args) {
    this._cursor.allowPartialResults(...args);
    return this;
  }

  arrayAccess(...args) {
    return this._cursor.arrayAccess(...args);
  }

  batchSize(...args) {
    this._cursor.batchSize(...args);
    return this;
  }

  clone(...args) {
    return this._cursor.clone(...args);
  }

  close(...args) {
    return this._cursor.close(...args);
  }

  collation(...args) {
    this._cursor.collation(...args);
    return this;
  }

  comment(...args) {
    this._cursor.comment(...args);
    return this;
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

  hasNext(...args) {
    return this._cursor.hasNext(...args);
  }

  hint(...args) {
    this._cursor.hint(...args);
    return this;
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

  limit(...args) {
    this._cursor.limit(...args);
    return this;
  }

  map(...args) {
    this._cursor.map(...args);
    return this;
  }

  max(...args) {
    this._cursor.max(...args);
    return this;
  }

  maxTimeMS(...args) {
    this._cursor.maxTimeMS(...args);
    return this;
  }

  min(...args) {
    this._cursor.min(...args);
    return this;
  }

  next(...args) {
    return this._cursor.next(...args);
  }

  noCursorTimeout(...args) {
    this._cursor.noCursorTimeout(...args);
    return this;
  }

  oplogReplay(...args) {
    this._cursor.oplogReplay(...args);
    return this;
  }

  projection(...args) {
    this._cursor.projection(...args);
    return this;
  }

  readPref(...args) {
    this._cursor.readPref(...args);
    return this;
  }

  returnKey(...args) {
    this._cursor.returnKey(...args);
    return this;
  }

  size(...args) {
    return this._cursor.size(...args);
  }

  skip(...args) {
    this._cursor.skip(...args);
    return this;
  }

  sort(...args) {
    this._cursor.sort(...args);
    return this;
  }

  tailable(...args) {
    this._cursor.tailable(...args);
    return this;
  }

  toArray(...args) {
    return this._cursor.toArray(...args);
  }
}


Cursor.prototype.addOption.help = () => new Help({ 'help': 'shell-api.cursor.help.add-option.example', 'docs': 'shell-api.cursor.help.add-option.link', 'attr': [{ 'description': 'shell-api.cursor.help.add-option.description' }] });
Cursor.prototype.addOption.serverVersions = ['0.0.0', '3.2.0'];
Cursor.prototype.addOption.topologies = [0, 1, 2];
Cursor.prototype.addOption.returnsPromise = false;
Cursor.prototype.addOption.returnType = 'Cursor';

Cursor.prototype.allowPartialResults.help = () => new Help({ 'help': 'shell-api.cursor.help.allow-partial-results.example', 'docs': 'shell-api.cursor.help.allow-partial-results.link', 'attr': [{ 'description': 'shell-api.cursor.help.allow-partial-results.description' }] });
Cursor.prototype.allowPartialResults.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.allowPartialResults.topologies = [0, 1, 2];
Cursor.prototype.allowPartialResults.returnsPromise = false;
Cursor.prototype.allowPartialResults.returnType = 'Cursor';

Cursor.prototype.arrayAccess.help = () => new Help({ 'help': '!! No help defined for this method' });
Cursor.prototype.arrayAccess.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.arrayAccess.topologies = [0, 1, 2];
Cursor.prototype.arrayAccess.returnsPromise = false;
Cursor.prototype.arrayAccess.returnType = 'unknown';

Cursor.prototype.batchSize.help = () => new Help({ 'help': 'shell-api.cursor.help.batch-size.example', 'docs': 'shell-api.cursor.help.batch-size.link', 'attr': [{ 'description': 'shell-api.cursor.help.batch-size.description' }] });
Cursor.prototype.batchSize.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.batchSize.topologies = [0, 1, 2];
Cursor.prototype.batchSize.returnsPromise = false;
Cursor.prototype.batchSize.returnType = 'Cursor';

Cursor.prototype.clone.help = () => new Help({ 'help': 'shell-api.cursor.help.clone.example', 'docs': 'shell-api.cursor.help.clone.link', 'attr': [{ 'description': 'shell-api.cursor.help.clone.description' }] });
Cursor.prototype.clone.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.clone.topologies = [0, 1, 2];
Cursor.prototype.clone.returnsPromise = false;
Cursor.prototype.clone.returnType = 'Cursor';

Cursor.prototype.close.help = () => new Help({ 'help': 'shell-api.cursor.help.close.example', 'docs': 'shell-api.cursor.help.close.link', 'attr': [{ 'description': 'shell-api.cursor.help.close.description' }] });
Cursor.prototype.close.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.close.topologies = [0, 1, 2];
Cursor.prototype.close.returnsPromise = false;
Cursor.prototype.close.returnType = 'unknown';

Cursor.prototype.collation.help = () => new Help({ 'help': 'shell-api.cursor.help.collation.example', 'docs': 'shell-api.cursor.help.collation.link', 'attr': [{ 'description': 'shell-api.cursor.help.collation.description' }] });
Cursor.prototype.collation.serverVersions = ['3.4.0', '4.4.0'];
Cursor.prototype.collation.topologies = [0, 1, 2];
Cursor.prototype.collation.returnsPromise = false;
Cursor.prototype.collation.returnType = 'Cursor';

Cursor.prototype.comment.help = () => new Help({ 'help': 'shell-api.cursor.help.comment.example', 'docs': 'shell-api.cursor.help.comment.link', 'attr': [{ 'description': 'shell-api.cursor.help.comment.description' }] });
Cursor.prototype.comment.serverVersions = ['3.2.0', '4.4.0'];
Cursor.prototype.comment.topologies = [0, 1, 2];
Cursor.prototype.comment.returnsPromise = false;
Cursor.prototype.comment.returnType = 'Cursor';

Cursor.prototype.count.help = () => new Help({ 'help': 'shell-api.cursor.help.count.example', 'docs': 'shell-api.cursor.help.count.link', 'attr': [{ 'description': 'shell-api.cursor.help.count.description' }] });
Cursor.prototype.count.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.count.topologies = [0, 1, 2];
Cursor.prototype.count.returnsPromise = true;
Cursor.prototype.count.returnType = 'unknown';
Cursor.prototype.count.serverVersion = ['0.0.0', '4.0.0'];

Cursor.prototype.explain.help = () => new Help({ 'help': 'shell-api.cursor.help.explain.example', 'docs': 'shell-api.cursor.help.explain.link', 'attr': [{ 'description': 'shell-api.cursor.help.explain.description' }] });
Cursor.prototype.explain.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.explain.topologies = [0, 1, 2];
Cursor.prototype.explain.returnsPromise = true;
Cursor.prototype.explain.returnType = 'unknown';

Cursor.prototype.forEach.help = () => new Help({ 'help': 'shell-api.cursor.help.for-each.example', 'docs': 'shell-api.cursor.help.for-each.link', 'attr': [{ 'description': 'shell-api.cursor.help.for-each.description' }] });
Cursor.prototype.forEach.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.forEach.topologies = [0, 1, 2];
Cursor.prototype.forEach.returnsPromise = true;
Cursor.prototype.forEach.returnType = 'unknown';

Cursor.prototype.hasNext.help = () => new Help({ 'help': 'shell-api.cursor.help.has-next.example', 'docs': 'shell-api.cursor.help.has-next.link', 'attr': [{ 'description': 'shell-api.cursor.help.has-next.description' }] });
Cursor.prototype.hasNext.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.hasNext.topologies = [0, 1, 2];
Cursor.prototype.hasNext.returnsPromise = true;
Cursor.prototype.hasNext.returnType = 'unknown';

Cursor.prototype.hint.help = () => new Help({ 'help': 'shell-api.cursor.help.hint.example', 'docs': 'shell-api.cursor.help.hint.link', 'attr': [{ 'description': 'shell-api.cursor.help.hint.description' }] });
Cursor.prototype.hint.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.hint.topologies = [0, 1, 2];
Cursor.prototype.hint.returnsPromise = false;
Cursor.prototype.hint.returnType = 'Cursor';

Cursor.prototype.isClosed.help = () => new Help({ 'help': 'shell-api.cursor.help.is-closed.example', 'docs': 'shell-api.cursor.help.is-closed.link', 'attr': [{ 'description': 'shell-api.cursor.help.is-closed.description' }] });
Cursor.prototype.isClosed.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.isClosed.topologies = [0, 1, 2];
Cursor.prototype.isClosed.returnsPromise = false;
Cursor.prototype.isClosed.returnType = 'unknown';

Cursor.prototype.isExhausted.help = () => new Help({ 'help': 'shell-api.cursor.help.is-exhausted.example', 'docs': 'shell-api.cursor.help.is-exhausted.link', 'attr': [{ 'description': 'shell-api.cursor.help.is-exhausted.description' }] });
Cursor.prototype.isExhausted.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.isExhausted.topologies = [0, 1, 2];
Cursor.prototype.isExhausted.returnsPromise = false;
Cursor.prototype.isExhausted.returnType = 'unknown';

Cursor.prototype.itcount.help = () => new Help({ 'help': 'shell-api.cursor.help.itcount.example', 'docs': 'shell-api.cursor.help.itcount.link', 'attr': [{ 'description': 'shell-api.cursor.help.itcount.description' }] });
Cursor.prototype.itcount.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.itcount.topologies = [0, 1, 2];
Cursor.prototype.itcount.returnsPromise = true;
Cursor.prototype.itcount.returnType = 'unknown';

Cursor.prototype.limit.help = () => new Help({ 'help': 'shell-api.cursor.help.limit.example', 'docs': 'shell-api.cursor.help.limit.link', 'attr': [{ 'description': 'shell-api.cursor.help.limit.description' }] });
Cursor.prototype.limit.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.limit.topologies = [0, 1, 2];
Cursor.prototype.limit.returnsPromise = false;
Cursor.prototype.limit.returnType = 'Cursor';

Cursor.prototype.map.help = () => new Help({ 'help': 'shell-api.cursor.help.map.example', 'docs': 'shell-api.cursor.help.map.link', 'attr': [{ 'description': 'shell-api.cursor.help.map.description' }] });
Cursor.prototype.map.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.map.topologies = [0, 1, 2];
Cursor.prototype.map.returnsPromise = false;
Cursor.prototype.map.returnType = 'Cursor';

Cursor.prototype.max.help = () => new Help({ 'help': 'shell-api.cursor.help.max.example', 'docs': 'shell-api.cursor.help.max.link', 'attr': [{ 'description': 'shell-api.cursor.help.max.description' }] });
Cursor.prototype.max.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.max.topologies = [0, 1, 2];
Cursor.prototype.max.returnsPromise = false;
Cursor.prototype.max.returnType = 'Cursor';

Cursor.prototype.maxTimeMS.help = () => new Help({ 'help': 'shell-api.cursor.help.max-time-ms.example', 'docs': 'shell-api.cursor.help.max-time-ms.link', 'attr': [{ 'description': 'shell-api.cursor.help.max-time-ms.description' }] });
Cursor.prototype.maxTimeMS.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.maxTimeMS.topologies = [0, 1, 2];
Cursor.prototype.maxTimeMS.returnsPromise = false;
Cursor.prototype.maxTimeMS.returnType = 'Cursor';

Cursor.prototype.min.help = () => new Help({ 'help': 'shell-api.cursor.help.min.example', 'docs': 'shell-api.cursor.help.min.link', 'attr': [{ 'description': 'shell-api.cursor.help.min.description' }] });
Cursor.prototype.min.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.min.topologies = [0, 1, 2];
Cursor.prototype.min.returnsPromise = false;
Cursor.prototype.min.returnType = 'Cursor';

Cursor.prototype.next.help = () => new Help({ 'help': 'shell-api.cursor.help.next.example', 'docs': 'shell-api.cursor.help.next.link', 'attr': [{ 'description': 'shell-api.cursor.help.next.description' }] });
Cursor.prototype.next.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.next.topologies = [0, 1, 2];
Cursor.prototype.next.returnsPromise = true;
Cursor.prototype.next.returnType = 'unknown';

Cursor.prototype.noCursorTimeout.help = () => new Help({ 'help': 'shell-api.cursor.help.no-cursor-timeout.example', 'docs': 'shell-api.cursor.help.no-cursor-timeout.link', 'attr': [{ 'description': 'shell-api.cursor.help.no-cursor-timeout.description' }] });
Cursor.prototype.noCursorTimeout.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.noCursorTimeout.topologies = [0, 1, 2];
Cursor.prototype.noCursorTimeout.returnsPromise = false;
Cursor.prototype.noCursorTimeout.returnType = 'Cursor';

Cursor.prototype.oplogReplay.help = () => new Help({ 'help': 'shell-api.cursor.help.oplog-replay.example', 'docs': 'shell-api.cursor.help.oplog-replay.link', 'attr': [{ 'description': 'shell-api.cursor.help.oplog-replay.description' }] });
Cursor.prototype.oplogReplay.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.oplogReplay.topologies = [0, 1, 2];
Cursor.prototype.oplogReplay.returnsPromise = false;
Cursor.prototype.oplogReplay.returnType = 'Cursor';

Cursor.prototype.projection.help = () => new Help({ 'help': 'shell-api.cursor.help.projection.example', 'docs': 'shell-api.cursor.help.projection.link', 'attr': [{ 'description': 'shell-api.cursor.help.projection.description' }] });
Cursor.prototype.projection.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.projection.topologies = [0, 1, 2];
Cursor.prototype.projection.returnsPromise = false;
Cursor.prototype.projection.returnType = 'Cursor';

Cursor.prototype.readPref.help = () => new Help({ 'help': 'shell-api.cursor.help.read-pref.example', 'docs': 'shell-api.cursor.help.read-pref.link', 'attr': [{ 'description': 'shell-api.cursor.help.read-pref.description' }] });
Cursor.prototype.readPref.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.readPref.topologies = [0, 1, 2];
Cursor.prototype.readPref.returnsPromise = false;
Cursor.prototype.readPref.returnType = 'Cursor';

Cursor.prototype.returnKey.help = () => new Help({ 'help': 'shell-api.cursor.help.return-key.example', 'docs': 'shell-api.cursor.help.return-key.link', 'attr': [{ 'description': 'shell-api.cursor.help.return-key.description' }] });
Cursor.prototype.returnKey.serverVersions = ['3.2.0', '4.4.0'];
Cursor.prototype.returnKey.topologies = [0, 1, 2];
Cursor.prototype.returnKey.returnsPromise = false;
Cursor.prototype.returnKey.returnType = 'Cursor';

Cursor.prototype.size.help = () => new Help({ 'help': 'shell-api.cursor.help.size.example', 'docs': 'shell-api.cursor.help.size.link', 'attr': [{ 'description': 'shell-api.cursor.help.size.description' }] });
Cursor.prototype.size.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.size.topologies = [0, 1, 2];
Cursor.prototype.size.returnsPromise = true;
Cursor.prototype.size.returnType = 'unknown';

Cursor.prototype.skip.help = () => new Help({ 'help': 'shell-api.cursor.help.skip.example', 'docs': 'shell-api.cursor.help.skip.link', 'attr': [{ 'description': 'shell-api.cursor.help.skip.description' }] });
Cursor.prototype.skip.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.skip.topologies = [0, 1, 2];
Cursor.prototype.skip.returnsPromise = false;
Cursor.prototype.skip.returnType = 'Cursor';

Cursor.prototype.sort.help = () => new Help({ 'help': 'shell-api.cursor.help.sort.example', 'docs': 'shell-api.cursor.help.sort.link', 'attr': [{ 'description': 'shell-api.cursor.help.sort.description' }] });
Cursor.prototype.sort.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.sort.topologies = [0, 1, 2];
Cursor.prototype.sort.returnsPromise = false;
Cursor.prototype.sort.returnType = 'Cursor';

Cursor.prototype.tailable.help = () => new Help({ 'help': 'shell-api.cursor.help.tailable.example', 'docs': 'shell-api.cursor.help.tailable.link', 'attr': [{ 'description': 'shell-api.cursor.help.tailable.description' }] });
Cursor.prototype.tailable.serverVersions = ['3.2.0', '4.4.0'];
Cursor.prototype.tailable.topologies = [0, 1, 2];
Cursor.prototype.tailable.returnsPromise = false;
Cursor.prototype.tailable.returnType = 'Cursor';

Cursor.prototype.toArray.help = () => new Help({ 'help': 'shell-api.cursor.help.to-array.example', 'docs': 'shell-api.cursor.help.to-array.link', 'attr': [{ 'description': 'shell-api.cursor.help.to-array.description' }] });
Cursor.prototype.toArray.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.toArray.topologies = [0, 1, 2];
Cursor.prototype.toArray.returnsPromise = true;
Cursor.prototype.toArray.returnType = 'unknown';


class Database {
  constructor(_mapper, _name) {
    const proxy = new Proxy(this, {
      get: (obj, prop) => {
        if (!(prop in obj)) {
          obj[prop] = new Collection(_mapper, proxy, prop);
        }

        return obj[prop];
      }
    });
    this._mapper = _mapper;
    this._name = _name;

    this.toReplString = () => {
      return this._name;
    };

    this.shellApiType = () => {
      return 'Database';
    };
    this.help = () => new Help({ 'help': 'shell-api.database.description', 'docs': 'shell-api.database.link', 'attr': [{ 'name': 'runCommand', 'description': 'shell-api.database.help.run-command' }, { 'name': 'getCollectionNames', 'description': 'shell-api.collection.help.get-collection-names.description' }, { 'name': 'getCollectionInfos', 'description': 'shell-api.collection.help.get-collection-infos.description' }] });

    return proxy;
  }

  runCommand(...args) {
    return this._mapper.runCommand(this, ...args);
  }

  getCollectionNames(...args) {
    return this._mapper.getCollectionNames(this, ...args);
  }

  getCollectionInfos(...args) {
    return this._mapper.getCollectionInfos(this, ...args);
  }
}


Database.prototype.runCommand.help = () => new Help({ 'help': 'shell-api.database.help.run-command.example', 'docs': 'shell-api.database.help.run-command.link', 'attr': [{ 'description': 'shell-api.database.help.run-command.description' }] });
Database.prototype.runCommand.serverVersions = ['0.0.0', '4.4.0'];
Database.prototype.runCommand.topologies = [0, 1, 2];
Database.prototype.runCommand.returnsPromise = false;
Database.prototype.runCommand.returnType = 'unknown';

Database.prototype.getCollectionNames.help = () => new Help({ 'help': 'shell-api.database.help.get-collection-names.example', 'docs': 'shell-api.database.help.get-collection-names.link', 'attr': [{ 'description': 'shell-api.database.help.get-collection-names.description' }] });
Database.prototype.getCollectionNames.serverVersions = ['0.0.0', '4.4.0'];
Database.prototype.getCollectionNames.topologies = [0, 1, 2];
Database.prototype.getCollectionNames.returnsPromise = true;
Database.prototype.getCollectionNames.returnType = 'unknown';

Database.prototype.getCollectionInfos.help = () => new Help({ 'help': 'shell-api.database.help.get-collection-infos.example', 'docs': 'shell-api.database.help.get-collection-infos.link', 'attr': [{ 'description': 'shell-api.database.help.get-collection-infos.description' }] });
Database.prototype.getCollectionInfos.serverVersions = ['3.0.0', '4.4.0'];
Database.prototype.getCollectionInfos.topologies = [0, 1, 2];
Database.prototype.getCollectionInfos.returnsPromise = true;
Database.prototype.getCollectionInfos.returnType = 'unknown';


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
    this.help = () => new Help({ 'help': 'shell-api.replica-set.description', 'docs': 'shell-api.replica-set.link' });
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
    this.help = () => new Help({ 'help': 'shell-api.shard.description', 'docs': 'shell-api.shard.link' });
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
export { UpdateResult };
export { ReadPreference };
export { DBQuery };
export { ServerVersions };
export { Topologies };
