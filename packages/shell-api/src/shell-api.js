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
    this.help = () => new Help({ 'help': 'shell-api.classes.AggregationCursor.help.description', 'docs': 'shell-api.classes.AggregationCursor.help.link', 'attr': [{ 'name': 'close', 'description': 'shell-api.classes.AggregationCursor.help.attributes.close.description' }, { 'name': 'forEach', 'description': 'shell-api.classes.AggregationCursor.help.attributes.forEach.description' }, { 'name': 'hasNext', 'description': 'shell-api.classes.AggregationCursor.help.attributes.hasNext.description' }, { 'name': 'isClosed', 'description': 'shell-api.classes.AggregationCursor.help.attributes.isClosed.description' }, { 'name': 'isExhausted', 'description': 'shell-api.classes.AggregationCursor.help.attributes.isExhausted.description' }, { 'name': 'itcount', 'description': 'shell-api.classes.AggregationCursor.help.attributes.itcount.description' }, { 'name': 'map', 'description': 'shell-api.classes.AggregationCursor.help.attributes.map.description' }, { 'name': 'next', 'description': 'shell-api.classes.AggregationCursor.help.attributes.next.description' }, { 'name': 'toArray', 'description': 'shell-api.classes.AggregationCursor.help.attributes.toArray.description' }] });
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
    this._cursor.map(...args);
    return this;
  }

  next(...args) {
    return this._cursor.next(...args);
  }

  toArray(...args) {
    return this._cursor.toArray(...args);
  }
}


AggregationCursor.prototype.close.help = () => new Help({ 'help': 'shell-api.classes.AggregationCursor.help.attributes.close.example', 'docs': 'shell-api.classes.AggregationCursor.help.attributes.close.link', 'attr': [{ 'description': 'shell-api.classes.AggregationCursor.help.attributes.close.description' }] });
AggregationCursor.prototype.close.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.close.topologies = [0, 1, 2];
AggregationCursor.prototype.close.returnsPromise = false;
AggregationCursor.prototype.close.returnType = 'unknown';

AggregationCursor.prototype.forEach.help = () => new Help({ 'help': 'shell-api.classes.AggregationCursor.help.attributes.forEach.example', 'docs': 'shell-api.classes.AggregationCursor.help.attributes.forEach.link', 'attr': [{ 'description': 'shell-api.classes.AggregationCursor.help.attributes.forEach.description' }] });
AggregationCursor.prototype.forEach.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.forEach.topologies = [0, 1, 2];
AggregationCursor.prototype.forEach.returnsPromise = true;
AggregationCursor.prototype.forEach.returnType = 'unknown';

AggregationCursor.prototype.hasNext.help = () => new Help({ 'help': 'shell-api.classes.AggregationCursor.help.attributes.hasNext.example', 'docs': 'shell-api.classes.AggregationCursor.help.attributes.hasNext.link', 'attr': [{ 'description': 'shell-api.classes.AggregationCursor.help.attributes.hasNext.description' }] });
AggregationCursor.prototype.hasNext.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.hasNext.topologies = [0, 1, 2];
AggregationCursor.prototype.hasNext.returnsPromise = true;
AggregationCursor.prototype.hasNext.returnType = 'unknown';

AggregationCursor.prototype.isClosed.help = () => new Help({ 'help': 'shell-api.classes.AggregationCursor.help.attributes.isClosed.example', 'docs': 'shell-api.classes.AggregationCursor.help.attributes.isClosed.link', 'attr': [{ 'description': 'shell-api.classes.AggregationCursor.help.attributes.isClosed.description' }] });
AggregationCursor.prototype.isClosed.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.isClosed.topologies = [0, 1, 2];
AggregationCursor.prototype.isClosed.returnsPromise = false;
AggregationCursor.prototype.isClosed.returnType = 'unknown';

AggregationCursor.prototype.isExhausted.help = () => new Help({ 'help': 'shell-api.classes.AggregationCursor.help.attributes.isExhausted.example', 'docs': 'shell-api.classes.AggregationCursor.help.attributes.isExhausted.link', 'attr': [{ 'description': 'shell-api.classes.AggregationCursor.help.attributes.isExhausted.description' }] });
AggregationCursor.prototype.isExhausted.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.isExhausted.topologies = [0, 1, 2];
AggregationCursor.prototype.isExhausted.returnsPromise = false;
AggregationCursor.prototype.isExhausted.returnType = 'unknown';

AggregationCursor.prototype.itcount.help = () => new Help({ 'help': 'shell-api.classes.AggregationCursor.help.attributes.itcount.example', 'docs': 'shell-api.classes.AggregationCursor.help.attributes.itcount.link', 'attr': [{ 'description': 'shell-api.classes.AggregationCursor.help.attributes.itcount.description' }] });
AggregationCursor.prototype.itcount.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.itcount.topologies = [0, 1, 2];
AggregationCursor.prototype.itcount.returnsPromise = true;
AggregationCursor.prototype.itcount.returnType = 'unknown';

AggregationCursor.prototype.map.help = () => new Help({ 'help': 'shell-api.classes.AggregationCursor.help.attributes.map.example', 'docs': 'shell-api.classes.AggregationCursor.help.attributes.map.link', 'attr': [{ 'description': 'shell-api.classes.AggregationCursor.help.attributes.map.description' }] });
AggregationCursor.prototype.map.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.map.topologies = [0, 1, 2];
AggregationCursor.prototype.map.returnsPromise = false;
AggregationCursor.prototype.map.returnType = 'AggregationCursor';

AggregationCursor.prototype.next.help = () => new Help({ 'help': 'shell-api.classes.AggregationCursor.help.attributes.next.example', 'docs': 'shell-api.classes.AggregationCursor.help.attributes.next.link', 'attr': [{ 'description': 'shell-api.classes.AggregationCursor.help.attributes.next.description' }] });
AggregationCursor.prototype.next.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.next.topologies = [0, 1, 2];
AggregationCursor.prototype.next.returnsPromise = true;
AggregationCursor.prototype.next.returnType = 'unknown';

