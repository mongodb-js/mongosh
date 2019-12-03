class AggregationCursor {
  constructor(cursor) {
    this.cursor = cursor;
    this.help = () => ("The aggregation cursor class.\nAttributes: bsonsize, close, forEach, hasNext, isClosed, isExhausted, itcount, map, next, objsLeftInBatch, toArray");
    this.help.toReplString = () => ("The aggregation cursor class.\nAttributes: bsonsize, close, forEach, hasNext, isClosed, isExhausted, itcount, map, next, objsLeftInBatch, toArray");
    this.bsonsize = function() {
      return this.cursor.bsonsize(this, ...arguments);
    };
    this.bsonsize.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.bsonsize.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.bsonsize.serverVersions = [-1,4.4];
    this.bsonsize.topologies = ["ReplSet","Standalone","Shard"];
    this.close = function() {
      return this.cursor.close(this, ...arguments);
    };
    this.close.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.close.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.close.serverVersions = [-1,4.4];
    this.close.topologies = ["ReplSet","Standalone","Shard"];
    this.forEach = function() {
      return this.cursor.forEach(this, ...arguments);
    };
    this.forEach.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.forEach.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.forEach.serverVersions = [-1,4.4];
    this.forEach.topologies = ["ReplSet","Standalone","Shard"];
    this.hasNext = function() {
      return this.cursor.hasNext(this, ...arguments);
    };
    this.hasNext.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.hasNext.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.hasNext.serverVersions = [-1,4.4];
    this.hasNext.topologies = ["ReplSet","Standalone","Shard"];
    this.isClosed = function() {
      return this.cursor.isClosed(this, ...arguments);
    };
    this.isClosed.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.isClosed.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.isClosed.serverVersions = [-1,4.4];
    this.isClosed.topologies = ["ReplSet","Standalone","Shard"];
    this.isExhausted = function() {
      return this.cursor.isExhausted(this, ...arguments);
    };
    this.isExhausted.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.isExhausted.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.isExhausted.serverVersions = [-1,4.4];
    this.isExhausted.topologies = ["ReplSet","Standalone","Shard"];
    this.itcount = function() {
      return this.cursor.itcount(this, ...arguments);
    };
    this.itcount.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.itcount.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.itcount.serverVersions = [-1,4.4];
    this.itcount.topologies = ["ReplSet","Standalone","Shard"];
    this.map = function() {
      return this.cursor.map(this, ...arguments);
    };
    this.map.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.map.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.map.serverVersions = [-1,4.4];
    this.map.topologies = ["ReplSet","Standalone","Shard"];
    this.next = function() {
      return this.cursor.next(this, ...arguments);
    };
    this.next.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.next.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.next.serverVersions = [-1,4.4];
    this.next.topologies = ["ReplSet","Standalone","Shard"];
    this.objsLeftInBatch = function() {
      return this.cursor.objsLeftInBatch(this, ...arguments);
    };
    this.objsLeftInBatch.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.objsLeftInBatch.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.objsLeftInBatch.serverVersions = [-1,4.4];
    this.objsLeftInBatch.topologies = ["ReplSet","Standalone","Shard"];
    this.toArray = function() {
      return this.cursor.toArray(this, ...arguments);
    };
    this.toArray.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.toArray.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.toArray.serverVersions = [-1,4.4];
    this.toArray.topologies = ["ReplSet","Standalone","Shard"];

    this.toReplString = () => (this.cursor.toArray((error, documents) => { if (error) { throw error; } console.log(JSON.stringify(documents)); }));
  }
}
class BulkWriteResult {
  constructor(temp) {
    this.temp = temp;
    this.help = () => ("A temp class.\nAttributes: ");
    this.help.toReplString = () => ("A temp class.\nAttributes: ");

    this.toReplString = () => (this.TempClass);
  }
}
class Collection {
  constructor(mapper, database, collection) {
    this.mapper = mapper;
    this.database = database;
    this.collection = collection;
    this.help = () => ("The collection class.\nAttributes: aggregate, bulkWrite, countDocuments, count, deleteMany, deleteOne, distinct, estimatedDocumentCount, find, findAndModify, findOne, findOneAndDelete, findOneAndReplace, findOneAndUpdate, insert, insertMany, insertOne, isCapped, remove, save, replaceOne, update, updateMany, updateOne");
    this.help.toReplString = () => ("The collection class.\nAttributes: aggregate, bulkWrite, countDocuments, count, deleteMany, deleteOne, distinct, estimatedDocumentCount, find, findAndModify, findOne, findOneAndDelete, findOneAndReplace, findOneAndUpdate, insert, insertMany, insertOne, isCapped, remove, save, replaceOne, update, updateMany, updateOne");
    this.aggregate = function() {
      return this.mapper.aggregate(this, ...arguments);
    };
    this.aggregate.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.aggregate\n\nCalculates aggregate values for the data in a collection or a view.\n\ndb.collection.aggregate(pipeline, options)\n\npipeline <array> A sequence of data aggregation operations or stages.\noptions <document>\n    explain <bool>\n    allowDiskUse <bool>\n    cursor <document>\n    maxTimeMS <int>\n    bypassDocumentValidation <bool>\n    readConcern <document>\n    collation <document>\n    hint <document>\n    comment <string>\n    writeConcern <document>\n\nReturns: A cursor to the documents produced by the final stage of the aggregation pipeline operation, or if you include the explain option, the document that provides details on the processing of the aggregation operation. If the pipeline includes the $out operator, aggregate() returns an empty cursor.\nAttributes: serverVersions, topologies");
    this.aggregate.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.aggregate\n\nCalculates aggregate values for the data in a collection or a view.\n\ndb.collection.aggregate(pipeline, options)\n\npipeline <array> A sequence of data aggregation operations or stages.\noptions <document>\n    explain <bool>\n    allowDiskUse <bool>\n    cursor <document>\n    maxTimeMS <int>\n    bypassDocumentValidation <bool>\n    readConcern <document>\n    collation <document>\n    hint <document>\n    comment <string>\n    writeConcern <document>\n\nReturns: A cursor to the documents produced by the final stage of the aggregation pipeline operation, or if you include the explain option, the document that provides details on the processing of the aggregation operation. If the pipeline includes the $out operator, aggregate() returns an empty cursor.\nAttributes: serverVersions, topologies");
    this.aggregate.serverVersions = [0,4.4];
    this.aggregate.topologies = ["ReplSet","Standalone","Shard"];
    this.bulkWrite = function() {
      return this.mapper.bulkWrite(this, ...arguments);
    };
    this.bulkWrite.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.bulkWrite\n\nPerforms multiple write operations with controls for order of execution.\n\ndb.collection.bulkWrite(operations, options)\n\noperations <array> An array of bulkWrite() write operations.\noptions <document>\n    writeConcern <document>\n    ordered\t<boolean>\n\nReturns: A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled.\n         A count for each write operation.\n         An array containing an _id for each successfully inserted or upserted documents.\nAttributes: serverVersions, topologies");
    this.bulkWrite.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.bulkWrite\n\nPerforms multiple write operations with controls for order of execution.\n\ndb.collection.bulkWrite(operations, options)\n\noperations <array> An array of bulkWrite() write operations.\noptions <document>\n    writeConcern <document>\n    ordered\t<boolean>\n\nReturns: A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled.\n         A count for each write operation.\n         An array containing an _id for each successfully inserted or upserted documents.\nAttributes: serverVersions, topologies");
    this.bulkWrite.serverVersions = [3.2,4.4];
    this.bulkWrite.topologies = ["ReplSet","Standalone","Shard"];
    this.countDocuments = function() {
      return this.mapper.countDocuments(this, ...arguments);
    };
    this.countDocuments.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.countDocuments\n\nReturns the count of documents that match the query for a collection or view.\n\ndb.collection.countDocuments(query, options)\n\nquery <document> The query selection criteria. To count all documents, specify an empty document.\noptions <document>\n    limit <integer>\tOptional. The maximum number of documents to count.\n    skip <integer>\tOptional. The number of documents to skip before counting.\n    hint <string or document>\tOptional. An index name or the index specification to use for the query.\n    maxTimeMS <integer>\tOptional. The maximum amount of time to allow the count to run.\nAttributes: serverVersions, topologies");
    this.countDocuments.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.countDocuments\n\nReturns the count of documents that match the query for a collection or view.\n\ndb.collection.countDocuments(query, options)\n\nquery <document> The query selection criteria. To count all documents, specify an empty document.\noptions <document>\n    limit <integer>\tOptional. The maximum number of documents to count.\n    skip <integer>\tOptional. The number of documents to skip before counting.\n    hint <string or document>\tOptional. An index name or the index specification to use for the query.\n    maxTimeMS <integer>\tOptional. The maximum amount of time to allow the count to run.\nAttributes: serverVersions, topologies");
    this.countDocuments.serverVersions = ["4.0.3",4.4];
    this.countDocuments.topologies = ["ReplSet","Standalone","Shard"];
    this.count = function() {
      return this.mapper.count(this, ...arguments);
    };
    this.count.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.count\n\nReturns the count of documents that would match a find() query for the collection or view. The db.collection.count() method does not perform the find() operation but instead counts and returns the number of results that match a query.\nAvoid using the db.collection.count() method without a query predicate since without the query predicate, the method returns results based on the collection’s metadata, which may result in an approximate count.\n\ndb.collection.count(query, options)\n\nquery\t<document>\tThe query selection criteria.\noptions\t<document>\n    limit <integer>\tOptional. The maximum number of documents to count.\n    skip <integer>\tOptional. The number of documents to skip before counting.\n    hint <string or document> Optional. An index name hint or specification for the query.\n    maxTimeMS <integer>\tOptional. The maximum amount of time to allow the query to run.\n    readConcern\t<string>\n    collation <document>\nAttributes: serverVersions, topologies");
    this.count.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.count\n\nReturns the count of documents that would match a find() query for the collection or view. The db.collection.count() method does not perform the find() operation but instead counts and returns the number of results that match a query.\nAvoid using the db.collection.count() method without a query predicate since without the query predicate, the method returns results based on the collection’s metadata, which may result in an approximate count.\n\ndb.collection.count(query, options)\n\nquery\t<document>\tThe query selection criteria.\noptions\t<document>\n    limit <integer>\tOptional. The maximum number of documents to count.\n    skip <integer>\tOptional. The number of documents to skip before counting.\n    hint <string or document> Optional. An index name hint or specification for the query.\n    maxTimeMS <integer>\tOptional. The maximum amount of time to allow the query to run.\n    readConcern\t<string>\n    collation <document>\nAttributes: serverVersions, topologies");
    this.count.serverVersions = [0,4.4];
    this.count.topologies = ["ReplSet","Standalone","Shard"];
    this.deleteMany = function() {
      return this.mapper.deleteMany(this, ...arguments);
    };
    this.deleteMany.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.deleteMany\n\nRemoves all documents that match the filter from a collection.\n\ndb.collection.deleteMany()\n\nfilter\t<document> Specifies deletion criteria using query operators.\noptions <document>\n    writeConcern <document>\n    collation <document>\n\nReturns: A document containing:\n    A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled\n    deletedCount containing the number of deleted documents\nAttributes: serverVersions, topologies");
    this.deleteMany.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.deleteMany\n\nRemoves all documents that match the filter from a collection.\n\ndb.collection.deleteMany()\n\nfilter\t<document> Specifies deletion criteria using query operators.\noptions <document>\n    writeConcern <document>\n    collation <document>\n\nReturns: A document containing:\n    A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled\n    deletedCount containing the number of deleted documents\nAttributes: serverVersions, topologies");
    this.deleteMany.serverVersions = [0,4.4];
    this.deleteMany.topologies = ["ReplSet","Standalone","Shard"];
    this.deleteOne = function() {
      return this.mapper.deleteOne(this, ...arguments);
    };
    this.deleteOne.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.deleteOne\n\nRemoves a single document from a collection.\n\ndb.collection.deleteOne(filter, options)\n\nfilter <document> Specifies deletion criteria using query operators.\noptions <document>\n    writeConcern <document>\n    collation <document>\n\nReturns:\tA document containing:\n    A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled\n    deletedCount containing the number of deleted documents\nAttributes: serverVersions, topologies");
    this.deleteOne.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.deleteOne\n\nRemoves a single document from a collection.\n\ndb.collection.deleteOne(filter, options)\n\nfilter <document> Specifies deletion criteria using query operators.\noptions <document>\n    writeConcern <document>\n    collation <document>\n\nReturns:\tA document containing:\n    A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled\n    deletedCount containing the number of deleted documents\nAttributes: serverVersions, topologies");
    this.deleteOne.serverVersions = [0,4.4];
    this.deleteOne.topologies = ["ReplSet","Standalone","Shard"];
    this.distinct = function() {
      return this.mapper.distinct(this, ...arguments);
    };
    this.distinct.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.distinct\n\nFinds the distinct values for a specified field across a single collection or view and returns the results in an array.\n\ndb.collection.distinct(field, query, options)\n\nfield <string> The field for which to return distinct values.\nquery <document> A query that specifies the documents from which to retrieve the distinct values.\noptions\t<document>\n    collation <document>\n\nReturns: The results in an array.\nAttributes: serverVersions, topologies");
    this.distinct.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.distinct\n\nFinds the distinct values for a specified field across a single collection or view and returns the results in an array.\n\ndb.collection.distinct(field, query, options)\n\nfield <string> The field for which to return distinct values.\nquery <document> A query that specifies the documents from which to retrieve the distinct values.\noptions\t<document>\n    collation <document>\n\nReturns: The results in an array.\nAttributes: serverVersions, topologies");
    this.distinct.serverVersions = [0,4.4];
    this.distinct.topologies = ["ReplSet","Standalone","Shard"];
    this.estimatedDocumentCount = function() {
      return this.mapper.estimatedDocumentCount(this, ...arguments);
    };
    this.estimatedDocumentCount.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.estimatedDocumentCount\n\nReturns the count of all documents in a collection or view.\n\ndb.collection.estimatedDocumentCount( <options> )\n\noptions\t<document>\n    maxTimeMS <integer> Optional. The maximum amount of time to allow the count to run.\n\nReturns: count as an integer\nAttributes: serverVersions, topologies");
    this.estimatedDocumentCount.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.estimatedDocumentCount\n\nReturns the count of all documents in a collection or view.\n\ndb.collection.estimatedDocumentCount( <options> )\n\noptions\t<document>\n    maxTimeMS <integer> Optional. The maximum amount of time to allow the count to run.\n\nReturns: count as an integer\nAttributes: serverVersions, topologies");
    this.estimatedDocumentCount.serverVersions = ["4.0.3",4.4];
    this.estimatedDocumentCount.topologies = ["ReplSet","Standalone","Shard"];
    this.find = function() {
      return this.mapper.find(this, ...arguments);
    };
    this.find.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.find\n\nSelects documents in a collection or view.\n\ndb.collection.find(query, projection)\n\nquery <document> Optional. Specifies selection filter using query operators. To return all documents in a collection, omit this parameter or pass an empty document ({}).\nprojection <document> Optional. Specifies the fields to return in the documents that match the query filter. To return all fields in the matching documents, omit this parameter.\n\nReturns: A cursor to the documents that match the query criteria.\nAttributes: serverVersions, topologies");
    this.find.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.find\n\nSelects documents in a collection or view.\n\ndb.collection.find(query, projection)\n\nquery <document> Optional. Specifies selection filter using query operators. To return all documents in a collection, omit this parameter or pass an empty document ({}).\nprojection <document> Optional. Specifies the fields to return in the documents that match the query filter. To return all fields in the matching documents, omit this parameter.\n\nReturns: A cursor to the documents that match the query criteria.\nAttributes: serverVersions, topologies");
    this.find.serverVersions = [0,4.4];
    this.find.topologies = ["ReplSet","Standalone","Shard"];
    this.findAndModify = function() {
      return this.mapper.findAndModify(this, ...arguments);
    };
    this.findAndModify.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.findAndModify\n\nModifies and returns a single document.\n\ndb.collection.findAndModify(document)\n\ndocument <document>\n    query <document>,\n    sort <document>,\n    remove <boolean>,\n    update <document or aggregation pipeline>, // Changed in MongoDB 4.2\n    new <boolean>,\n    fields <document>,\n    upsert <boolean>,\n    bypassDocumentValidation <boolean>,\n    writeConcern <document>,\n    collation <document>,\n    arrayFilters [ <filterdocument1>, ... ]\n\nReturns: For remove operations, if the query matches a document, findAndModify() returns the removed document. If the query does not match a document to remove, findAndModify() returns null.\nAttributes: serverVersions, topologies");
    this.findAndModify.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.findAndModify\n\nModifies and returns a single document.\n\ndb.collection.findAndModify(document)\n\ndocument <document>\n    query <document>,\n    sort <document>,\n    remove <boolean>,\n    update <document or aggregation pipeline>, // Changed in MongoDB 4.2\n    new <boolean>,\n    fields <document>,\n    upsert <boolean>,\n    bypassDocumentValidation <boolean>,\n    writeConcern <document>,\n    collation <document>,\n    arrayFilters [ <filterdocument1>, ... ]\n\nReturns: For remove operations, if the query matches a document, findAndModify() returns the removed document. If the query does not match a document to remove, findAndModify() returns null.\nAttributes: serverVersions, topologies");
    this.findAndModify.serverVersions = [0,4.4];
    this.findAndModify.topologies = ["ReplSet","Standalone","Shard"];
    this.findOne = function() {
      return this.mapper.findOne(this, ...arguments);
    };
    this.findOne.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.findOne\n\nSelects documents in a collection or view.\n\ndb.collection.findOne(query, projection)\n\nquery <document> Optional. Specifies selection filter using query operators. To return all documents in a collection, omit this parameter or pass an empty document ({}).\nprojection <document> Optional. Specifies the fields to return in the documents that match the query filter. To return all fields in the matching documents, omit this parameter.\n\nReturns: A cursor to the documents that match the query criteria.\nAttributes: serverVersions, topologies");
    this.findOne.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.findOne\n\nSelects documents in a collection or view.\n\ndb.collection.findOne(query, projection)\n\nquery <document> Optional. Specifies selection filter using query operators. To return all documents in a collection, omit this parameter or pass an empty document ({}).\nprojection <document> Optional. Specifies the fields to return in the documents that match the query filter. To return all fields in the matching documents, omit this parameter.\n\nReturns: A cursor to the documents that match the query criteria.\nAttributes: serverVersions, topologies");
    this.findOne.serverVersions = [0,4.4];
    this.findOne.topologies = ["ReplSet","Standalone","Shard"];
    this.findOneAndDelete = function() {
      return this.mapper.findOneAndDelete(this, ...arguments);
    };
    this.findOneAndDelete.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndDelete\n\nDeletes a single document based on the filter and sort criteria, returning the deleted document.\n\ndb.collection.findOneAndDelete(filter, options)\n\nfilter <document> The selection criteria for the update.\noptions <document>\n    projection <document>\n    sort <document>\n    maxTimeMS <number>\n    collation <document>\n\nReturns: Returns the deleted document.\nAttributes: serverVersions, topologies");
    this.findOneAndDelete.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndDelete\n\nDeletes a single document based on the filter and sort criteria, returning the deleted document.\n\ndb.collection.findOneAndDelete(filter, options)\n\nfilter <document> The selection criteria for the update.\noptions <document>\n    projection <document>\n    sort <document>\n    maxTimeMS <number>\n    collation <document>\n\nReturns: Returns the deleted document.\nAttributes: serverVersions, topologies");
    this.findOneAndDelete.serverVersions = [3.2,4.4];
    this.findOneAndDelete.topologies = ["ReplSet","Standalone","Shard"];
    this.findOneAndReplace = function() {
      return this.mapper.findOneAndReplace(this, ...arguments);
    };
    this.findOneAndReplace.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndReplace\n\nModifies and replaces a single document based on the filter and sort criteria.\n\ndb.collection.findOneAndReplace(filter, replacement, options)\n\nfilter <document> The selection criteria for the update.\nreplacement\t<document> The replacement document.\noptions <document>\n    projection <document>\n    sort <document>\n    maxTimeMS <number>\n    upsert <boolean>\n    returnNewDocument <boolean>\n    collation <document>\n\nReturns: Returns either the original document or, if returnNewDocument: true, the replacement document.\nAttributes: serverVersions, topologies");
    this.findOneAndReplace.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndReplace\n\nModifies and replaces a single document based on the filter and sort criteria.\n\ndb.collection.findOneAndReplace(filter, replacement, options)\n\nfilter <document> The selection criteria for the update.\nreplacement\t<document> The replacement document.\noptions <document>\n    projection <document>\n    sort <document>\n    maxTimeMS <number>\n    upsert <boolean>\n    returnNewDocument <boolean>\n    collation <document>\n\nReturns: Returns either the original document or, if returnNewDocument: true, the replacement document.\nAttributes: serverVersions, topologies");
    this.findOneAndReplace.serverVersions = [3.2,4.4];
    this.findOneAndReplace.topologies = ["ReplSet","Standalone","Shard"];
    this.findOneAndUpdate = function() {
      return this.mapper.findOneAndUpdate(this, ...arguments);
    };
    this.findOneAndUpdate.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndUpdate\n\nUpdates a single document based on the filter and sort criteria.\n\ndb.collection.findOneAndUpdate(filter, update, options)\n\nfilter <document> The selection criteria for the update.\nupdate <document or array> The update document or, starting in MongoDB 4.2, an aggregation pipeline.\noptions <document>\n    projection <document>\n    sort <document>\n    maxTimeMS <number>\n    upsert <boolean>\n    returnNewDocument <boolean>\n    collation <document>\n    arrayFilters [ <filterdocument1>, ... ]\n\nReturns: Returns either the original document or, if returnNewDocument: true, the updated document.\nAttributes: serverVersions, topologies");
    this.findOneAndUpdate.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndUpdate\n\nUpdates a single document based on the filter and sort criteria.\n\ndb.collection.findOneAndUpdate(filter, update, options)\n\nfilter <document> The selection criteria for the update.\nupdate <document or array> The update document or, starting in MongoDB 4.2, an aggregation pipeline.\noptions <document>\n    projection <document>\n    sort <document>\n    maxTimeMS <number>\n    upsert <boolean>\n    returnNewDocument <boolean>\n    collation <document>\n    arrayFilters [ <filterdocument1>, ... ]\n\nReturns: Returns either the original document or, if returnNewDocument: true, the updated document.\nAttributes: serverVersions, topologies");
    this.findOneAndUpdate.serverVersions = [3.2,4.4];
    this.findOneAndUpdate.topologies = ["ReplSet","Standalone","Shard"];
    this.insert = function() {
      return this.mapper.insert(this, ...arguments);
    };
    this.insert.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.insert\n\nInserts a document or documents into a collection.\n\ndb.collection.insert(document, options)\n\ndocument <document or array> A document or array of documents to insert into the collection.\noptions <document>\n    writeConcern: <document>\n    ordered: <boolean>\nAttributes: serverVersions, topologies");
    this.insert.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.insert\n\nInserts a document or documents into a collection.\n\ndb.collection.insert(document, options)\n\ndocument <document or array> A document or array of documents to insert into the collection.\noptions <document>\n    writeConcern: <document>\n    ordered: <boolean>\nAttributes: serverVersions, topologies");
    this.insert.serverVersions = [0,4.4];
    this.insert.topologies = ["ReplSet","Standalone","Shard"];
    this.insertMany = function() {
      return this.mapper.insertMany(this, ...arguments);
    };
    this.insertMany.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.insertMany\n\nInserts multiple documents into a collection.\n\ndb.collection.insertMany(documents, options)\n\ndocuments <document> An array of documents to insert into the collection.\noptions <document>\n    writeConcern <document>\n    ordered <boolean>\n\nReturns: A document containing:\n    A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled\n    An array of _id for each successfully inserted documents\nAttributes: serverVersions, topologies");
    this.insertMany.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.insertMany\n\nInserts multiple documents into a collection.\n\ndb.collection.insertMany(documents, options)\n\ndocuments <document> An array of documents to insert into the collection.\noptions <document>\n    writeConcern <document>\n    ordered <boolean>\n\nReturns: A document containing:\n    A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled\n    An array of _id for each successfully inserted documents\nAttributes: serverVersions, topologies");
    this.insertMany.serverVersions = [3.2,4.4];
    this.insertMany.topologies = ["ReplSet","Standalone","Shard"];
    this.insertOne = function() {
      return this.mapper.insertOne(this, ...arguments);
    };
    this.insertOne.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.insertOne\n\nInserts a document into a collection.\n\ndb.collection.insertOne(document, options)\n\ndocument <document> A document to insert into the collection.\noptions <document>\n    writeConcern <document>\n\nReturns: A document containing:\n    A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled.\n    A field insertedId with the _id value of the inserted document.\nAttributes: serverVersions, topologies");
    this.insertOne.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.insertOne\n\nInserts a document into a collection.\n\ndb.collection.insertOne(document, options)\n\ndocument <document> A document to insert into the collection.\noptions <document>\n    writeConcern <document>\n\nReturns: A document containing:\n    A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled.\n    A field insertedId with the _id value of the inserted document.\nAttributes: serverVersions, topologies");
    this.insertOne.serverVersions = [3.2,4.4];
    this.insertOne.topologies = ["ReplSet","Standalone","Shard"];
    this.isCapped = function() {
      return this.mapper.isCapped(this, ...arguments);
    };
    this.isCapped.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.isCapped\n\ndb.collection.isCapped()\n\nReturns true if the collection is a capped collection, otherwise returns false.\nAttributes: serverVersions, topologies");
    this.isCapped.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.isCapped\n\ndb.collection.isCapped()\n\nReturns true if the collection is a capped collection, otherwise returns false.\nAttributes: serverVersions, topologies");
    this.isCapped.serverVersions = [0,4.4];
    this.isCapped.topologies = ["ReplSet","Standalone","Shard"];
    this.remove = function() {
      return this.mapper.remove(this, ...arguments);
    };
    this.remove.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.remove\n\nRemoves documents from a collection.\n\nThe db.collection.remove() method can have one of two syntaxes. The remove() method can take a query document and an optional justOne boolean:\n\ndb.collection.remove(\n   <query>,\n   <justOne>\n)\nOr the method can take a query document and an optional remove options document:\n\nNew in version 2.6.\n\ndb.collection.remove(\n   <query>,\n   {\n     justOne: <boolean>,\n     writeConcern: <document>,\n     collation: <document>\n   }\n)\n\nReturns: The status of the operation.\nAttributes: serverVersions, topologies");
    this.remove.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.remove\n\nRemoves documents from a collection.\n\nThe db.collection.remove() method can have one of two syntaxes. The remove() method can take a query document and an optional justOne boolean:\n\ndb.collection.remove(\n   <query>,\n   <justOne>\n)\nOr the method can take a query document and an optional remove options document:\n\nNew in version 2.6.\n\ndb.collection.remove(\n   <query>,\n   {\n     justOne: <boolean>,\n     writeConcern: <document>,\n     collation: <document>\n   }\n)\n\nReturns: The status of the operation.\nAttributes: serverVersions, topologies");
    this.remove.serverVersions = [0,4.4];
    this.remove.topologies = ["ReplSet","Standalone","Shard"];
    this.save = function() {
      return this.mapper.save(this, ...arguments);
    };
    this.save.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.save\n\nUpdates an existing document or inserts a new document, depending on its document parameter.\n\ndb.collection.save(document, options)\n\ndocument <document> A document to save to the collection.\noptions <document>\n    writeConcern <document>\n\nReturns: A WriteResult object that contains the status of the operation.\nChanged in version 2.6: The save() returns an object that contains the status of the operation.\nAttributes: serverVersions, topologies");
    this.save.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.save\n\nUpdates an existing document or inserts a new document, depending on its document parameter.\n\ndb.collection.save(document, options)\n\ndocument <document> A document to save to the collection.\noptions <document>\n    writeConcern <document>\n\nReturns: A WriteResult object that contains the status of the operation.\nChanged in version 2.6: The save() returns an object that contains the status of the operation.\nAttributes: serverVersions, topologies");
    this.save.serverVersions = [0,4.4];
    this.save.topologies = ["ReplSet","Standalone","Shard"];
    this.replaceOne = function() {
      return this.mapper.replaceOne(this, ...arguments);
    };
    this.replaceOne.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.replaceOne\n\nReplaces a single document within the collection based on the filter.\n\ndb.collection.replaceOne(filter, replacement, options)\n\nfilter <document> The selection criteria for the update.\nreplacement\t<document> The replacement document.\noptions <document>\n    upsert <boolean>\n    writeConcern <document>\n    collation <document>\n    hint <document|string>\nAttributes: serverVersions, topologies");
    this.replaceOne.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.replaceOne\n\nReplaces a single document within the collection based on the filter.\n\ndb.collection.replaceOne(filter, replacement, options)\n\nfilter <document> The selection criteria for the update.\nreplacement\t<document> The replacement document.\noptions <document>\n    upsert <boolean>\n    writeConcern <document>\n    collation <document>\n    hint <document|string>\nAttributes: serverVersions, topologies");
    this.replaceOne.serverVersions = [3.2,4.4];
    this.replaceOne.topologies = ["ReplSet","Standalone","Shard"];
    this.update = function() {
      return this.mapper.update(this, ...arguments);
    };
    this.update.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.update\n\nModifies an existing document or documents in a collection.\n\ndb.collection.update(query, update, options)\n\nfilter <document> The selection criteria for the update.\nupdate <document> The modifications to apply.\noptions <document>\nupsert: <boolean>,\n     multi <boolean>\n     writeConcern <document>\n     collation <document>\n     arrayFilters [ <filterdocument1>, ... ]\n     hint  <document|string>        // Available starting in MongoDB 4.2\nAttributes: serverVersions, topologies");
    this.update.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.update\n\nModifies an existing document or documents in a collection.\n\ndb.collection.update(query, update, options)\n\nfilter <document> The selection criteria for the update.\nupdate <document> The modifications to apply.\noptions <document>\nupsert: <boolean>,\n     multi <boolean>\n     writeConcern <document>\n     collation <document>\n     arrayFilters [ <filterdocument1>, ... ]\n     hint  <document|string>        // Available starting in MongoDB 4.2\nAttributes: serverVersions, topologies");
    this.update.serverVersions = [0,4.4];
    this.update.topologies = ["ReplSet","Standalone","Shard"];
    this.updateMany = function() {
      return this.mapper.updateMany(this, ...arguments);
    };
    this.updateMany.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.updateMany\n\nUpdates all documents that match the specified filter for a collection.\n\ndb.collection.updateMany(filter, update, options)\n\nfilter <document> The selection criteria for the update.\nupdate <document> The modifications to apply.\noptions <document>\n    upsert <boolean>\n    writeConcern <document>\n    collation <document>\n    arrayFilters [ <filterdocument1>, ... ]\n    hint  <document|string>        // Available starting in MongoDB 4.2.1\nAttributes: serverVersions, topologies");
    this.updateMany.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.updateMany\n\nUpdates all documents that match the specified filter for a collection.\n\ndb.collection.updateMany(filter, update, options)\n\nfilter <document> The selection criteria for the update.\nupdate <document> The modifications to apply.\noptions <document>\n    upsert <boolean>\n    writeConcern <document>\n    collation <document>\n    arrayFilters [ <filterdocument1>, ... ]\n    hint  <document|string>        // Available starting in MongoDB 4.2.1\nAttributes: serverVersions, topologies");
    this.updateMany.serverVersions = [3.2,4.4];
    this.updateMany.topologies = ["ReplSet","Standalone","Shard"];
    this.updateOne = function() {
      return this.mapper.updateOne(this, ...arguments);
    };
    this.updateOne.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.updateOne\n\nUpdates a single document within the collection based on the filter.\n\ndb.collection.updateOne(filter, update, options)\n\nfilter <document> The selection criteria for the update.\nupdate <document> The modifications to apply.\noptions <document>\n    upsert <boolean>\n    writeConcern <document>\n    collation <document>\n    arrayFilters [ <filterdocument1>, ... ]\n    hint  <document|string>        // Available starting in MongoDB 4.2.1\nAttributes: serverVersions, topologies");
    this.updateOne.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.updateOne\n\nUpdates a single document within the collection based on the filter.\n\ndb.collection.updateOne(filter, update, options)\n\nfilter <document> The selection criteria for the update.\nupdate <document> The modifications to apply.\noptions <document>\n    upsert <boolean>\n    writeConcern <document>\n    collation <document>\n    arrayFilters [ <filterdocument1>, ... ]\n    hint  <document|string>        // Available starting in MongoDB 4.2.1\nAttributes: serverVersions, topologies");
    this.updateOne.serverVersions = [3.2,4.4];
    this.updateOne.topologies = ["ReplSet","Standalone","Shard"];

    this.toReplString = () => (this.collection);
  }
}
class Cursor {
  constructor(cursor) {
    this.cursor = cursor;
    this.help = () => ("The cursor class.\nAttributes: addOption, allowPartialResults, arrayAccess, batchSize, clone, close, collation, comment, count, explain, forEach, getQueryPlan, hasNext, hint, isClosed, isExhausted, itcount, length, limit, map, max, maxScan, maxTimeMS, min, modifiers, next, noCursorTimeout, objsLeftInBatch, oplogReplay, projection, pretty, readConcern, readOnly, readPref, returnKey, showDiskLoc, showRecordId, size, skip, snapshot, sort, tailable, toArray");
    this.help.toReplString = () => ("The cursor class.\nAttributes: addOption, allowPartialResults, arrayAccess, batchSize, clone, close, collation, comment, count, explain, forEach, getQueryPlan, hasNext, hint, isClosed, isExhausted, itcount, length, limit, map, max, maxScan, maxTimeMS, min, modifiers, next, noCursorTimeout, objsLeftInBatch, oplogReplay, projection, pretty, readConcern, readOnly, readPref, returnKey, showDiskLoc, showRecordId, size, skip, snapshot, sort, tailable, toArray");
    this.addOption = function() {
      return this.cursor.addOption(this, ...arguments);
    };
    this.addOption.help = () => ("Adds OP_QUERY wire protocol flags, such as the tailable flag, to change the behavior of queries. Accepts: DBQuery.Option fields tailable, slaveOk, noTimeout, awaitData, exhaust, partial.\nAttributes: serverVersions, topologies");
    this.addOption.help.toReplString = () => ("Adds OP_QUERY wire protocol flags, such as the tailable flag, to change the behavior of queries. Accepts: DBQuery.Option fields tailable, slaveOk, noTimeout, awaitData, exhaust, partial.\nAttributes: serverVersions, topologies");
    this.addOption.serverVersions = [-1,3.2];
    this.addOption.topologies = ["ReplSet","Standalone","Shard"];
    this.allowPartialResults = function() {
      return this.cursor.allowPartialResults(this, ...arguments);
    };
    this.allowPartialResults.help = () => ("Sets the 'partial' option to true.\nAttributes: serverVersions, topologies");
    this.allowPartialResults.help.toReplString = () => ("Sets the 'partial' option to true.\nAttributes: serverVersions, topologies");
    this.allowPartialResults.serverVersions = [-1,4.4];
    this.allowPartialResults.topologies = ["ReplSet","Standalone","Shard"];
    this.arrayAccess = function() {
      return this.cursor.arrayAccess(this, ...arguments);
    };
    this.arrayAccess.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.arrayAccess.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.arrayAccess.serverVersions = [-1,4.4];
    this.arrayAccess.topologies = ["ReplSet","Standalone","Shard"];
    this.batchSize = function() {
      return this.cursor.batchSize(this, ...arguments);
    };
    this.batchSize.help = () => ("Specifies the number of documents to return in each batch of the response from the MongoDB instance. In most cases, modifying the batch size will not affect the user or the application, as the mongo shell and most drivers return results as if MongoDB returned a single batch.\nAttributes: serverVersions, topologies");
    this.batchSize.help.toReplString = () => ("Specifies the number of documents to return in each batch of the response from the MongoDB instance. In most cases, modifying the batch size will not affect the user or the application, as the mongo shell and most drivers return results as if MongoDB returned a single batch.\nAttributes: serverVersions, topologies");
    this.batchSize.serverVersions = [-1,4.4];
    this.batchSize.topologies = ["ReplSet","Standalone","Shard"];
    this.clone = function() {
      return this.cursor.clone(this, ...arguments);
    };
    this.clone.help = () => ("Clone the cursor.\nAttributes: serverVersions, topologies");
    this.clone.help.toReplString = () => ("Clone the cursor.\nAttributes: serverVersions, topologies");
    this.clone.serverVersions = [-1,4.4];
    this.clone.topologies = ["ReplSet","Standalone","Shard"];
    this.close = function() {
      return this.cursor.close(this, ...arguments);
    };
    this.close.help = () => ("Instructs the server to close a cursor and free associated server resources. The server will automatically close cursors that have no remaining results, as well as cursors that have been idle for a period of time and lack the cursor.noCursorTimeout() option.\nAttributes: serverVersions, topologies");
    this.close.help.toReplString = () => ("Instructs the server to close a cursor and free associated server resources. The server will automatically close cursors that have no remaining results, as well as cursors that have been idle for a period of time and lack the cursor.noCursorTimeout() option.\nAttributes: serverVersions, topologies");
    this.close.serverVersions = [-1,4.4];
    this.close.topologies = ["ReplSet","Standalone","Shard"];
    this.collation = function() {
      return this.cursor.collation(this, ...arguments);
    };
    this.collation.help = () => ("Specifies the collation for the cursor returned by the db.collection.find(). To use, append to the db.collection.find().\nAttributes: serverVersions, topologies");
    this.collation.help.toReplString = () => ("Specifies the collation for the cursor returned by the db.collection.find(). To use, append to the db.collection.find().\nAttributes: serverVersions, topologies");
    this.collation.serverVersions = [3.4,4.4];
    this.collation.topologies = ["ReplSet","Standalone","Shard"];
    this.comment = function() {
      return this.cursor.comment(this, ...arguments);
    };
    this.comment.help = () => ("Adds a comment field to the query.\nAttributes: serverVersions, topologies");
    this.comment.help.toReplString = () => ("Adds a comment field to the query.\nAttributes: serverVersions, topologies");
    this.comment.serverVersions = [3.2,4.4];
    this.comment.topologies = ["ReplSet","Standalone","Shard"];
    this.count = function() {
      return this.cursor.count(this, ...arguments);
    };
    this.count.help = () => ("Counts the number of documents referenced by a cursor.\nAttributes: serverVersions, topologies, serverVersion");
    this.count.help.toReplString = () => ("Counts the number of documents referenced by a cursor.\nAttributes: serverVersions, topologies, serverVersion");
    this.count.serverVersions = [-1,4.4];
    this.count.topologies = ["ReplSet","Standalone","Shard"];
    this.count.serverVersion = [-1,4];
    this.explain = function() {
      return this.cursor.explain(this, ...arguments);
    };
    this.explain.help = () => ("Provides information on the query plan for the db.collection.find() method.\nAttributes: serverVersions, topologies");
    this.explain.help.toReplString = () => ("Provides information on the query plan for the db.collection.find() method.\nAttributes: serverVersions, topologies");
    this.explain.serverVersions = [-1,4.4];
    this.explain.topologies = ["ReplSet","Standalone","Shard"];
    this.forEach = function() {
      return this.cursor.forEach(this, ...arguments);
    };
    this.forEach.help = () => ("Iterates the cursor to apply a JavaScript function to each document from the cursor.\nAttributes: serverVersions, topologies");
    this.forEach.help.toReplString = () => ("Iterates the cursor to apply a JavaScript function to each document from the cursor.\nAttributes: serverVersions, topologies");
    this.forEach.serverVersions = [-1,4.4];
    this.forEach.topologies = ["ReplSet","Standalone","Shard"];
    this.getQueryPlan = function() {
      return this.cursor.getQueryPlan(this, ...arguments);
    };
    this.getQueryPlan.help = () => ("Runs cursor.explain()\nAttributes: serverVersions, topologies");
    this.getQueryPlan.help.toReplString = () => ("Runs cursor.explain()\nAttributes: serverVersions, topologies");
    this.getQueryPlan.serverVersions = [-1,4.4];
    this.getQueryPlan.topologies = ["ReplSet","Standalone","Shard"];
    this.hasNext = function() {
      return this.cursor.hasNext(this, ...arguments);
    };
    this.hasNext.help = () => ("cursor.hasNext() returns true if the cursor returned by the db.collection.find() query can iterate further to return more documents.\nAttributes: serverVersions, topologies");
    this.hasNext.help.toReplString = () => ("cursor.hasNext() returns true if the cursor returned by the db.collection.find() query can iterate further to return more documents.\nAttributes: serverVersions, topologies");
    this.hasNext.serverVersions = [-1,4.4];
    this.hasNext.topologies = ["ReplSet","Standalone","Shard"];
    this.hint = function() {
      return this.cursor.hint(this, ...arguments);
    };
    this.hint.help = () => ("Call this method on a query to override MongoDB’s default index selection and query optimization process. Use db.collection.getIndexes() to return the list of current indexes on a collection.\nAttributes: serverVersions, topologies");
    this.hint.help.toReplString = () => ("Call this method on a query to override MongoDB’s default index selection and query optimization process. Use db.collection.getIndexes() to return the list of current indexes on a collection.\nAttributes: serverVersions, topologies");
    this.hint.serverVersions = [-1,4.4];
    this.hint.topologies = ["ReplSet","Standalone","Shard"];
    this.isClosed = function() {
      return this.cursor.isClosed(this, ...arguments);
    };
    this.isClosed.help = () => ("Returns true if the cursor is closed.\nAttributes: serverVersions, topologies");
    this.isClosed.help.toReplString = () => ("Returns true if the cursor is closed.\nAttributes: serverVersions, topologies");
    this.isClosed.serverVersions = [-1,4.4];
    this.isClosed.topologies = ["ReplSet","Standalone","Shard"];
    this.isExhausted = function() {
      return this.cursor.isExhausted(this, ...arguments);
    };
    this.isExhausted.help = () => ("cursor.isExhausted() returns true if the cursor is closed and there are no remaining objects in the batch.\nAttributes: serverVersions, topologies");
    this.isExhausted.help.toReplString = () => ("cursor.isExhausted() returns true if the cursor is closed and there are no remaining objects in the batch.\nAttributes: serverVersions, topologies");
    this.isExhausted.serverVersions = [-1,4.4];
    this.isExhausted.topologies = ["ReplSet","Standalone","Shard"];
    this.itcount = function() {
      return this.cursor.itcount(this, ...arguments);
    };
    this.itcount.help = () => ("Counts the number of documents remaining in a cursor. itcount() is similar to cursor.count(), but actually executes the query on an existing iterator, exhausting its contents in the process.\nAttributes: serverVersions, topologies");
    this.itcount.help.toReplString = () => ("Counts the number of documents remaining in a cursor. itcount() is similar to cursor.count(), but actually executes the query on an existing iterator, exhausting its contents in the process.\nAttributes: serverVersions, topologies");
    this.itcount.serverVersions = [-1,4.4];
    this.itcount.topologies = ["ReplSet","Standalone","Shard"];
    this.length = function() {
      return this.cursor.length(this, ...arguments);
    };
    this.length.help = () => ("Runs cursor.count()\nAttributes: serverVersions, topologies");
    this.length.help.toReplString = () => ("Runs cursor.count()\nAttributes: serverVersions, topologies");
    this.length.serverVersions = [-1,4.4];
    this.length.topologies = ["ReplSet","Standalone","Shard"];
    this.limit = function() {
      return this.cursor.limit(this, ...arguments);
    };
    this.limit.help = () => ("Use the limit() method on a cursor to specify the maximum number of documents the cursor will return.\nAttributes: serverVersions, topologies");
    this.limit.help.toReplString = () => ("Use the limit() method on a cursor to specify the maximum number of documents the cursor will return.\nAttributes: serverVersions, topologies");
    this.limit.serverVersions = [-1,4.4];
    this.limit.topologies = ["ReplSet","Standalone","Shard"];
    this.map = function() {
      return this.cursor.map(this, ...arguments);
    };
    this.map.help = () => ("Applies the first argument, a function, to each document visited by the cursor and collects the return values from successive application into an array.\nAttributes: serverVersions, topologies");
    this.map.help.toReplString = () => ("Applies the first argument, a function, to each document visited by the cursor and collects the return values from successive application into an array.\nAttributes: serverVersions, topologies");
    this.map.serverVersions = [-1,4.4];
    this.map.topologies = ["ReplSet","Standalone","Shard"];
    this.max = function() {
      return this.cursor.max(this, ...arguments);
    };
    this.max.help = () => ("Specifies the exclusive upper bound for a specific index in order to constrain the results of find(). max() provides a way to specify an upper bound on compound key indexes.\nAttributes: serverVersions, topologies");
    this.max.help.toReplString = () => ("Specifies the exclusive upper bound for a specific index in order to constrain the results of find(). max() provides a way to specify an upper bound on compound key indexes.\nAttributes: serverVersions, topologies");
    this.max.serverVersions = [-1,4.4];
    this.max.topologies = ["ReplSet","Standalone","Shard"];
    this.maxScan = function() {
      return this.cursor.maxScan(this, ...arguments);
    };
    this.maxScan.help = () => ("Constrains the query to only scan the specified number of documents when fulfilling the query.\nAttributes: serverVersions, topologies");
    this.maxScan.help.toReplString = () => ("Constrains the query to only scan the specified number of documents when fulfilling the query.\nAttributes: serverVersions, topologies");
    this.maxScan.serverVersions = [-1,4];
    this.maxScan.topologies = ["ReplSet","Standalone","Shard"];
    this.maxTimeMS = function() {
      return this.cursor.maxTimeMS(this, ...arguments);
    };
    this.maxTimeMS.help = () => ("Specifies a cumulative time limit in milliseconds for processing operations on a cursor.\nAttributes: serverVersions, topologies");
    this.maxTimeMS.help.toReplString = () => ("Specifies a cumulative time limit in milliseconds for processing operations on a cursor.\nAttributes: serverVersions, topologies");
    this.maxTimeMS.serverVersions = [-1,4.4];
    this.maxTimeMS.topologies = ["ReplSet","Standalone","Shard"];
    this.min = function() {
      return this.cursor.min(this, ...arguments);
    };
    this.min.help = () => ("Specifies the inclusive lower bound for a specific index in order to constrain the results of find(). min() provides a way to specify lower bounds on compound key indexes.\nAttributes: serverVersions, topologies");
    this.min.help.toReplString = () => ("Specifies the inclusive lower bound for a specific index in order to constrain the results of find(). min() provides a way to specify lower bounds on compound key indexes.\nAttributes: serverVersions, topologies");
    this.min.serverVersions = [-1,4.4];
    this.min.topologies = ["ReplSet","Standalone","Shard"];
    this.modifiers = function() {
      return this.cursor.modifiers(this, ...arguments);
    };
    this.modifiers.help = () => ("Get query modifiers.\nAttributes: serverVersions, topologies");
    this.modifiers.help.toReplString = () => ("Get query modifiers.\nAttributes: serverVersions, topologies");
    this.modifiers.serverVersions = [-1,4.4];
    this.modifiers.topologies = ["ReplSet","Standalone","Shard"];
    this.next = function() {
      return this.cursor.next(this, ...arguments);
    };
    this.next.help = () => ("The next document in the cursor returned by the db.collection.find() method.\nAttributes: serverVersions, topologies");
    this.next.help.toReplString = () => ("The next document in the cursor returned by the db.collection.find() method.\nAttributes: serverVersions, topologies");
    this.next.serverVersions = [-1,4.4];
    this.next.topologies = ["ReplSet","Standalone","Shard"];
    this.noCursorTimeout = function() {
      return this.cursor.noCursorTimeout(this, ...arguments);
    };
    this.noCursorTimeout.help = () => ("Instructs the server to avoid closing a cursor automatically after a period of inactivity.\nAttributes: serverVersions, topologies");
    this.noCursorTimeout.help.toReplString = () => ("Instructs the server to avoid closing a cursor automatically after a period of inactivity.\nAttributes: serverVersions, topologies");
    this.noCursorTimeout.serverVersions = [-1,4.4];
    this.noCursorTimeout.topologies = ["ReplSet","Standalone","Shard"];
    this.objsLeftInBatch = function() {
      return this.cursor.objsLeftInBatch(this, ...arguments);
    };
    this.objsLeftInBatch.help = () => ("cursor.objsLeftInBatch() returns the number of documents remaining in the current batch.\nAttributes: serverVersions, topologies");
    this.objsLeftInBatch.help.toReplString = () => ("cursor.objsLeftInBatch() returns the number of documents remaining in the current batch.\nAttributes: serverVersions, topologies");
    this.objsLeftInBatch.serverVersions = [-1,4.4];
    this.objsLeftInBatch.topologies = ["ReplSet","Standalone","Shard"];
    this.oplogReplay = function() {
      return this.cursor.oplogReplay(this, ...arguments);
    };
    this.oplogReplay.help = () => ("Sets oplogReplay cursor flag to true.\nAttributes: serverVersions, topologies");
    this.oplogReplay.help.toReplString = () => ("Sets oplogReplay cursor flag to true.\nAttributes: serverVersions, topologies");
    this.oplogReplay.serverVersions = [-1,4.4];
    this.oplogReplay.topologies = ["ReplSet","Standalone","Shard"];
    this.projection = function() {
      return this.cursor.projection(this, ...arguments);
    };
    this.projection.help = () => ("Sets a field projection for the query.\nAttributes: serverVersions, topologies");
    this.projection.help.toReplString = () => ("Sets a field projection for the query.\nAttributes: serverVersions, topologies");
    this.projection.serverVersions = [-1,4.4];
    this.projection.topologies = ["ReplSet","Standalone","Shard"];
    this.pretty = function() {
      return this.cursor.pretty(this, ...arguments);
    };
    this.pretty.help = () => ("Configures the cursor to display results in an easy-to-read format.\nAttributes: serverVersions, topologies");
    this.pretty.help.toReplString = () => ("Configures the cursor to display results in an easy-to-read format.\nAttributes: serverVersions, topologies");
    this.pretty.serverVersions = [-1,4.4];
    this.pretty.topologies = ["ReplSet","Standalone","Shard"];
    this.readConcern = function() {
      return this.cursor.readConcern(this, ...arguments);
    };
    this.readConcern.help = () => ("Specify a read concern for the db.collection.find() method.\nAttributes: serverVersions, topologies");
    this.readConcern.help.toReplString = () => ("Specify a read concern for the db.collection.find() method.\nAttributes: serverVersions, topologies");
    this.readConcern.serverVersions = [3.2,4.4];
    this.readConcern.topologies = ["ReplSet","Standalone","Shard"];
    this.readOnly = function() {
      return this.cursor.readOnly(this, ...arguments);
    };
    this.readOnly.help = () => ("TODO\nAttributes: serverVersions, topologies");
    this.readOnly.help.toReplString = () => ("TODO\nAttributes: serverVersions, topologies");
    this.readOnly.serverVersions = [-1,4.4];
    this.readOnly.topologies = ["ReplSet","Standalone","Shard"];
    this.readPref = function() {
      return this.cursor.readPref(this, ...arguments);
    };
    this.readPref.help = () => ("Append readPref() to a cursor to control how the client routes the query to members of the replica set.\nAttributes: serverVersions, topologies");
    this.readPref.help.toReplString = () => ("Append readPref() to a cursor to control how the client routes the query to members of the replica set.\nAttributes: serverVersions, topologies");
    this.readPref.serverVersions = [-1,4.4];
    this.readPref.topologies = ["ReplSet","Standalone","Shard"];
    this.returnKey = function() {
      return this.cursor.returnKey(this, ...arguments);
    };
    this.returnKey.help = () => ("Modifies the cursor to return index keys rather than the documents.\nAttributes: serverVersions, topologies");
    this.returnKey.help.toReplString = () => ("Modifies the cursor to return index keys rather than the documents.\nAttributes: serverVersions, topologies");
    this.returnKey.serverVersions = [3.2,4.4];
    this.returnKey.topologies = ["ReplSet","Standalone","Shard"];
    this.showDiskLoc = function() {
      return this.cursor.showDiskLoc(this, ...arguments);
    };
    this.showDiskLoc.help = () => ("The $showDiskLoc option has now been deprecated and replaced with the showRecordId field. $showDiskLoc will still be accepted for OP_QUERY stye find.\nAttributes: serverVersions, topologies");
    this.showDiskLoc.help.toReplString = () => ("The $showDiskLoc option has now been deprecated and replaced with the showRecordId field. $showDiskLoc will still be accepted for OP_QUERY stye find.\nAttributes: serverVersions, topologies");
    this.showDiskLoc.serverVersions = [-1,4.4];
    this.showDiskLoc.topologies = ["ReplSet","Standalone","Shard"];
    this.showRecordId = function() {
      return this.cursor.showRecordId(this, ...arguments);
    };
    this.showRecordId.help = () => ("Modifies the output of a query by adding a field $recordId to matching documents. $recordId is the internal key which uniquely identifies a document in a collection.\nAttributes: serverVersions, topologies");
    this.showRecordId.help.toReplString = () => ("Modifies the output of a query by adding a field $recordId to matching documents. $recordId is the internal key which uniquely identifies a document in a collection.\nAttributes: serverVersions, topologies");
    this.showRecordId.serverVersions = [-1,4.4];
    this.showRecordId.topologies = ["ReplSet","Standalone","Shard"];
    this.size = function() {
      return this.cursor.size(this, ...arguments);
    };
    this.size.help = () => ("A count of the number of documents that match the db.collection.find() query after applying any cursor.skip() and cursor.limit() methods.\nAttributes: serverVersions, topologies");
    this.size.help.toReplString = () => ("A count of the number of documents that match the db.collection.find() query after applying any cursor.skip() and cursor.limit() methods.\nAttributes: serverVersions, topologies");
    this.size.serverVersions = [-1,4.4];
    this.size.topologies = ["ReplSet","Standalone","Shard"];
    this.skip = function() {
      return this.cursor.skip(this, ...arguments);
    };
    this.skip.help = () => ("Call the cursor.skip() method on a cursor to control where MongoDB begins returning results. This approach may be useful in implementing paginated results.\nAttributes: serverVersions, topologies");
    this.skip.help.toReplString = () => ("Call the cursor.skip() method on a cursor to control where MongoDB begins returning results. This approach may be useful in implementing paginated results.\nAttributes: serverVersions, topologies");
    this.skip.serverVersions = [-1,4.4];
    this.skip.topologies = ["ReplSet","Standalone","Shard"];
    this.snapshot = function() {
      return this.cursor.snapshot(this, ...arguments);
    };
    this.snapshot.help = () => ("The $snapshot operator prevents the cursor from returning a document more than once because an intervening write operation results in a move of the document.\nAttributes: serverVersions, topologies");
    this.snapshot.help.toReplString = () => ("The $snapshot operator prevents the cursor from returning a document more than once because an intervening write operation results in a move of the document.\nAttributes: serverVersions, topologies");
    this.snapshot.serverVersions = [-1,4];
    this.snapshot.topologies = ["ReplSet","Standalone","Shard"];
    this.sort = function() {
      return this.cursor.sort(this, ...arguments);
    };
    this.sort.help = () => ("Specifies the order in which the query returns matching documents. You must apply sort() to the cursor before retrieving any documents from the database.\nAttributes: serverVersions, topologies");
    this.sort.help.toReplString = () => ("Specifies the order in which the query returns matching documents. You must apply sort() to the cursor before retrieving any documents from the database.\nAttributes: serverVersions, topologies");
    this.sort.serverVersions = [-1,4.4];
    this.sort.topologies = ["ReplSet","Standalone","Shard"];
    this.tailable = function() {
      return this.cursor.tailable(this, ...arguments);
    };
    this.tailable.help = () => ("Marks the cursor as tailable.\nAttributes: serverVersions, topologies");
    this.tailable.help.toReplString = () => ("Marks the cursor as tailable.\nAttributes: serverVersions, topologies");
    this.tailable.serverVersions = [3.2,4.4];
    this.tailable.topologies = ["ReplSet","Standalone","Shard"];
    this.toArray = function() {
      return this.cursor.toArray(this, ...arguments);
    };
    this.toArray.help = () => ("The toArray() method returns an array that contains all the documents from a cursor. The method iterates completely the cursor, loading all the documents into RAM and exhausting the cursor.\nAttributes: serverVersions, topologies");
    this.toArray.help.toReplString = () => ("The toArray() method returns an array that contains all the documents from a cursor. The method iterates completely the cursor, loading all the documents into RAM and exhausting the cursor.\nAttributes: serverVersions, topologies");
    this.toArray.serverVersions = [-1,4.4];
    this.toArray.topologies = ["ReplSet","Standalone","Shard"];

    // this.toReplString = () => (this.cursor.toArray());
  }
  toReplString() {
    return this.cursor.toArray();
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
class DeleteResult {
  constructor(temp) {
    this.temp = temp;
    this.help = () => ("A temp class.\nAttributes: ");
    this.help.toReplString = () => ("A temp class.\nAttributes: ");

    this.toReplString = () => (this.TempClass);
  }
}
class InsertManyResult {
  constructor(temp) {
    this.temp = temp;
    this.help = () => ("A temp class.\nAttributes: ");
    this.help.toReplString = () => ("A temp class.\nAttributes: ");

    this.toReplString = () => (this.TempClass);
  }
}
class InsertOneResult {
  constructor(temp) {
    this.temp = temp;
    this.help = () => ("A temp class.\nAttributes: ");
    this.help.toReplString = () => ("A temp class.\nAttributes: ");

    this.toReplString = () => (this.TempClass);
  }
}
class ReplicaSet {
  constructor() {
    this.help = () => ("The Replica Set class.\nAttributes: ");
    this.help.toReplString = () => ("The Replica Set class.\nAttributes: ");
  }
}
class Shard {
  constructor() {
    this.help = () => ("The shard class.\nAttributes: ");
    this.help.toReplString = () => ("The shard class.\nAttributes: ");
  }
}
class ShellApi {
  constructor() {
    this.help = () => ("Welcome to the new MongoDB Shell!\nAttributes: use");
    this.help.toReplString = () => ("Welcome to the new MongoDB Shell!\nAttributes: use");
    this.use = function() {
      return this.undefined.use(this, ...arguments);
    };
    this.use.help = () => ("default help\nAttributes: serverVersions, topologies");
    this.use.help.toReplString = () => ("default help\nAttributes: serverVersions, topologies");
    this.use.serverVersions = [-1,4.4];
    this.use.topologies = ["ReplSet","Standalone","Shard"];
  }
}
class UpdateResult {
  constructor(temp) {
    this.temp = temp;
    this.help = () => ("A temp class.\nAttributes: ");
    this.help.toReplString = () => ("A temp class.\nAttributes: ");

    this.toReplString = () => (this.TempClass);
  }
}

module.exports = ShellApi;
module.exports.AggregationCursor = AggregationCursor;
module.exports.BulkWriteResult = BulkWriteResult;
module.exports.Collection = Collection;
module.exports.Cursor = Cursor;
module.exports.Database = Database;
module.exports.DeleteResult = DeleteResult;
module.exports.InsertManyResult = InsertManyResult;
module.exports.InsertOneResult = InsertOneResult;
module.exports.ReplicaSet = ReplicaSet;
module.exports.Shard = Shard;
module.exports.ShellApi = ShellApi;
module.exports.UpdateResult = UpdateResult;
