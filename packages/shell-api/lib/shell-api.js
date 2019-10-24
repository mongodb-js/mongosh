class Cursor {
  constructor(mapper) {
    this.mapper = mapper;
    this.help = "The cursor class.\nAttributes: next";
    this.next = function() {
      return this.mapper.next(...arguments);
    };
    this.next.help = "default help\nAttributes: serverVersions, topologies";
    this.next.serverVersions = [0,-1];
    this.next.topologies = ["ReplSet","Standalone"];
  }
}
class Collection {
  constructor(mapper, database, collection) {
    this.mapper = mapper;
    this.database = database;
    this.collection = collection;
    this.help = "The collection class.\nAttributes: find";
    this.find = function() {
      return this.mapper.find(...arguments);
    };
    this.find.help = "default help\nAttributes: serverVersions, topologies";
    this.find.serverVersions = [0,-1];
    this.find.topologies = ["ReplSet","Standalone"];
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
    this.help = "The database class.\nAttributes: runCommand";
    this.runCommand = function() {
      return this.mapper.runCommand(...arguments);
    };
    this.runCommand.help = "Runs an arbitrary command on the database.\nAttributes: serverVersions, topologies";
    this.runCommand.serverVersions = [0,-1];
    this.runCommand.topologies = ["ReplSet","Standalone"];

    return new Proxy(this, handler);
  }
}
class ReplicaSet {
  constructor(mapper) {
    this.mapper = mapper;
    this.help = "The Replica Set class.\nAttributes: ";
  }
}
class Shard {
  constructor(mapper) {
    this.mapper = mapper;
    this.help = "The shard class.\nAttributes: ";
  }
}
class ShellApi {
  constructor(mapper) {
    this.mapper = mapper;
    this.help = "Welcome to the new MongoDB Shell!\nAttributes: customCmd, use";
    this.customCmd = function() {
      return this.mapper.customCmd(...arguments);
    };
    this.customCmd.help = "default help\nAttributes: serverVersions, topologies";
    this.customCmd.serverVersions = [0,-1];
    this.customCmd.topologies = ["ReplSet","Standalone"];
    this.use = function() {
      return this.mapper.use(...arguments);
    };
    this.use.help = "default help\nAttributes: serverVersions, topologies";
    this.use.serverVersions = [0,-1];
    this.use.topologies = ["ReplSet","Standalone"];
  }
}

module.exports = ShellApi;
module.exports.Cursor = Cursor;
module.exports.Collection = Collection;
module.exports.Database = Database;
module.exports.ReplicaSet = ReplicaSet;
module.exports.Shard = Shard;
module.exports.ShellApi = ShellApi;