AggregationCursor.prototype.toArray.help = () => new Help({ 'help': 'shell-api.classes.AggregationCursor.help.attributes.toArray.example', 'docs': 'shell-api.classes.AggregationCursor.help.attributes.toArray.link', 'attr': [{ 'description': 'shell-api.classes.AggregationCursor.help.attributes.toArray.description' }] });
AggregationCursor.prototype.toArray.serverVersions = ['0.0.0', '4.4.0'];
AggregationCursor.prototype.toArray.topologies = [0, 1, 2];
AggregationCursor.prototype.toArray.returnsPromise = true;
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
    this.help = () => new Help({ 'help': 'shell-api.classes.BulkWriteResult.help.description', 'docs': 'shell-api.classes.BulkWriteResult.help.link', 'attr': [] });
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
    this.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.description', 'docs': 'shell-api.classes.Collection.help.link', 'attr': [{ 'name': 'aggregate', 'description': 'shell-api.classes.Collection.help.attributes.aggregate.description' }, { 'name': 'bulkWrite', 'description': 'shell-api.classes.Collection.help.attributes.bulkWrite.description' }, { 'name': 'countDocuments', 'description': 'shell-api.classes.Collection.help.attributes.countDocuments.description' }, { 'name': 'count', 'description': 'shell-api.classes.Collection.help.attributes.count.description' }, { 'name': 'deleteMany', 'description': 'shell-api.classes.Collection.help.attributes.deleteMany.description' }, { 'name': 'deleteOne', 'description': 'shell-api.classes.Collection.help.attributes.deleteOne.description' }, { 'name': 'distinct', 'description': 'shell-api.classes.Collection.help.attributes.distinct.description' }, { 'name': 'estimatedDocumentCount', 'description': 'shell-api.classes.Collection.help.attributes.estimatedDocumentCount.description' }, { 'name': 'find', 'description': 'shell-api.classes.Collection.help.attributes.find.description' }, { 'name': 'findAndModify', 'description': 'shell-api.classes.Collection.help.attributes.findAndModify.description' }, { 'name': 'findOne', 'description': 'shell-api.classes.Collection.help.attributes.findOne.description' }, { 'name': 'findOneAndDelete', 'description': 'shell-api.classes.Collection.help.attributes.findOneAndDelete.description' }, { 'name': 'findOneAndReplace', 'description': 'shell-api.classes.Collection.help.attributes.findOneAndReplace.description' }, { 'name': 'findOneAndUpdate', 'description': 'shell-api.classes.Collection.help.attributes.findOneAndUpdate.description' }, { 'name': 'insert', 'description': 'shell-api.classes.Collection.help.attributes.insert.description' }, { 'name': 'insertMany', 'description': 'shell-api.classes.Collection.help.attributes.insertMany.description' }, { 'name': 'insertOne', 'description': 'shell-api.classes.Collection.help.attributes.insertOne.description' }, { 'name': 'isCapped', 'description': 'shell-api.classes.Collection.help.attributes.isCapped.description' }, { 'name': 'remove', 'description': 'shell-api.classes.Collection.help.attributes.remove.description' }, { 'name': 'save', 'description': 'shell-api.classes.Collection.help.attributes.save.description' }, { 'name': 'replaceOne', 'description': 'shell-api.classes.Collection.help.attributes.replaceOne.description' }, { 'name': 'update', 'description': 'shell-api.classes.Collection.help.attributes.update.description' }, { 'name': 'updateMany', 'description': 'shell-api.classes.Collection.help.attributes.updateMany.description' }, { 'name': 'updateOne', 'description': 'shell-api.classes.Collection.help.attributes.updateOne.description' }, { 'name': 'convertToCapped', 'description': 'shell-api.classes.Collection.help.attributes.convertToCapped.description' }, { 'name': 'createIndexes', 'description': 'shell-api.classes.Collection.help.attributes.createIndexes.description' }, { 'name': 'createIndex', 'description': 'shell-api.classes.Collection.help.attributes.createIndex.description' }, { 'name': 'ensureIndex', 'description': 'shell-api.classes.Collection.help.attributes.ensureIndex.description' }, { 'name': 'getIndexes', 'description': 'shell-api.classes.Collection.help.attributes.getIndexes.description' }, { 'name': 'getIndexSpecs', 'description': 'shell-api.classes.Collection.help.attributes.getIndexSpecs.description' }, { 'name': 'getIndexKeys', 'description': 'shell-api.classes.Collection.help.attributes.getIndexKeys.description' }, { 'name': 'getIndices', 'description': 'shell-api.classes.Collection.help.attributes.getIndices.description' }, { 'name': 'dropIndexes', 'description': 'shell-api.classes.Collection.help.attributes.dropIndexes.description' }, { 'name': 'dropIndex', 'description': 'shell-api.classes.Collection.help.attributes.dropIndex.description' }, { 'name': 'reIndex', 'description': 'shell-api.classes.Collection.help.attributes.reIndex.description' }, { 'name': 'totalIndexSize', 'description': 'shell-api.classes.Collection.help.attributes.totalIndexSize.description' }, { 'name': 'getDB', 'description': 'shell-api.classes.Collection.help.attributes.getDB.description' }, { 'name': 'stats', 'description': 'shell-api.classes.Collection.help.attributes.stats.description' }, { 'name': 'dataSize', 'description': 'shell-api.classes.Collection.help.attributes.dataSize.description' }, { 'name': 'storageSize', 'description': 'shell-api.classes.Collection.help.attributes.storageSize.description' }, { 'name': 'totalSize', 'description': 'shell-api.classes.Collection.help.attributes.totalSize.description' }] });
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


