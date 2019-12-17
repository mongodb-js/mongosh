const {
    AggregationCursor,
    BulkWriteResult,
    Collection,
    Cursor,
    Database,
    DeleteResult,
    InsertManyResult,
    InsertOneResult,
    ReplicaSet,
    ShellApi
} = require('./lib/shell-api.js');
const compile = require('./lib/async-rewrite');

module.exports = ShellApi;
module.exports.ShellApi = ShellApi;
module.exports.AggregationCursor = AggregationCursor;
module.exports.BulkWriteResult = BulkWriteResult;
module.exports.Collection = Collection;
module.exports.Cursor = Cursor;
module.exports.Database = Database;
module.exports.DeleteResult = DeleteResult;
module.exports.InsertManyResult = InsertManyResult;
module.exports.InsertOneResult = InsertOneResult;
module.exports.ReplicaSet = ReplicaSet;
module.exports.compile = compile;