/* AUTO-GENERATED SHELL API CLASSES*/
import { Help } from './help';

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
    this.help = () => new Help({ 'help': 'shell-api.classes.Collection.help.description', 'docs': 'shell-api.classes.Collection.help.link', 'attr': [{ 'name': 'aggregate', 'description': 'shell-api.classes.Collection.help.attributes.aggregate.description' }, { 'name': 'bulkWrite', 'description': 'shell-api.classes.Collection.help.attributes.bulkWrite.description' }, { 'name': 'countDocuments', 'description': 'shell-api.classes.Collection.help.attributes.countDocuments.description' }, { 'name': 'count', 'description': 'shell-api.classes.Collection.help.attributes.count.description' }, { 'name': 'deleteMany', 'description': 'shell-api.classes.Collection.help.attributes.deleteMany.description' }, { 'name': 'deleteOne', 'description': 'shell-api.classes.Collection.help.attributes.deleteOne.description' }, { 'name': 'distinct', 'description': 'shell-api.classes.Collection.help.attributes.distinct.description' }, { 'name': 'estimatedDocumentCount', 'description': 'shell-api.classes.Collection.help.attributes.estimatedDocumentCount.description' }, { 'name': 'find', 'description': 'shell-api.classes.Collection.help.attributes.find.description' }, { 'name': 'findAndModify', 'description': 'shell-api.classes.Collection.help.attributes.findAndModify.description' }, { 'name': 'findOne', 'description': 'shell-api.classes.Collection.help.attributes.findOne.description' }, { 'name': 'findOneAndDelete', 'description': 'shell-api.classes.Collection.help.attributes.findOneAndDelete.description' }, { 'name': 'findOneAndReplace', 'description': 'shell-api.classes.Collection.help.attributes.findOneAndReplace.description' }, { 'name': 'findOneAndUpdate', 'description': 'shell-api.classes.Collection.help.attributes.findOneAndUpdate.description' }, { 'name': 'insert', 'description': 'shell-api.classes.Collection.help.attributes.insert.description' }, { 'name': 'insertMany', 'description': 'shell-api.classes.Collection.help.attributes.insertMany.description' }, { 'name': 'insertOne', 'description': 'shell-api.classes.Collection.help.attributes.insertOne.description' }, { 'name': 'isCapped', 'description': 'shell-api.classes.Collection.help.attributes.isCapped.description' }, { 'name': 'remove', 'description': 'shell-api.classes.Collection.help.attributes.remove.description' }, { 'name': 'save', 'description': 'shell-api.classes.Collection.help.attributes.save.description' }, { 'name': 'replaceOne', 'description': 'shell-api.classes.Collection.help.attributes.replaceOne.description' }, { 'name': 'update', 'description': 'shell-api.classes.Collection.help.attributes.update.description' }, { 'name': 'updateMany', 'description': 'shell-api.classes.Collection.help.attributes.updateMany.description' }, { 'name': 'updateOne', 'description': 'shell-api.classes.Collection.help.attributes.updateOne.description' }, { 'name': 'convertToCapped', 'description': 'shell-api.classes.Collection.help.attributes.convertToCapped.description' }, { 'name': 'createIndexes', 'description': 'shell-api.classes.Collection.help.attributes.createIndexes.description' }, { 'name': 'createIndex', 'description': 'shell-api.classes.Collection.help.attributes.createIndex.description' }, { 'name': 'ensureIndex', 'description': 'shell-api.classes.Collection.help.attributes.ensureIndex.description' }, { 'name': 'getIndexes', 'description': 'shell-api.classes.Collection.help.attributes.getIndexes.description' }, { 'name': 'getIndexSpecs', 'description': 'shell-api.classes.Collection.help.attributes.getIndexSpecs.description' }, { 'name': 'getIndexKeys', 'description': 'shell-api.classes.Collection.help.attributes.getIndexKeys.description' }, { 'name': 'getIndices', 'description': 'shell-api.classes.Collection.help.attributes.getIndices.description' }, { 'name': 'dropIndexes', 'description': 'shell-api.classes.Collection.help.attributes.dropIndexes.description' }, { 'name': 'dropIndex', 'description': 'shell-api.classes.Collection.help.attributes.dropIndex.description' }, { 'name': 'reIndex', 'description': 'shell-api.classes.Collection.help.attributes.reIndex.description' }, { 'name': 'totalIndexSize', 'description': 'shell-api.classes.Collection.help.attributes.totalIndexSize.description' }, { 'name': 'getDB', 'description': 'shell-api.classes.Collection.help.attributes.getDB.description' }, { 'name': 'stats', 'description': 'shell-api.classes.Collection.help.attributes.stats.description' }, { 'name': 'dataSize', 'description': 'shell-api.classes.Collection.help.attributes.dataSize.description' }, { 'name': 'storageSize', 'description': 'shell-api.classes.Collection.help.attributes.storageSize.description' }, { 'name': 'totalSize', 'description': 'shell-api.classes.Collection.help.attributes.totalSize.description' }, { 'name': 'drop', 'description': 'shell-api.classes.Collection.help.attributes.drop.description' }, { 'name': 'getFullName', 'description': 'shell-api.classes.Collection.help.attributes.getFullName.description' }, { 'name': 'getName', 'description': 'shell-api.classes.Collection.help.attributes.getName.description' }, { 'name': 'exists', 'description': 'shell-api.classes.Collection.help.attributes.exists.description' }, { 'name': 'renameCollection', 'description': 'shell-api.classes.Collection.help.attributes.renameCollection.description' }, { 'name': 'runCommand', 'description': 'shell-api.classes.Collection.help.attributes.runCommand.description' }, { 'name': 'explain', 'description': 'shell-api.classes.Collection.help.attributes.explain.description' }] });
  }

  aggregate(...args) {
    return this._mapper.collection_aggregate(this, ...args);
  }

  bulkWrite(...args) {
    return this._mapper.collection_bulkWrite(this, ...args);
  }

  countDocuments(...args) {
    return this._mapper.collection_countDocuments(this, ...args);
  }

  count(...args) {
    return this._mapper.collection_count(this, ...args);
  }

  deleteMany(...args) {
    return this._mapper.collection_deleteMany(this, ...args);
  }

  deleteOne(...args) {
    return this._mapper.collection_deleteOne(this, ...args);
  }

  distinct(...args) {
    return this._mapper.collection_distinct(this, ...args);
  }

  estimatedDocumentCount(...args) {
    return this._mapper.collection_estimatedDocumentCount(this, ...args);
  }

  find(...args) {
    return this._mapper.collection_find(this, ...args);
  }

  findAndModify(...args) {
    return this._mapper.collection_findAndModify(this, ...args);
  }

  findOne(...args) {
    return this._mapper.collection_findOne(this, ...args);
  }

  findOneAndDelete(...args) {
    return this._mapper.collection_findOneAndDelete(this, ...args);
  }

  findOneAndReplace(...args) {
    return this._mapper.collection_findOneAndReplace(this, ...args);
  }

  findOneAndUpdate(...args) {
    return this._mapper.collection_findOneAndUpdate(this, ...args);
  }

  insert(...args) {
    return this._mapper.collection_insert(this, ...args);
  }

  insertMany(...args) {
    return this._mapper.collection_insertMany(this, ...args);
  }

  insertOne(...args) {
    return this._mapper.collection_insertOne(this, ...args);
  }

  isCapped(...args) {
    return this._mapper.collection_isCapped(this, ...args);
  }

  remove(...args) {
    return this._mapper.collection_remove(this, ...args);
  }

  save(...args) {
    return this._mapper.collection_save(this, ...args);
  }

  replaceOne(...args) {
    return this._mapper.collection_replaceOne(this, ...args);
  }

  update(...args) {
    return this._mapper.collection_update(this, ...args);
  }

  updateMany(...args) {
    return this._mapper.collection_updateMany(this, ...args);
  }

  updateOne(...args) {
    return this._mapper.collection_updateOne(this, ...args);
  }

  convertToCapped(...args) {
    return this._mapper.collection_convertToCapped(this, ...args);
  }

  createIndexes(...args) {
    return this._mapper.collection_createIndexes(this, ...args);
  }

  createIndex(...args) {
    return this._mapper.collection_createIndex(this, ...args);
  }

  ensureIndex(...args) {
    return this._mapper.collection_ensureIndex(this, ...args);
  }

  getIndexes(...args) {
    return this._mapper.collection_getIndexes(this, ...args);
  }

  getIndexSpecs(...args) {
    return this._mapper.collection_getIndexSpecs(this, ...args);
  }

  getIndexKeys(...args) {
    return this._mapper.collection_getIndexKeys(this, ...args);
  }

  getIndices(...args) {
    return this._mapper.collection_getIndices(this, ...args);
  }

  dropIndexes(...args) {
    return this._mapper.collection_dropIndexes(this, ...args);
  }

  dropIndex(...args) {
    return this._mapper.collection_dropIndex(this, ...args);
  }

  reIndex(...args) {
    return this._mapper.collection_reIndex(this, ...args);
  }

  totalIndexSize(...args) {
    return this._mapper.collection_totalIndexSize(this, ...args);
  }

  getDB(...args) {
    return this._mapper.collection_getDB(this, ...args);
  }

  stats(...args) {
    return this._mapper.collection_stats(this, ...args);
  }

  dataSize(...args) {
    return this._mapper.collection_dataSize(this, ...args);
  }

  storageSize(...args) {
    return this._mapper.collection_storageSize(this, ...args);
  }

  totalSize(...args) {
    return this._mapper.collection_totalSize(this, ...args);
  }

  drop(...args) {
    return this._mapper.collection_drop(this, ...args);
  }

  getFullName(...args) {
    return this._mapper.collection_getFullName(this, ...args);
  }

  getName(...args) {
    return this._mapper.collection_getName(this, ...args);
  }

  exists(...args) {
    return this._mapper.collection_exists(this, ...args);
  }

  renameCollection(...args) {
    return this._mapper.collection_renameCollection(this, ...args);
  }

  runCommand(...args) {
    return this._mapper.collection_runCommand(this, ...args);
  }

  explain(...args) {
    return this._mapper.collection_explain(this, ...args);
  }
}

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
    this.help = () => new Help({ 'help': 'shell-api.classes.Database.help.description', 'docs': 'shell-api.classes.Database.help.link', 'attr': [{ 'name': 'getCollectionNames', 'description': 'shell-api.classes.Database.help.attributes.getCollectionNames.description' }, { 'name': 'getCollectionInfos', 'description': 'shell-api.classes.Database.help.attributes.getCollectionInfos.description' }, { 'name': 'runCommand', 'description': 'shell-api.classes.Database.help.attributes.runCommand.description' }, { 'name': 'adminCommand', 'description': 'shell-api.classes.Database.help.attributes.adminCommand.description' }, { 'name': 'aggregate', 'description': 'shell-api.classes.Database.help.attributes.aggregate.description' }] });

    return proxy;
  }

  getCollectionNames(...args) {
    return this._mapper.database_getCollectionNames(this, ...args);
  }

  getCollectionInfos(...args) {
    return this._mapper.database_getCollectionInfos(this, ...args);
  }

  runCommand(...args) {
    return this._mapper.database_runCommand(this, ...args);
  }

  adminCommand(...args) {
    return this._mapper.database_adminCommand(this, ...args);
  }

  aggregate(...args) {
    return this._mapper.database_aggregate(this, ...args);
  }
}