Collection.prototype.aggregate.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.aggregate.example', 'docs': 'shell-api.classes.Collection.help.attributes.aggregate.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.aggregate.description' }] });
Collection.prototype.aggregate.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.aggregate.topologies = [0, 1, 2];
Collection.prototype.aggregate.returnsPromise = false;
Collection.prototype.aggregate.returnType = 'AggregationCursor';

Collection.prototype.bulkWrite.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.bulkWrite.example', 'docs': 'shell-api.classes.Collection.help.attributes.bulkWrite.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.bulkWrite.description' }] });
Collection.prototype.bulkWrite.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.bulkWrite.topologies = [0, 1, 2];
Collection.prototype.bulkWrite.returnsPromise = true;
Collection.prototype.bulkWrite.returnType = 'unknown';

Collection.prototype.countDocuments.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.countDocuments.example', 'docs': 'shell-api.classes.Collection.help.attributes.countDocuments.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.countDocuments.description' }] });
Collection.prototype.countDocuments.serverVersions = ['4.0.3', '4.4.0'];
Collection.prototype.countDocuments.topologies = [0, 1, 2];
Collection.prototype.countDocuments.returnsPromise = true;
Collection.prototype.countDocuments.returnType = 'unknown';

Collection.prototype.count.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.count.example', 'docs': 'shell-api.classes.Collection.help.attributes.count.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.count.description' }] });
Collection.prototype.count.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.count.topologies = [0, 1, 2];
Collection.prototype.count.returnsPromise = true;
Collection.prototype.count.returnType = 'unknown';

Collection.prototype.deleteMany.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.deleteMany.example', 'docs': 'shell-api.classes.Collection.help.attributes.deleteMany.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.deleteMany.description' }] });
Collection.prototype.deleteMany.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.deleteMany.topologies = [0, 1, 2];
Collection.prototype.deleteMany.returnsPromise = true;
Collection.prototype.deleteMany.returnType = 'unknown';

Collection.prototype.deleteOne.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.deleteOne.example', 'docs': 'shell-api.classes.Collection.help.attributes.deleteOne.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.deleteOne.description' }] });
Collection.prototype.deleteOne.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.deleteOne.topologies = [0, 1, 2];
Collection.prototype.deleteOne.returnsPromise = true;
Collection.prototype.deleteOne.returnType = 'unknown';

Collection.prototype.distinct.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.distinct.example', 'docs': 'shell-api.classes.Collection.help.attributes.distinct.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.distinct.description' }] });
Collection.prototype.distinct.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.distinct.topologies = [0, 1, 2];
Collection.prototype.distinct.returnsPromise = false;
Collection.prototype.distinct.returnType = 'Cursor';

Collection.prototype.estimatedDocumentCount.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.estimatedDocumentCount.example', 'docs': 'shell-api.classes.Collection.help.attributes.estimatedDocumentCount.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.estimatedDocumentCount.description' }] });
Collection.prototype.estimatedDocumentCount.serverVersions = ['4.0.3', '4.4.0'];
Collection.prototype.estimatedDocumentCount.topologies = [0, 1, 2];
Collection.prototype.estimatedDocumentCount.returnsPromise = true;
Collection.prototype.estimatedDocumentCount.returnType = 'unknown';

Collection.prototype.find.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.find.example', 'docs': 'shell-api.classes.Collection.help.attributes.find.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.find.description' }] });
Collection.prototype.find.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.find.topologies = [0, 1, 2];
Collection.prototype.find.returnsPromise = false;
Collection.prototype.find.returnType = 'Cursor';

Collection.prototype.findAndModify.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.findAndModify.example', 'docs': 'shell-api.classes.Collection.help.attributes.findAndModify.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.findAndModify.description' }] });
Collection.prototype.findAndModify.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.findAndModify.topologies = [0, 1, 2];
Collection.prototype.findAndModify.returnsPromise = false;
Collection.prototype.findAndModify.returnType = 'unknown';

Collection.prototype.findOne.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.findOne.example', 'docs': 'shell-api.classes.Collection.help.attributes.findOne.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.findOne.description' }] });
Collection.prototype.findOne.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.findOne.topologies = [0, 1, 2];
Collection.prototype.findOne.returnsPromise = false;
Collection.prototype.findOne.returnType = 'unknown';

Collection.prototype.findOneAndDelete.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.findOneAndDelete.example', 'docs': 'shell-api.classes.Collection.help.attributes.findOneAndDelete.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.findOneAndDelete.description' }] });
Collection.prototype.findOneAndDelete.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.findOneAndDelete.topologies = [0, 1, 2];
Collection.prototype.findOneAndDelete.returnsPromise = true;
Collection.prototype.findOneAndDelete.returnType = 'unknown';

Collection.prototype.findOneAndReplace.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.findOneAndReplace.example', 'docs': 'shell-api.classes.Collection.help.attributes.findOneAndReplace.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.findOneAndReplace.description' }] });
Collection.prototype.findOneAndReplace.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.findOneAndReplace.topologies = [0, 1, 2];
Collection.prototype.findOneAndReplace.returnsPromise = true;
Collection.prototype.findOneAndReplace.returnType = 'unknown';

Collection.prototype.findOneAndUpdate.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.findOneAndUpdate.example', 'docs': 'shell-api.classes.Collection.help.attributes.findOneAndUpdate.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.findOneAndUpdate.description' }] });
Collection.prototype.findOneAndUpdate.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.findOneAndUpdate.topologies = [0, 1, 2];
Collection.prototype.findOneAndUpdate.returnsPromise = true;
Collection.prototype.findOneAndUpdate.returnType = 'unknown';

Collection.prototype.insert.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.insert.example', 'docs': 'shell-api.classes.Collection.help.attributes.insert.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.insert.description' }] });
Collection.prototype.insert.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.insert.topologies = [0, 1, 2];
Collection.prototype.insert.returnsPromise = true;
Collection.prototype.insert.returnType = 'unknown';

