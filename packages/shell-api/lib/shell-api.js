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

    this.toReplString = () => (this.cursor.toArray((error, documents) => {
      if (error) { throw error; }
      return documents;
    }));
  }
}
class Collection {
  constructor(mapper, database, collection) {
    this.mapper = mapper;
    this.database = database;
    this.collection = collection;
    this.help = () => ("The collection class.\nAttributes: find");
    this.help.toReplString = () => ("The collection class.\nAttributes: find");
    this.find = function() {
      return this.mapper.find(this, ...arguments);
    };
    this.find.help = () => ("db.collection.find(query, projection)\n\nquery <document> Optional. Specifies selection filter using query operators. To return all documents in a collection, omit this parameter or pass an empty document ({}).\nprojection <document> Optional. Specifies the fields to return in the documents that match the query filter. To return all fields in the matching documents, omit this parameter. For details, see Projection.\n\nReturns: A cursor to the documents that match the query criteria. When the find() method “returns documents,” the method is actually returning a cursor to the documents.\nAttributes: serverVersions, topologies");
    this.find.help.toReplString = () => ("db.collection.find(query, projection)\n\nquery <document> Optional. Specifies selection filter using query operators. To return all documents in a collection, omit this parameter or pass an empty document ({}).\nprojection <document> Optional. Specifies the fields to return in the documents that match the query filter. To return all fields in the matching documents, omit this parameter. For details, see Projection.\n\nReturns: A cursor to the documents that match the query criteria. When the find() method “returns documents,” the method is actually returning a cursor to the documents.\nAttributes: serverVersions, topologies");
    this.find.serverVersions = [3.2,4.4];
    this.find.topologies = ["ReplSet","Standalone","Shard"];

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
