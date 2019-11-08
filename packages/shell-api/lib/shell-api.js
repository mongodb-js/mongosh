class Cursor {
  constructor(mapper, cursor) {
    this.mapper = mapper;
    this.cursor = cursor;
    this.help = () => ("The cursor class.\nAttributes: next");
    this.help.toReplString = () => ("The cursor class.\nAttributes: next");
    this.next = function() {
      return this.mapper.next(this, ...arguments);
    };
    this.next.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.next.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.next.serverVersions = [-1,4.4];
    this.next.topologies = ["ReplSet","Standalone","Shard"];

    this.toReplString = () => (this.cursor.toArray((error, documents) => { if (error) { throw error; } return documents; }));
  }
}
class Collection {
  constructor(mapper, database, collection) {
    this.mapper = mapper;
    this.database = database;
    this.collection = collection;
    this.help = () => ("The collection class.\nAttributes: find, aggregate, bulkWrite, countDocuments, deleteMany, deleteOne, distinct, estimatedDocumentCount, findOneAndDelete, findOneAndReplace, findOneAndUpdate, insertMany, insertOne, replaceOne, updateMany, updateOne");
    this.help.toReplString = () => ("The collection class.\nAttributes: find, aggregate, bulkWrite, countDocuments, deleteMany, deleteOne, distinct, estimatedDocumentCount, findOneAndDelete, findOneAndReplace, findOneAndUpdate, insertMany, insertOne, replaceOne, updateMany, updateOne");
    this.find = function() {
      return this.mapper.find(this, ...arguments);
    };
    this.find.help = () => ("db.collection.find(query, projection)\n\nquery <document> Optional. Specifies selection filter using query operators. To return all documents in a collection, omit this parameter or pass an empty document ({}).\nprojection <document> Optional. Specifies the fields to return in the documents that match the query filter. To return all fields in the matching documents, omit this parameter. For details, see Projection.\n\nReturns: A cursor to the documents that match the query criteria. When the find() method “returns documents,” the method is actually returning a cursor to the documents.\nAttributes: serverVersions, topologies");
    this.find.help.toReplString = () => ("db.collection.find(query, projection)\n\nquery <document> Optional. Specifies selection filter using query operators. To return all documents in a collection, omit this parameter or pass an empty document ({}).\nprojection <document> Optional. Specifies the fields to return in the documents that match the query filter. To return all fields in the matching documents, omit this parameter. For details, see Projection.\n\nReturns: A cursor to the documents that match the query criteria. When the find() method “returns documents,” the method is actually returning a cursor to the documents.\nAttributes: serverVersions, topologies");
    this.find.serverVersions = [0,4.4];
    this.find.topologies = ["ReplSet","Standalone","Shard"];
    this.aggregate = function() {
      return this.mapper.aggregate(this, ...arguments);
    };
    this.aggregate.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.aggregate.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.aggregate.serverVersions = ["EARLIEST_VERSION",4.4];
    this.aggregate.topologies = ["ReplSet","Standalone","Shard"];
    this.bulkWrite = function() {
      return this.mapper.bulkWrite(this, ...arguments);
    };
    this.bulkWrite.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.bulkWrite.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.bulkWrite.serverVersions = ["EARLIEST_VERSION",4.4];
    this.bulkWrite.topologies = ["ReplSet","Standalone","Shard"];
    this.countDocuments = function() {
      return this.mapper.countDocuments(this, ...arguments);
    };
    this.countDocuments.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.countDocuments.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.countDocuments.serverVersions = ["EARLIEST_VERSION",4.4];
    this.countDocuments.topologies = ["ReplSet","Standalone","Shard"];
    this.deleteMany = function() {
      return this.mapper.deleteMany(this, ...arguments);
    };
    this.deleteMany.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.deleteMany.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.deleteMany.serverVersions = ["EARLIEST_VERSION",4.4];
    this.deleteMany.topologies = ["ReplSet","Standalone","Shard"];
    this.deleteOne = function() {
      return this.mapper.deleteOne(this, ...arguments);
    };
    this.deleteOne.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.deleteOne.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.deleteOne.serverVersions = ["EARLIEST_VERSION",4.4];
    this.deleteOne.topologies = ["ReplSet","Standalone","Shard"];
    this.distinct = function() {
      return this.mapper.distinct(this, ...arguments);
    };
    this.distinct.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.distinct.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.distinct.serverVersions = ["EARLIEST_VERSION",4.4];
    this.distinct.topologies = ["ReplSet","Standalone","Shard"];
    this.estimatedDocumentCount = function() {
      return this.mapper.estimatedDocumentCount(this, ...arguments);
    };
    this.estimatedDocumentCount.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.estimatedDocumentCount.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.estimatedDocumentCount.serverVersions = ["EARLIEST_VERSION",4.4];
    this.estimatedDocumentCount.topologies = ["ReplSet","Standalone","Shard"];
    this.findOneAndDelete = function() {
      return this.mapper.findOneAndDelete(this, ...arguments);
    };
    this.findOneAndDelete.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.findOneAndDelete.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.findOneAndDelete.serverVersions = ["EARLIEST_VERSION",4.4];
    this.findOneAndDelete.topologies = ["ReplSet","Standalone","Shard"];
    this.findOneAndReplace = function() {
      return this.mapper.findOneAndReplace(this, ...arguments);
    };
    this.findOneAndReplace.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.findOneAndReplace.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.findOneAndReplace.serverVersions = ["EARLIEST_VERSION",4.4];
    this.findOneAndReplace.topologies = ["ReplSet","Standalone","Shard"];
    this.findOneAndUpdate = function() {
      return this.mapper.findOneAndUpdate(this, ...arguments);
    };
    this.findOneAndUpdate.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.findOneAndUpdate.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.findOneAndUpdate.serverVersions = ["EARLIEST_VERSION",4.4];
    this.findOneAndUpdate.topologies = ["ReplSet","Standalone","Shard"];
    this.insertMany = function() {
      return this.mapper.insertMany(this, ...arguments);
    };
    this.insertMany.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.insertMany.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.insertMany.serverVersions = ["EARLIEST_VERSION",4.4];
    this.insertMany.topologies = ["ReplSet","Standalone","Shard"];
    this.insertOne = function() {
      return this.mapper.insertOne(this, ...arguments);
    };
    this.insertOne.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.insertOne.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.insertOne.serverVersions = ["EARLIEST_VERSION",4.4];
    this.insertOne.topologies = ["ReplSet","Standalone","Shard"];
    this.replaceOne = function() {
      return this.mapper.replaceOne(this, ...arguments);
    };
    this.replaceOne.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.replaceOne.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.replaceOne.serverVersions = ["EARLIEST_VERSION",4.4];
    this.replaceOne.topologies = ["ReplSet","Standalone","Shard"];
    this.updateMany = function() {
      return this.mapper.updateMany(this, ...arguments);
    };
    this.updateMany.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.updateMany.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.updateMany.serverVersions = ["EARLIEST_VERSION",4.4];
    this.updateMany.topologies = ["ReplSet","Standalone","Shard"];
    this.updateOne = function() {
      return this.mapper.updateOne(this, ...arguments);
    };
    this.updateOne.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.updateOne.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.updateOne.serverVersions = ["EARLIEST_VERSION",4.4];
    this.updateOne.topologies = ["ReplSet","Standalone","Shard"];

    this.toReplString = () => (this.collection);
  }
}
class Database {
  constructor(mapper, database) {
    const handler = {
      get: function (obj, prop) {
        if (!(prop in obj)) {
          obj[prop] = new Collection(mapper, database, prop);
        }
        return obj[prop];
      }
    };
    this.mapper = mapper;
    this.database = database;
    this.help = () => ("The database class.\nAttributes: runCommand");
    this.help.toReplString = () => ("The database class.\nAttributes: runCommand");
    this.runCommand = function() {
      return this.mapper.runCommand(this, ...arguments);
    };
    this.runCommand.help = () => ("Runs an arbitrary command on the database.\nAttributes: serverVersions, topologies");
    this.runCommand.help.toReplString = () => ("Runs an arbitrary command on the database.\nAttributes: serverVersions, topologies");
    this.runCommand.serverVersions = [-1,4.4];
    this.runCommand.topologies = ["ReplSet","Standalone","Shard"];

    this.toReplString = () => (this.database);

    return new Proxy(this, handler);
  }
}
class ReplicaSet {
  constructor(mapper) {
    this.mapper = mapper;
    this.help = () => ("The Replica Set class.\nAttributes: ");
    this.help.toReplString = () => ("The Replica Set class.\nAttributes: ");
  }
}
class Shard {
  constructor(mapper) {
    this.mapper = mapper;
    this.help = () => ("The shard class.\nAttributes: ");
    this.help.toReplString = () => ("The shard class.\nAttributes: ");
  }
}
class ShellApi {
  constructor(mapper) {
    this.mapper = mapper;
    this.help = () => ("Welcome to the new MongoDB Shell!\nAttributes: customCmd, use");
    this.help.toReplString = () => ("Welcome to the new MongoDB Shell!\nAttributes: customCmd, use");
    this.customCmd = function() {
      return this.mapper.customCmd(this, ...arguments);
    };
    this.customCmd.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.customCmd.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.customCmd.serverVersions = [-1,4.4];
    this.customCmd.topologies = ["ReplSet","Standalone","Shard"];
    this.use = function() {
      return this.mapper.use(this, ...arguments);
    };
    this.use.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.use.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.use.serverVersions = [-1,4.4];
    this.use.topologies = ["ReplSet","Standalone","Shard"];
  }
}

module.exports = ShellApi;
module.exports.Cursor = Cursor;
module.exports.Collection = Collection;
module.exports.Database = Database;
module.exports.ReplicaSet = ReplicaSet;
module.exports.Shard = Shard;
module.exports.ShellApi = ShellApi;
