const {
  ShellApi,
  Cursor,
  Collection,
  Database,
  ReplicaSet,
  Shard
} = require('./lib/shell-api.js');

module.exports = ShellApi;
module.exports.Cursor = Cursor;
module.exports.Collection = Collection;
module.exports.Database = Database;
module.exports.ReplicaSet = ReplicaSet;
module.exports.Shard = Shard;
module.exports.ShellApi = ShellApi;