Collection.prototype.insertMany.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.insertMany.example', 'docs': 'shell-api.classes.Collection.help.attributes.insertMany.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.insertMany.description' }] });
Collection.prototype.insertMany.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.insertMany.topologies = [0, 1, 2];
Collection.prototype.insertMany.returnsPromise = true;
Collection.prototype.insertMany.returnType = 'unknown';

Collection.prototype.insertOne.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.insertOne.example', 'docs': 'shell-api.classes.Collection.help.attributes.insertOne.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.insertOne.description' }] });
Collection.prototype.insertOne.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.insertOne.topologies = [0, 1, 2];
Collection.prototype.insertOne.returnsPromise = true;
Collection.prototype.insertOne.returnType = 'unknown';

Collection.prototype.isCapped.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.isCapped.example', 'docs': 'shell-api.classes.Collection.help.attributes.isCapped.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.isCapped.description' }] });
Collection.prototype.isCapped.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.isCapped.topologies = [0, 1, 2];
Collection.prototype.isCapped.returnsPromise = true;
Collection.prototype.isCapped.returnType = 'unknown';

Collection.prototype.remove.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.remove.example', 'docs': 'shell-api.classes.Collection.help.attributes.remove.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.remove.description' }] });
Collection.prototype.remove.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.remove.topologies = [0, 1, 2];
Collection.prototype.remove.returnsPromise = true;
Collection.prototype.remove.returnType = 'unknown';

Collection.prototype.save.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.save.example', 'docs': 'shell-api.classes.Collection.help.attributes.save.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.save.description' }] });
Collection.prototype.save.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.save.topologies = [0, 1, 2];
Collection.prototype.save.returnsPromise = true;
Collection.prototype.save.returnType = 'unknown';

Collection.prototype.replaceOne.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.replaceOne.example', 'docs': 'shell-api.classes.Collection.help.attributes.replaceOne.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.replaceOne.description' }] });
Collection.prototype.replaceOne.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.replaceOne.topologies = [0, 1, 2];
Collection.prototype.replaceOne.returnsPromise = true;
Collection.prototype.replaceOne.returnType = 'unknown';

Collection.prototype.update.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.update.example', 'docs': 'shell-api.classes.Collection.help.attributes.update.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.update.description' }] });
Collection.prototype.update.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.update.topologies = [0, 1, 2];
Collection.prototype.update.returnsPromise = true;
Collection.prototype.update.returnType = 'unknown';

Collection.prototype.updateMany.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.updateMany.example', 'docs': 'shell-api.classes.Collection.help.attributes.updateMany.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.updateMany.description' }] });
Collection.prototype.updateMany.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.updateMany.topologies = [0, 1, 2];
Collection.prototype.updateMany.returnsPromise = true;
Collection.prototype.updateMany.returnType = 'unknown';

Collection.prototype.updateOne.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.updateOne.example', 'docs': 'shell-api.classes.Collection.help.attributes.updateOne.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.updateOne.description' }] });
Collection.prototype.updateOne.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.updateOne.topologies = [0, 1, 2];
Collection.prototype.updateOne.returnsPromise = true;
Collection.prototype.updateOne.returnType = 'unknown';

Collection.prototype.convertToCapped.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.convertToCapped.example', 'docs': 'shell-api.classes.Collection.help.attributes.convertToCapped.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.convertToCapped.description' }] });
Collection.prototype.convertToCapped.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.convertToCapped.topologies = [0, 1, 2];
Collection.prototype.convertToCapped.returnsPromise = true;
Collection.prototype.convertToCapped.returnType = 'unknown';

Collection.prototype.createIndexes.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.createIndexes.example', 'docs': 'shell-api.classes.Collection.help.attributes.createIndexes.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.createIndexes.description' }] });
Collection.prototype.createIndexes.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.createIndexes.topologies = [0, 1, 2];
Collection.prototype.createIndexes.returnsPromise = true;
Collection.prototype.createIndexes.returnType = 'unknown';

Collection.prototype.createIndex.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.createIndex.example', 'docs': 'shell-api.classes.Collection.help.attributes.createIndex.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.createIndex.description' }] });
Collection.prototype.createIndex.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.createIndex.topologies = [0, 1, 2];
Collection.prototype.createIndex.returnsPromise = true;
Collection.prototype.createIndex.returnType = 'unknown';

Collection.prototype.ensureIndex.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.ensureIndex.example', 'docs': 'shell-api.classes.Collection.help.attributes.ensureIndex.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.ensureIndex.description' }] });
Collection.prototype.ensureIndex.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.ensureIndex.topologies = [0, 1, 2];
Collection.prototype.ensureIndex.returnsPromise = true;
Collection.prototype.ensureIndex.returnType = 'unknown';

Collection.prototype.getIndexes.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.getIndexes.example', 'docs': 'shell-api.classes.Collection.help.attributes.getIndexes.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.getIndexes.description' }] });
Collection.prototype.getIndexes.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.getIndexes.topologies = [0, 1, 2];
Collection.prototype.getIndexes.returnsPromise = true;
Collection.prototype.getIndexes.returnType = 'unknown';

Collection.prototype.getIndexSpecs.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.getIndexSpecs.example', 'docs': 'shell-api.classes.Collection.help.attributes.getIndexSpecs.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.getIndexSpecs.description' }] });
Collection.prototype.getIndexSpecs.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.getIndexSpecs.topologies = [0, 1, 2];
Collection.prototype.getIndexSpecs.returnsPromise = true;
Collection.prototype.getIndexSpecs.returnType = 'unknown';

Collection.prototype.getIndexKeys.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.getIndexKeys.example', 'docs': 'shell-api.classes.Collection.help.attributes.getIndexKeys.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.getIndexKeys.description' }] });
Collection.prototype.getIndexKeys.serverVersions = ['3.2.0', '4.4.0'];
Collection.prototype.getIndexKeys.topologies = [0, 1, 2];
Collection.prototype.getIndexKeys.returnsPromise = true;
Collection.prototype.getIndexKeys.returnType = 'unknown';

