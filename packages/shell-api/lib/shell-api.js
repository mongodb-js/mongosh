class AggregationCursor {
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

    this.toReplString = () => (this.cursor.toArray((error, documents) => { if (error) { throw error; } console.log(JSON.stringify(documents)); }));
  }
}
class BulkWriteResult {
  constructor(mapper, temp) {
    this.mapper = mapper;
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

    this.toReplString = () => (this.this.collection);
  }
}
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

    this.toReplString = () => (this.cursor.toArray((error, documents) => { if (error) { throw error; } console.log(JSON.stringify(documents)); }));
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
  constructor(mapper, temp) {
    this.mapper = mapper;
    this.temp = temp;
    this.help = () => ("A temp class.\nAttributes: ");
    this.help.toReplString = () => ("A temp class.\nAttributes: ");

    this.toReplString = () => (this.TempClass);
  }
}
class InsertManyResult {
  constructor(mapper, temp) {
    this.mapper = mapper;
    this.temp = temp;
    this.help = () => ("A temp class.\nAttributes: ");
    this.help.toReplString = () => ("A temp class.\nAttributes: ");

    this.toReplString = () => (this.TempClass);
  }
}
class InsertOneResult {
  constructor(mapper, temp) {
    this.mapper = mapper;
    this.temp = temp;
    this.help = () => ("A temp class.\nAttributes: ");
    this.help.toReplString = () => ("A temp class.\nAttributes: ");

    this.toReplString = () => (this.TempClass);
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
class UpdateResult {
  constructor(mapper, temp) {
    this.mapper = mapper;
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