class Explainable {
  constructor(_mapper, _collection, _verbosity) {
    this._mapper = _mapper;
    this._collection = _collection;
    this._verbosity = _verbosity;

    this.toReplString = () => {
      return `Explainable(${this._collection.getFullName()})`;
    };

    this.shellApiType = () => {
      return 'Explainable';
    };
    this.help = () => new Help({ 'help': 'shell-api.classes.Explainable.help.description', 'docs': 'shell-api.classes.Explainable.help.link', 'attr': [{ 'name': 'getCollection', 'description': 'shell-api.classes.Explainable.help.attributes.getCollection.description' }, { 'name': 'getVerbosity', 'description': 'shell-api.classes.Explainable.help.attributes.getVerbosity.description' }, { 'name': 'setVerbosity', 'description': 'shell-api.classes.Explainable.help.attributes.setVerbosity.description' }, { 'name': 'find', 'description': 'shell-api.classes.Explainable.help.attributes.find.description' }, { 'name': 'aggregate', 'description': 'shell-api.classes.Explainable.help.attributes.aggregate.description' }] });
  }

  getCollection(...args) {
    return this._mapper.explainable_getCollection(this, ...args);
  }

  getVerbosity(...args) {
    return this._mapper.explainable_getVerbosity(this, ...args);
  }

  setVerbosity(...args) {
    return this._mapper.explainable_setVerbosity(this, ...args);
  }

  find(...args) {
    return this._mapper.explainable_find(this, ...args);
  }

  aggregate(...args) {
    return this._mapper.explainable_aggregate(this, ...args);
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


export { Collection };
export { Database };
export { Explainable };
export { ReplicaSet };
export { Shard };