Collection.prototype.getIndices.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.getIndices.example', 'docs': 'shell-api.classes.Collection.help.attributes.getIndices.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.getIndices.description' }] });
Collection.prototype.getIndices.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.getIndices.topologies = [0, 1, 2];
Collection.prototype.getIndices.returnsPromise = true;
Collection.prototype.getIndices.returnType = 'unknown';

Collection.prototype.dropIndexes.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.dropIndexes.example', 'docs': 'shell-api.classes.Collection.help.attributes.dropIndexes.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.dropIndexes.description' }] });
Collection.prototype.dropIndexes.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.dropIndexes.topologies = [0, 1, 2];
Collection.prototype.dropIndexes.returnsPromise = true;
Collection.prototype.dropIndexes.returnType = 'unknown';

Collection.prototype.dropIndex.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.dropIndex.example', 'docs': 'shell-api.classes.Collection.help.attributes.dropIndex.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.dropIndex.description' }] });
Collection.prototype.dropIndex.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.dropIndex.topologies = [0, 1, 2];
Collection.prototype.dropIndex.returnsPromise = true;
Collection.prototype.dropIndex.returnType = 'unknown';

Collection.prototype.reIndex.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.reIndex.example', 'docs': 'shell-api.classes.Collection.help.attributes.reIndex.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.reIndex.description' }] });
Collection.prototype.reIndex.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.reIndex.topologies = [0, 1, 2];
Collection.prototype.reIndex.returnsPromise = true;
Collection.prototype.reIndex.returnType = 'unknown';

Collection.prototype.totalIndexSize.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.totalIndexSize.example', 'docs': 'shell-api.classes.Collection.help.attributes.totalIndexSize.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.totalIndexSize.description' }] });
Collection.prototype.totalIndexSize.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.totalIndexSize.topologies = [0, 1, 2];
Collection.prototype.totalIndexSize.returnsPromise = true;
Collection.prototype.totalIndexSize.returnType = 'unknown';

Collection.prototype.getDB.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.getDB.example', 'docs': 'shell-api.classes.Collection.help.attributes.getDB.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.getDB.description' }] });
Collection.prototype.getDB.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.getDB.topologies = [0, 1, 2];
Collection.prototype.getDB.returnsPromise = false;
Collection.prototype.getDB.returnType = 'Database';

Collection.prototype.stats.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.stats.example', 'docs': 'shell-api.classes.Collection.help.attributes.stats.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.stats.description' }] });
Collection.prototype.stats.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.stats.topologies = [0, 1, 2];
Collection.prototype.stats.returnsPromise = true;
Collection.prototype.stats.returnType = 'unknown';

Collection.prototype.dataSize.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.dataSize.example', 'docs': 'shell-api.classes.Collection.help.attributes.dataSize.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.dataSize.description' }] });
Collection.prototype.dataSize.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.dataSize.topologies = [0, 1, 2];
Collection.prototype.dataSize.returnsPromise = true;
Collection.prototype.dataSize.returnType = 'unknown';

Collection.prototype.storageSize.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.storageSize.example', 'docs': 'shell-api.classes.Collection.help.attributes.storageSize.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.storageSize.description' }] });
Collection.prototype.storageSize.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.storageSize.topologies = [0, 1, 2];
Collection.prototype.storageSize.returnsPromise = true;
Collection.prototype.storageSize.returnType = 'unknown';

Collection.prototype.totalSize.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.attributes.totalSize.example', 'docs': 'shell-api.classes.Collection.help.attributes.totalSize.link', 'attr': [{ 'description': 'shell-api.classes.Collection.help.attributes.totalSize.description' }] });
Collection.prototype.totalSize.serverVersions = ['0.0.0', '4.4.0'];
Collection.prototype.totalSize.topologies = [0, 1, 2];
Collection.prototype.totalSize.returnsPromise = true;
Collection.prototype.totalSize.returnType = 'unknown';


class CommandResult {
  constructor(value) {
    this.value = value;

    this.toReplString = () => {
      return this.value;
    };

    this.shellApiType = () => {
      return 'CommandResult';
    };
    this.help = () => new Help({ 'help': 'shell-api.command-result.description' });
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
    this.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.description', 'docs': 'shell-api.classes.Cursor.help.link', 'attr': [{ 'name': 'addOption', 'description': 'shell-api.classes.Cursor.help.attributes.addOption.description' }, { 'name': 'allowPartialResults', 'description': 'shell-api.classes.Cursor.help.attributes.allowPartialResults.description' }, { 'name': 'arrayAccess', 'description': 'shell-api.classes.Cursor.help.attributes.arrayAccess.description' }, { 'name': 'batchSize', 'description': 'shell-api.classes.Cursor.help.attributes.batchSize.description' }, { 'name': 'clone', 'description': 'shell-api.classes.Cursor.help.attributes.clone.description' }, { 'name': 'close', 'description': 'shell-api.classes.Cursor.help.attributes.close.description' }, { 'name': 'collation', 'description': 'shell-api.classes.Cursor.help.attributes.collation.description' }, { 'name': 'comment', 'description': 'shell-api.classes.Cursor.help.attributes.comment.description' }, { 'name': 'count', 'description': 'shell-api.classes.Cursor.help.attributes.count.description' }, { 'name': 'explain', 'description': 'shell-api.classes.Cursor.help.attributes.explain.description' }, { 'name': 'forEach', 'description': 'shell-api.classes.Cursor.help.attributes.forEach.description' }, { 'name': 'hasNext', 'description': 'shell-api.classes.Cursor.help.attributes.hasNext.description' }, { 'name': 'hint', 'description': 'shell-api.classes.Cursor.help.attributes.hint.description' }, { 'name': 'isClosed', 'description': 'shell-api.classes.Cursor.help.attributes.isClosed.description' }, { 'name': 'isExhausted', 'description': 'shell-api.classes.Cursor.help.attributes.isExhausted.description' }, { 'name': 'itcount', 'description': 'shell-api.classes.Cursor.help.attributes.itcount.description' }, { 'name': 'limit', 'description': 'shell-api.classes.Cursor.help.attributes.limit.description' }, { 'name': 'map', 'description': 'shell-api.classes.Cursor.help.attributes.map.description' }, { 'name': 'max', 'description': 'shell-api.classes.Cursor.help.attributes.max.description' }, { 'name': 'maxTimeMS', 'description': 'shell-api.classes.Cursor.help.attributes.maxTimeMS.description' }, { 'name': 'min', 'description': 'shell-api.classes.Cursor.help.attributes.min.description' }, { 'name': 'next', 'description': 'shell-api.classes.Cursor.help.attributes.next.description' }, { 'name': 'noCursorTimeout', 'description': 'shell-api.classes.Cursor.help.attributes.noCursorTimeout.description' }, { 'name': 'oplogReplay', 'description': 'shell-api.classes.Cursor.help.attributes.oplogReplay.description' }, { 'name': 'projection', 'description': 'shell-api.classes.Cursor.help.attributes.projection.description' }, { 'name': 'readPref', 'description': 'shell-api.classes.Cursor.help.attributes.readPref.description' }, { 'name': 'returnKey', 'description': 'shell-api.classes.Cursor.help.attributes.returnKey.description' }, { 'name': 'size', 'description': 'shell-api.classes.Cursor.help.attributes.size.description' }, { 'name': 'skip', 'description': 'shell-api.classes.Cursor.help.attributes.skip.description' }, { 'name': 'sort', 'description': 'shell-api.classes.Cursor.help.attributes.sort.description' }, { 'name': 'tailable', 'description': 'shell-api.classes.Cursor.help.attributes.tailable.description' }, { 'name': 'toArray', 'description': 'shell-api.classes.Cursor.help.attributes.toArray.description' }] });
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


Cursor.prototype.addOption.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.addOption.example', 'docs': 'shell-api.classes.Cursor.help.attributes.addOption.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.addOption.description' }] });
Cursor.prototype.addOption.serverVersions = ['0.0.0', '3.2.0'];
Cursor.prototype.addOption.topologies = [0, 1, 2];
Cursor.prototype.addOption.returnsPromise = false;
Cursor.prototype.addOption.returnType = 'Cursor';

Cursor.prototype.allowPartialResults.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.allowPartialResults.example', 'docs': 'shell-api.classes.Cursor.help.attributes.allowPartialResults.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.allowPartialResults.description' }] });
Cursor.prototype.allowPartialResults.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.allowPartialResults.topologies = [0, 1, 2];
Cursor.prototype.allowPartialResults.returnsPromise = false;
Cursor.prototype.allowPartialResults.returnType = 'Cursor';

Cursor.prototype.arrayAccess.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.arrayAccess.example', 'docs': 'shell-api.classes.Cursor.help.attributes.arrayAccess.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.arrayAccess.description' }] });
Cursor.prototype.arrayAccess.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.arrayAccess.topologies = [0, 1, 2];
Cursor.prototype.arrayAccess.returnsPromise = false;
Cursor.prototype.arrayAccess.returnType = 'unknown';

Cursor.prototype.batchSize.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.batchSize.example', 'docs': 'shell-api.classes.Cursor.help.attributes.batchSize.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.batchSize.description' }] });
Cursor.prototype.batchSize.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.batchSize.topologies = [0, 1, 2];
Cursor.prototype.batchSize.returnsPromise = false;
Cursor.prototype.batchSize.returnType = 'Cursor';

Cursor.prototype.clone.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.clone.example', 'docs': 'shell-api.classes.Cursor.help.attributes.clone.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.clone.description' }] });
Cursor.prototype.clone.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.clone.topologies = [0, 1, 2];
Cursor.prototype.clone.returnsPromise = false;
Cursor.prototype.clone.returnType = 'Cursor';

Cursor.prototype.close.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.close.example', 'docs': 'shell-api.classes.Cursor.help.attributes.close.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.close.description' }] });
Cursor.prototype.close.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.close.topologies = [0, 1, 2];
Cursor.prototype.close.returnsPromise = false;
Cursor.prototype.close.returnType = 'unknown';

Cursor.prototype.collation.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.collation.example', 'docs': 'shell-api.classes.Cursor.help.attributes.collation.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.collation.description' }] });
Cursor.prototype.collation.serverVersions = ['3.4.0', '4.4.0'];
Cursor.prototype.collation.topologies = [0, 1, 2];
Cursor.prototype.collation.returnsPromise = false;
Cursor.prototype.collation.returnType = 'Cursor';

Cursor.prototype.comment.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.comment.example', 'docs': 'shell-api.classes.Cursor.help.attributes.comment.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.comment.description' }] });
Cursor.prototype.comment.serverVersions = ['3.2.0', '4.4.0'];
Cursor.prototype.comment.topologies = [0, 1, 2];
Cursor.prototype.comment.returnsPromise = false;
Cursor.prototype.comment.returnType = 'Cursor';

Cursor.prototype.count.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.count.example', 'docs': 'shell-api.classes.Cursor.help.attributes.count.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.count.description' }] });
Cursor.prototype.count.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.count.topologies = [0, 1, 2];
Cursor.prototype.count.returnsPromise = true;
Cursor.prototype.count.returnType = 'unknown';
Cursor.prototype.count.serverVersion = ['0.0.0', '4.0.0'];

Cursor.prototype.explain.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.explain.example', 'docs': 'shell-api.classes.Cursor.help.attributes.explain.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.explain.description' }] });
Cursor.prototype.explain.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.explain.topologies = [0, 1, 2];
Cursor.prototype.explain.returnsPromise = true;
Cursor.prototype.explain.returnType = 'unknown';

Cursor.prototype.forEach.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.forEach.example', 'docs': 'shell-api.classes.Cursor.help.attributes.forEach.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.forEach.description' }] });
Cursor.prototype.forEach.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.forEach.topologies = [0, 1, 2];
Cursor.prototype.forEach.returnsPromise = true;
Cursor.prototype.forEach.returnType = 'unknown';

Cursor.prototype.hasNext.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.hasNext.example', 'docs': 'shell-api.classes.Cursor.help.attributes.hasNext.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.hasNext.description' }] });
Cursor.prototype.hasNext.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.hasNext.topologies = [0, 1, 2];
Cursor.prototype.hasNext.returnsPromise = true;
Cursor.prototype.hasNext.returnType = 'unknown';

Cursor.prototype.hint.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.hint.example', 'docs': 'shell-api.classes.Cursor.help.attributes.hint.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.hint.description' }] });
Cursor.prototype.hint.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.hint.topologies = [0, 1, 2];
Cursor.prototype.hint.returnsPromise = false;
Cursor.prototype.hint.returnType = 'Cursor';

Cursor.prototype.isClosed.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.isClosed.example', 'docs': 'shell-api.classes.Cursor.help.attributes.isClosed.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.isClosed.description' }] });
Cursor.prototype.isClosed.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.isClosed.topologies = [0, 1, 2];
Cursor.prototype.isClosed.returnsPromise = false;
Cursor.prototype.isClosed.returnType = 'unknown';

Cursor.prototype.isExhausted.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.isExhausted.example', 'docs': 'shell-api.classes.Cursor.help.attributes.isExhausted.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.isExhausted.description' }] });
Cursor.prototype.isExhausted.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.isExhausted.topologies = [0, 1, 2];
Cursor.prototype.isExhausted.returnsPromise = false;
Cursor.prototype.isExhausted.returnType = 'unknown';

Cursor.prototype.itcount.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.itcount.example', 'docs': 'shell-api.classes.Cursor.help.attributes.itcount.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.itcount.description' }] });
Cursor.prototype.itcount.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.itcount.topologies = [0, 1, 2];
Cursor.prototype.itcount.returnsPromise = true;
Cursor.prototype.itcount.returnType = 'unknown';

Cursor.prototype.limit.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.limit.example', 'docs': 'shell-api.classes.Cursor.help.attributes.limit.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.limit.description' }] });
Cursor.prototype.limit.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.limit.topologies = [0, 1, 2];
Cursor.prototype.limit.returnsPromise = false;
Cursor.prototype.limit.returnType = 'Cursor';

Cursor.prototype.map.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.map.example', 'docs': 'shell-api.classes.Cursor.help.attributes.map.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.map.description' }] });
Cursor.prototype.map.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.map.topologies = [0, 1, 2];
Cursor.prototype.map.returnsPromise = false;
Cursor.prototype.map.returnType = 'Cursor';

Cursor.prototype.max.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.max.example', 'docs': 'shell-api.classes.Cursor.help.attributes.max.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.max.description' }] });
Cursor.prototype.max.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.max.topologies = [0, 1, 2];
Cursor.prototype.max.returnsPromise = false;
Cursor.prototype.max.returnType = 'Cursor';

Cursor.prototype.maxTimeMS.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.maxTimeMS.example', 'docs': 'shell-api.classes.Cursor.help.attributes.maxTimeMS.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.maxTimeMS.description' }] });
Cursor.prototype.maxTimeMS.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.maxTimeMS.topologies = [0, 1, 2];
Cursor.prototype.maxTimeMS.returnsPromise = false;
Cursor.prototype.maxTimeMS.returnType = 'Cursor';

Cursor.prototype.min.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.min.example', 'docs': 'shell-api.classes.Cursor.help.attributes.min.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.min.description' }] });
Cursor.prototype.min.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.min.topologies = [0, 1, 2];
Cursor.prototype.min.returnsPromise = false;
Cursor.prototype.min.returnType = 'Cursor';

Cursor.prototype.next.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.next.example', 'docs': 'shell-api.classes.Cursor.help.attributes.next.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.next.description' }] });
Cursor.prototype.next.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.next.topologies = [0, 1, 2];
Cursor.prototype.next.returnsPromise = true;
Cursor.prototype.next.returnType = 'unknown';

Cursor.prototype.noCursorTimeout.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.noCursorTimeout.example', 'docs': 'shell-api.classes.Cursor.help.attributes.noCursorTimeout.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.noCursorTimeout.description' }] });
Cursor.prototype.noCursorTimeout.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.noCursorTimeout.topologies = [0, 1, 2];
Cursor.prototype.noCursorTimeout.returnsPromise = false;
Cursor.prototype.noCursorTimeout.returnType = 'Cursor';

Cursor.prototype.oplogReplay.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.oplogReplay.example', 'docs': 'shell-api.classes.Cursor.help.attributes.oplogReplay.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.oplogReplay.description' }] });
Cursor.prototype.oplogReplay.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.oplogReplay.topologies = [0, 1, 2];
Cursor.prototype.oplogReplay.returnsPromise = false;
Cursor.prototype.oplogReplay.returnType = 'Cursor';

Cursor.prototype.projection.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.projection.example', 'docs': 'shell-api.classes.Cursor.help.attributes.projection.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.projection.description' }] });
Cursor.prototype.projection.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.projection.topologies = [0, 1, 2];
Cursor.prototype.projection.returnsPromise = false;
Cursor.prototype.projection.returnType = 'Cursor';

Cursor.prototype.readPref.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.readPref.example', 'docs': 'shell-api.classes.Cursor.help.attributes.readPref.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.readPref.description' }] });
Cursor.prototype.readPref.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.readPref.topologies = [0, 1, 2];
Cursor.prototype.readPref.returnsPromise = false;
Cursor.prototype.readPref.returnType = 'Cursor';

Cursor.prototype.returnKey.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.returnKey.example', 'docs': 'shell-api.classes.Cursor.help.attributes.returnKey.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.returnKey.description' }] });
Cursor.prototype.returnKey.serverVersions = ['3.2.0', '4.4.0'];
Cursor.prototype.returnKey.topologies = [0, 1, 2];
Cursor.prototype.returnKey.returnsPromise = false;
Cursor.prototype.returnKey.returnType = 'Cursor';

Cursor.prototype.size.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.size.example', 'docs': 'shell-api.classes.Cursor.help.attributes.size.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.size.description' }] });
Cursor.prototype.size.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.size.topologies = [0, 1, 2];
Cursor.prototype.size.returnsPromise = true;
Cursor.prototype.size.returnType = 'unknown';

Cursor.prototype.skip.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.skip.example', 'docs': 'shell-api.classes.Cursor.help.attributes.skip.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.skip.description' }] });
Cursor.prototype.skip.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.skip.topologies = [0, 1, 2];
Cursor.prototype.skip.returnsPromise = false;
Cursor.prototype.skip.returnType = 'Cursor';

Cursor.prototype.sort.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.sort.example', 'docs': 'shell-api.classes.Cursor.help.attributes.sort.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.sort.description' }] });
Cursor.prototype.sort.serverVersions = ['0.0.0', '4.4.0'];
Cursor.prototype.sort.topologies = [0, 1, 2];
Cursor.prototype.sort.returnsPromise = false;
Cursor.prototype.sort.returnType = 'Cursor';

Cursor.prototype.tailable.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.tailable.example', 'docs': 'shell-api.classes.Cursor.help.attributes.tailable.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.tailable.description' }] });
Cursor.prototype.tailable.serverVersions = ['3.2.0', '4.4.0'];
Cursor.prototype.tailable.topologies = [0, 1, 2];
Cursor.prototype.tailable.returnsPromise = false;
Cursor.prototype.tailable.returnType = 'Cursor';

Cursor.prototype.toArray.help = () => new Help({ 'help': 'shell-api.classes.Cursor.help.attributes.toArray.example', 'docs': 'shell-api.classes.Cursor.help.attributes.toArray.link', 'attr': [{ 'description': 'shell-api.classes.Cursor.help.attributes.toArray.description' }] });
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
    this.help = () => new Help({ 'help': 'shell-api.classes.Database.help.description', 'docs': 'shell-api.classes.Database.help.link', 'attr': [{ 'name': 'runCommand', 'description': 'shell-api.classes.Database.help.attributes.runCommand.description' }, { 'name': 'getCollectionNames', 'description': 'shell-api.classes.Database.help.attributes.getCollectionNames.description' }, { 'name': 'getCollectionInfos', 'description': 'shell-api.classes.Database.help.attributes.getCollectionInfos.description' }] });

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


Database.prototype.runCommand.help = () => new Help({ 'help': 'shell-api.classes.Database.help.attributes.runCommand.example', 'docs': 'shell-api.classes.Database.help.attributes.runCommand.link', 'attr': [{ 'description': 'shell-api.classes.Database.help.attributes.runCommand.description' }] });
Database.prototype.runCommand.serverVersions = ['0.0.0', '4.4.0'];
Database.prototype.runCommand.topologies = [0, 1, 2];
Database.prototype.runCommand.returnsPromise = false;
Database.prototype.runCommand.returnType = 'unknown';

Database.prototype.getCollectionNames.help = () => new Help({ 'help': 'shell-api.classes.Database.help.attributes.getCollectionNames.example', 'docs': 'shell-api.classes.Database.help.attributes.getCollectionNames.link', 'attr': [{ 'description': 'shell-api.classes.Database.help.attributes.getCollectionNames.description' }] });
Database.prototype.getCollectionNames.serverVersions = ['0.0.0', '4.4.0'];
Database.prototype.getCollectionNames.topologies = [0, 1, 2];
Database.prototype.getCollectionNames.returnsPromise = true;
Database.prototype.getCollectionNames.returnType = 'unknown';

Database.prototype.getCollectionInfos.help = () => new Help({ 'help': 'shell-api.classes.Database.help.attributes.getCollectionInfos.example', 'docs': 'shell-api.classes.Database.help.attributes.getCollectionInfos.link', 'attr': [{ 'description': 'shell-api.classes.Database.help.attributes.getCollectionInfos.description' }] });
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
    this.help = () => new Help({ 'help': 'shell-api.classes.DeleteResult.help.description', 'docs': 'shell-api.classes.DeleteResult.help.link', 'attr': [] });
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
    this.help = () => new Help({ 'help': 'shell-api.classes.InsertManyResult.help.description', 'docs': 'shell-api.classes.InsertManyResult.help.link', 'attr': [] });
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
    this.help = () => new Help({ 'help': 'shell-api.classes.InsertOneResult.help.description', 'docs': 'shell-api.classes.InsertOneResult.help.link', 'attr': [] });
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
    this.help = () => new Help({ 'help': 'shell-api.classes.ReplicaSet.help.description', 'docs': 'shell-api.classes.ReplicaSet.help.link', 'attr': [] });
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
    this.help = () => new Help({ 'help': 'shell-api.classes.Shard.help.description', 'docs': 'shell-api.classes.Shard.help.link', 'attr': [] });
  }
}


class ShowDbsResult {
  constructor(value) {
    this.value = value;

    this.toReplString = () => {
      return this.value;
    };

    this.shellApiType = () => {
      return 'ShowDbsResult';
    };
    this.help = () => new Help({ 'help': 'shell-api.show-dbs-result.description' });
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
    this.help = () => new Help({ 'help': 'shell-api.classes.UpdateResult.help.description', 'docs': 'shell-api.classes.UpdateResult.help.link', 'attr': [] });
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
export { CommandResult };
export { Cursor };
export { Database };
export { DeleteResult };
export { InsertManyResult };
export { InsertOneResult };
export { ReplicaSet };
export { Shard };
export { ShowDbsResult };
export { UpdateResult };
export { ReadPreference };
export { DBQuery };
export { ServerVersions };
export { Topologies };
