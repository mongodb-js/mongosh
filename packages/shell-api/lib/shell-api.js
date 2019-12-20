/* AUTO-GENERATED SHELL API CLASSES*/
class AggregationCursor {
  constructor(_mapper, _cursor) {
    this._mapper = _mapper;
    this._cursor = _cursor;

    this.toReplString = () => {
      return this._mapper.it();
    };
    this.help = () => ("The aggregation cursor class.\nAttributes: bsonsize, close, forEach, hasNext, isClosed, isExhausted, itcount, map, next, objsLeftInBatch, toArray");
    this.help.toReplString = () => ("The aggregation cursor class.\nAttributes: bsonsize, close, forEach, hasNext, isClosed, isExhausted, itcount, map, next, objsLeftInBatch, toArray");
    this.bsonsize = function() {
      return this._cursor.bsonsize(...arguments);
    };
    this.bsonsize.help = () => ("!! No help defined for this method\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.bsonsize.help.toReplString = () => ("!! No help defined for this method\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.bsonsize.serverVersions = [0,4.4];
    this.bsonsize.topologies = [0,1,2];
    this.bsonsize.returnsPromise = false;
    this.bsonsize.returnType = "Unknown";
    this.close = function() {
      return this._cursor.close(...arguments);
    };
    this.close.help = () => ("Instructs the server to close a cursor and free associated server resources. The server will automatically close cursors that have no remaining results, as well as cursors that have been idle for a period of time and lack the cursor.noCursorTimeout() option.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.close.help.toReplString = () => ("Instructs the server to close a cursor and free associated server resources. The server will automatically close cursors that have no remaining results, as well as cursors that have been idle for a period of time and lack the cursor.noCursorTimeout() option.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.close.serverVersions = [0,4.4];
    this.close.topologies = [0,1,2];
    this.close.returnsPromise = false;
    this.close.returnType = "Unknown";
    this.forEach = function() {
      return this._cursor.forEach(...arguments);
    };
    this.forEach.help = () => ("Iterates the cursor to apply a JavaScript function to each document from the cursor.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.forEach.help.toReplString = () => ("Iterates the cursor to apply a JavaScript function to each document from the cursor.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.forEach.serverVersions = [0,4.4];
    this.forEach.topologies = [0,1,2];
    this.forEach.returnsPromise = false;
    this.forEach.returnType = "Unknown";
    this.hasNext = function() {
      return this._cursor.hasNext(...arguments);
    };
    this.hasNext.help = () => ("cursor.hasNext() returns true if the cursor returned by the db.collection.aggregate() can iterate further to return more documents.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.hasNext.help.toReplString = () => ("cursor.hasNext() returns true if the cursor returned by the db.collection.aggregate() can iterate further to return more documents.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.hasNext.serverVersions = [0,4.4];
    this.hasNext.topologies = [0,1,2];
    this.hasNext.returnsPromise = false;
    this.hasNext.returnType = "Unknown";
    this.isClosed = function() {
      return this._cursor.isClosed(...arguments);
    };
    this.isClosed.help = () => ("Returns true if the cursor is closed.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.isClosed.help.toReplString = () => ("Returns true if the cursor is closed.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.isClosed.serverVersions = [0,4.4];
    this.isClosed.topologies = [0,1,2];
    this.isClosed.returnsPromise = false;
    this.isClosed.returnType = "Unknown";
    this.isExhausted = function() {
      return this._cursor.isExhausted(...arguments);
    };
    this.isExhausted.help = () => ("cursor.isExhausted() returns true if the cursor is closed and there are no remaining objects in the batch.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.isExhausted.help.toReplString = () => ("cursor.isExhausted() returns true if the cursor is closed and there are no remaining objects in the batch.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.isExhausted.serverVersions = [0,4.4];
    this.isExhausted.topologies = [0,1,2];
    this.isExhausted.returnsPromise = false;
    this.isExhausted.returnType = "Unknown";
    this.itcount = function() {
      return this._cursor.itcount(...arguments);
    };
    this.itcount.help = () => ("Counts the number of documents remaining in a cursor. itcount() is similar to cursor.count(), but actually executes the query on an existing iterator, exhausting its contents in the process.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.itcount.help.toReplString = () => ("Counts the number of documents remaining in a cursor. itcount() is similar to cursor.count(), but actually executes the query on an existing iterator, exhausting its contents in the process.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.itcount.serverVersions = [0,4.4];
    this.itcount.topologies = [0,1,2];
    this.itcount.returnsPromise = false;
    this.itcount.returnType = "Unknown";
    this.map = function() {
      return this._cursor.map(...arguments);
    };
    this.map.help = () => ("Applies the first argument, a function, to each document visited by the cursor and collects the return values from successive application into an array.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.map.help.toReplString = () => ("Applies the first argument, a function, to each document visited by the cursor and collects the return values from successive application into an array.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.map.serverVersions = [0,4.4];
    this.map.topologies = [0,1,2];
    this.map.returnsPromise = false;
    this.map.returnType = "Unknown";
    this.next = function() {
      return this._cursor.next(...arguments);
    };
    this.next.help = () => ("The next document in the cursor returned by the db.collection.find() method.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.next.help.toReplString = () => ("The next document in the cursor returned by the db.collection.find() method.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.next.serverVersions = [0,4.4];
    this.next.topologies = [0,1,2];
    this.next.returnsPromise = false;
    this.next.returnType = "Unknown";
    this.objsLeftInBatch = function() {
      return this._cursor.objsLeftInBatch(...arguments);
    };
    this.objsLeftInBatch.help = () => ("cursor.objsLeftInBatch() returns the number of documents remaining in the current batch.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.objsLeftInBatch.help.toReplString = () => ("cursor.objsLeftInBatch() returns the number of documents remaining in the current batch.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.objsLeftInBatch.serverVersions = [0,4.4];
    this.objsLeftInBatch.topologies = [0,1,2];
    this.objsLeftInBatch.returnsPromise = false;
    this.objsLeftInBatch.returnType = "Unknown";
    this.toArray = function() {
      return this._cursor.toArray(...arguments);
    };
    this.toArray.help = () => ("The toArray() method returns an array that contains all the documents from a cursor. The method iterates completely the cursor, loading all the documents into RAM and exhausting the cursor.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.toArray.help.toReplString = () => ("The toArray() method returns an array that contains all the documents from a cursor. The method iterates completely the cursor, loading all the documents into RAM and exhausting the cursor.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.toArray.serverVersions = [0,4.4];
    this.toArray.topologies = [0,1,2];
    this.toArray.returnsPromise = false;
    this.toArray.returnType = "Unknown";
  }
}
class BulkWriteResult {
  constructor(ackowledged, insertedCount, insertedIds, matchedCount, modifedCount, deletedCount, upsertedCount, upsertedIds) {
    this.ackowledged = ackowledged;
    this.insertedCount = insertedCount;
    this.insertedIds = insertedIds;
    this.matchedCount = matchedCount;
    this.modifedCount = modifedCount;
    this.deletedCount = deletedCount;
    this.upsertedCount = upsertedCount;
    this.upsertedIds = upsertedIds;

    this.toReplString = () => {
      return JSON.stringify(this, null, ' ');
    };
    this.help = () => ("The BulkWriteResult class.\nAttributes: ackowledged, insertedCount, insertedIds, matchedCount, modifedCount, deletedCount, upsertedCount, upsertedIds");
    this.help.toReplString = () => ("The BulkWriteResult class.\nAttributes: ackowledged, insertedCount, insertedIds, matchedCount, modifedCount, deletedCount, upsertedCount, upsertedIds");
  }
}
class Collection {
  constructor(_mapper, _database, _collection) {
    this._mapper = _mapper;
    this._database = _database;
    this._collection = _collection;

    this.toReplString = () => {
      return this._collection;
    };
    this.help = () => ("The collection class.\nAttributes: aggregate, bulkWrite, countDocuments, count, deleteMany, deleteOne, distinct, estimatedDocumentCount, find, findAndModify, findOne, findOneAndDelete, findOneAndReplace, findOneAndUpdate, insert, insertMany, insertOne, isCapped, remove, save, replaceOne, update, updateMany, updateOne");
    this.help.toReplString = () => ("The collection class.\nAttributes: aggregate, bulkWrite, countDocuments, count, deleteMany, deleteOne, distinct, estimatedDocumentCount, find, findAndModify, findOne, findOneAndDelete, findOneAndReplace, findOneAndUpdate, insert, insertMany, insertOne, isCapped, remove, save, replaceOne, update, updateMany, updateOne");
    this.aggregate = function() {
      return this._mapper.aggregate(this, ...arguments);
    };
    this.aggregate.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.aggregate\n\nCalculates aggregate values for the data in a collection or a view.\n\ndb.collection.aggregate(pipeline, options)\n\npipeline <array> A sequence of data aggregation operations or stages.\noptions <document>\n    explain <bool>\n    allowDiskUse <bool>\n    cursor <document>\n    maxTimeMS <int>\n    bypassDocumentValidation <bool>\n    readConcern <document>\n    collation <document>\n    hint <document>\n    comment <string>\n    writeConcern <document>\n\nReturns: A cursor to the documents produced by the final stage of the aggregation pipeline operation, or if you include the explain option, the document that provides details on the processing of the aggregation operation. If the pipeline includes the $out operator, aggregate() returns an empty cursor.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.aggregate.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.aggregate\n\nCalculates aggregate values for the data in a collection or a view.\n\ndb.collection.aggregate(pipeline, options)\n\npipeline <array> A sequence of data aggregation operations or stages.\noptions <document>\n    explain <bool>\n    allowDiskUse <bool>\n    cursor <document>\n    maxTimeMS <int>\n    bypassDocumentValidation <bool>\n    readConcern <document>\n    collation <document>\n    hint <document>\n    comment <string>\n    writeConcern <document>\n\nReturns: A cursor to the documents produced by the final stage of the aggregation pipeline operation, or if you include the explain option, the document that provides details on the processing of the aggregation operation. If the pipeline includes the $out operator, aggregate() returns an empty cursor.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.aggregate.serverVersions = [0,4.4];
    this.aggregate.topologies = [0,1,2];
    this.aggregate.returnsPromise = false;
    this.aggregate.returnType = "AggregationCursor";
    this.bulkWrite = function() {
      return this._mapper.bulkWrite(this, ...arguments);
    };
    this.bulkWrite.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.bulkWrite\n\nPerforms multiple write operations with controls for order of execution.\n\ndb.collection.bulkWrite(operations, options)\n\noperations <array> An array of bulkWrite() write operations.\noptions <document>\n    writeConcern <document>\n    ordered\t<boolean>\n\nReturns: A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled.\n         A count for each write operation.\n         An array containing an _id for each successfully inserted or upserted documents.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.bulkWrite.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.bulkWrite\n\nPerforms multiple write operations with controls for order of execution.\n\ndb.collection.bulkWrite(operations, options)\n\noperations <array> An array of bulkWrite() write operations.\noptions <document>\n    writeConcern <document>\n    ordered\t<boolean>\n\nReturns: A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled.\n         A count for each write operation.\n         An array containing an _id for each successfully inserted or upserted documents.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.bulkWrite.serverVersions = [3.2,4.4];
    this.bulkWrite.topologies = [0,1,2];
    this.bulkWrite.returnsPromise = true;
    this.bulkWrite.returnType = "Unknown";
    this.countDocuments = function() {
      return this._mapper.countDocuments(this, ...arguments);
    };
    this.countDocuments.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.countDocuments\n\nReturns the count of documents that match the query for a collection or view.\n\ndb.collection.countDocuments(query, options)\n\nquery <document> The query selection criteria. To count all documents, specify an empty document.\noptions <document>\n    limit <integer>\tOptional. The maximum number of documents to count.\n    skip <integer>\tOptional. The number of documents to skip before counting.\n    hint <string or document>\tOptional. An index name or the index specification to use for the query.\n    maxTimeMS <integer>\tOptional. The maximum amount of time to allow the count to run.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.countDocuments.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.countDocuments\n\nReturns the count of documents that match the query for a collection or view.\n\ndb.collection.countDocuments(query, options)\n\nquery <document> The query selection criteria. To count all documents, specify an empty document.\noptions <document>\n    limit <integer>\tOptional. The maximum number of documents to count.\n    skip <integer>\tOptional. The number of documents to skip before counting.\n    hint <string or document>\tOptional. An index name or the index specification to use for the query.\n    maxTimeMS <integer>\tOptional. The maximum amount of time to allow the count to run.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.countDocuments.serverVersions = ["4.0.3",4.4];
    this.countDocuments.topologies = [0,1,2];
    this.countDocuments.returnsPromise = true;
    this.countDocuments.returnType = "Unknown";
    this.count = function() {
      return this._mapper.count(this, ...arguments);
    };
    this.count.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.count\n\nReturns the count of documents that would match a find() query for the collection or view. The db.collection.count() method does not perform the find() operation but instead counts and returns the number of results that match a query.\nAvoid using the db.collection.count() method without a query predicate since without the query predicate, the method returns results based on the collection’s metadata, which may result in an approximate count.\n\ndb.collection.count(query, options)\n\nquery\t<document>\tThe query selection criteria.\noptions\t<document>\n    limit <integer>\tOptional. The maximum number of documents to count.\n    skip <integer>\tOptional. The number of documents to skip before counting.\n    hint <string or document> Optional. An index name hint or specification for the query.\n    maxTimeMS <integer>\tOptional. The maximum amount of time to allow the query to run.\n    readConcern\t<string>\n    collation <document>\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.count.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.count\n\nReturns the count of documents that would match a find() query for the collection or view. The db.collection.count() method does not perform the find() operation but instead counts and returns the number of results that match a query.\nAvoid using the db.collection.count() method without a query predicate since without the query predicate, the method returns results based on the collection’s metadata, which may result in an approximate count.\n\ndb.collection.count(query, options)\n\nquery\t<document>\tThe query selection criteria.\noptions\t<document>\n    limit <integer>\tOptional. The maximum number of documents to count.\n    skip <integer>\tOptional. The number of documents to skip before counting.\n    hint <string or document> Optional. An index name hint or specification for the query.\n    maxTimeMS <integer>\tOptional. The maximum amount of time to allow the query to run.\n    readConcern\t<string>\n    collation <document>\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.count.serverVersions = [0,4.4];
    this.count.topologies = [0,1,2];
    this.count.returnsPromise = true;
    this.count.returnType = "Unknown";
    this.deleteMany = function() {
      return this._mapper.deleteMany(this, ...arguments);
    };
    this.deleteMany.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.deleteMany\n\nRemoves all documents that match the filter from a collection.\n\ndb.collection.deleteMany()\n\nfilter\t<document> Specifies deletion criteria using query operators.\noptions <document>\n    writeConcern <document>\n    collation <document>\n\nReturns: A document containing:\n    A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled\n    deletedCount containing the number of deleted documents\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.deleteMany.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.deleteMany\n\nRemoves all documents that match the filter from a collection.\n\ndb.collection.deleteMany()\n\nfilter\t<document> Specifies deletion criteria using query operators.\noptions <document>\n    writeConcern <document>\n    collation <document>\n\nReturns: A document containing:\n    A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled\n    deletedCount containing the number of deleted documents\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.deleteMany.serverVersions = [0,4.4];
    this.deleteMany.topologies = [0,1,2];
    this.deleteMany.returnsPromise = true;
    this.deleteMany.returnType = "Unknown";
    this.deleteOne = function() {
      return this._mapper.deleteOne(this, ...arguments);
    };
    this.deleteOne.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.deleteOne\n\nRemoves a single document from a collection.\n\ndb.collection.deleteOne(filter, options)\n\nfilter <document> Specifies deletion criteria using query operators.\noptions <document>\n    writeConcern <document>\n    collation <document>\n\nReturns:\tA document containing:\n    A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled\n    deletedCount containing the number of deleted documents\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.deleteOne.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.deleteOne\n\nRemoves a single document from a collection.\n\ndb.collection.deleteOne(filter, options)\n\nfilter <document> Specifies deletion criteria using query operators.\noptions <document>\n    writeConcern <document>\n    collation <document>\n\nReturns:\tA document containing:\n    A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled\n    deletedCount containing the number of deleted documents\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.deleteOne.serverVersions = [0,4.4];
    this.deleteOne.topologies = [0,1,2];
    this.deleteOne.returnsPromise = true;
    this.deleteOne.returnType = "Unknown";
    this.distinct = function() {
      return this._mapper.distinct(this, ...arguments);
    };
    this.distinct.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.distinct\n\nFinds the distinct values for a specified field across a single collection or view and returns the results in an array.\n\ndb.collection.distinct(field, query, options)\n\nfield <string> The field for which to return distinct values.\nquery <document> A query that specifies the documents from which to retrieve the distinct values.\noptions\t<document>\n    collation <document>\n\nReturns: The results in an array.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.distinct.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.distinct\n\nFinds the distinct values for a specified field across a single collection or view and returns the results in an array.\n\ndb.collection.distinct(field, query, options)\n\nfield <string> The field for which to return distinct values.\nquery <document> A query that specifies the documents from which to retrieve the distinct values.\noptions\t<document>\n    collation <document>\n\nReturns: The results in an array.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.distinct.serverVersions = [0,4.4];
    this.distinct.topologies = [0,1,2];
    this.distinct.returnsPromise = false;
    this.distinct.returnType = "Cursor";
    this.estimatedDocumentCount = function() {
      return this._mapper.estimatedDocumentCount(this, ...arguments);
    };
    this.estimatedDocumentCount.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.estimatedDocumentCount\n\nReturns the count of all documents in a collection or view.\n\ndb.collection.estimatedDocumentCount( <options> )\n\noptions\t<document>\n    maxTimeMS <integer> Optional. The maximum amount of time to allow the count to run.\n\nReturns: count as an integer\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.estimatedDocumentCount.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.estimatedDocumentCount\n\nReturns the count of all documents in a collection or view.\n\ndb.collection.estimatedDocumentCount( <options> )\n\noptions\t<document>\n    maxTimeMS <integer> Optional. The maximum amount of time to allow the count to run.\n\nReturns: count as an integer\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.estimatedDocumentCount.serverVersions = ["4.0.3",4.4];
    this.estimatedDocumentCount.topologies = [0,1,2];
    this.estimatedDocumentCount.returnsPromise = true;
    this.estimatedDocumentCount.returnType = "Unknown";
    this.find = function() {
      return this._mapper.find(this, ...arguments);
    };
    this.find.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.find\n\nSelects documents in a collection or view.\n\ndb.collection.find(query, projection)\n\nquery <document> Optional. Specifies selection filter using query operators. To return all documents in a collection, omit this parameter or pass an empty document ({}).\nprojection <document> Optional. Specifies the fields to return in the documents that match the query filter. To return all fields in the matching documents, omit this parameter.\n\nReturns: A cursor to the documents that match the query criteria.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.find.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.find\n\nSelects documents in a collection or view.\n\ndb.collection.find(query, projection)\n\nquery <document> Optional. Specifies selection filter using query operators. To return all documents in a collection, omit this parameter or pass an empty document ({}).\nprojection <document> Optional. Specifies the fields to return in the documents that match the query filter. To return all fields in the matching documents, omit this parameter.\n\nReturns: A cursor to the documents that match the query criteria.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.find.serverVersions = [0,4.4];
    this.find.topologies = [0,1,2];
    this.find.returnsPromise = false;
    this.find.returnType = "Cursor";
    this.findAndModify = function() {
      return this._mapper.findAndModify(this, ...arguments);
    };
    this.findAndModify.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.findAndModify\n\nModifies and returns a single document.\n\ndb.collection.findAndModify(document)\n\ndocument <document>\n    query <document>,\n    sort <document>,\n    remove <boolean>,\n    update <document or aggregation pipeline>, // Changed in MongoDB 4.2\n    new <boolean>,\n    fields <document>,\n    upsert <boolean>,\n    bypassDocumentValidation <boolean>,\n    writeConcern <document>,\n    collation <document>,\n    arrayFilters [ <filterdocument1>, ... ]\n\nReturns: For remove operations, if the query matches a document, findAndModify() returns the removed document. If the query does not match a document to remove, findAndModify() returns null.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.findAndModify.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.findAndModify\n\nModifies and returns a single document.\n\ndb.collection.findAndModify(document)\n\ndocument <document>\n    query <document>,\n    sort <document>,\n    remove <boolean>,\n    update <document or aggregation pipeline>, // Changed in MongoDB 4.2\n    new <boolean>,\n    fields <document>,\n    upsert <boolean>,\n    bypassDocumentValidation <boolean>,\n    writeConcern <document>,\n    collation <document>,\n    arrayFilters [ <filterdocument1>, ... ]\n\nReturns: For remove operations, if the query matches a document, findAndModify() returns the removed document. If the query does not match a document to remove, findAndModify() returns null.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.findAndModify.serverVersions = [0,4.4];
    this.findAndModify.topologies = [0,1,2];
    this.findAndModify.returnsPromise = false;
    this.findAndModify.returnType = "Unknown";
    this.findOne = function() {
      return this._mapper.findOne(this, ...arguments);
    };
    this.findOne.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.findOne\n\nSelects documents in a collection or view.\n\ndb.collection.findOne(query, projection)\n\nquery <document> Optional. Specifies selection filter using query operators. To return all documents in a collection, omit this parameter or pass an empty document ({}).\nprojection <document> Optional. Specifies the fields to return in the documents that match the query filter. To return all fields in the matching documents, omit this parameter.\n\nReturns: A cursor to the documents that match the query criteria.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.findOne.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.findOne\n\nSelects documents in a collection or view.\n\ndb.collection.findOne(query, projection)\n\nquery <document> Optional. Specifies selection filter using query operators. To return all documents in a collection, omit this parameter or pass an empty document ({}).\nprojection <document> Optional. Specifies the fields to return in the documents that match the query filter. To return all fields in the matching documents, omit this parameter.\n\nReturns: A cursor to the documents that match the query criteria.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.findOne.serverVersions = [0,4.4];
    this.findOne.topologies = [0,1,2];
    this.findOne.returnsPromise = false;
    this.findOne.returnType = "Unknown";
    this.findOneAndDelete = function() {
      return this._mapper.findOneAndDelete(this, ...arguments);
    };
    this.findOneAndDelete.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndDelete\n\nDeletes a single document based on the filter and sort criteria, returning the deleted document.\n\ndb.collection.findOneAndDelete(filter, options)\n\nfilter <document> The selection criteria for the update.\noptions <document>\n    projection <document>\n    sort <document>\n    maxTimeMS <number>\n    collation <document>\n\nReturns: Returns the deleted document.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.findOneAndDelete.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndDelete\n\nDeletes a single document based on the filter and sort criteria, returning the deleted document.\n\ndb.collection.findOneAndDelete(filter, options)\n\nfilter <document> The selection criteria for the update.\noptions <document>\n    projection <document>\n    sort <document>\n    maxTimeMS <number>\n    collation <document>\n\nReturns: Returns the deleted document.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.findOneAndDelete.serverVersions = [3.2,4.4];
    this.findOneAndDelete.topologies = [0,1,2];
    this.findOneAndDelete.returnsPromise = true;
    this.findOneAndDelete.returnType = "Unknown";
    this.findOneAndReplace = function() {
      return this._mapper.findOneAndReplace(this, ...arguments);
    };
    this.findOneAndReplace.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndReplace\n\nModifies and replaces a single document based on the filter and sort criteria.\n\ndb.collection.findOneAndReplace(filter, replacement, options)\n\nfilter <document> The selection criteria for the update.\nreplacement\t<document> The replacement document.\noptions <document>\n    projection <document>\n    sort <document>\n    maxTimeMS <number>\n    upsert <boolean>\n    returnNewDocument <boolean>\n    collation <document>\n\nReturns: Returns either the original document or, if returnNewDocument: true, the replacement document.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.findOneAndReplace.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndReplace\n\nModifies and replaces a single document based on the filter and sort criteria.\n\ndb.collection.findOneAndReplace(filter, replacement, options)\n\nfilter <document> The selection criteria for the update.\nreplacement\t<document> The replacement document.\noptions <document>\n    projection <document>\n    sort <document>\n    maxTimeMS <number>\n    upsert <boolean>\n    returnNewDocument <boolean>\n    collation <document>\n\nReturns: Returns either the original document or, if returnNewDocument: true, the replacement document.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.findOneAndReplace.serverVersions = [3.2,4.4];
    this.findOneAndReplace.topologies = [0,1,2];
    this.findOneAndReplace.returnsPromise = true;
    this.findOneAndReplace.returnType = "Unknown";
    this.findOneAndUpdate = function() {
      return this._mapper.findOneAndUpdate(this, ...arguments);
    };
    this.findOneAndUpdate.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndUpdate\n\nUpdates a single document based on the filter and sort criteria.\n\ndb.collection.findOneAndUpdate(filter, update, options)\n\nfilter <document> The selection criteria for the update.\nupdate <document or array> The update document or, starting in MongoDB 4.2, an aggregation pipeline.\noptions <document>\n    projection <document>\n    sort <document>\n    maxTimeMS <number>\n    upsert <boolean>\n    returnNewDocument <boolean>\n    collation <document>\n    arrayFilters [ <filterdocument1>, ... ]\n\nReturns: Returns either the original document or, if returnNewDocument: true, the updated document.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.findOneAndUpdate.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndUpdate\n\nUpdates a single document based on the filter and sort criteria.\n\ndb.collection.findOneAndUpdate(filter, update, options)\n\nfilter <document> The selection criteria for the update.\nupdate <document or array> The update document or, starting in MongoDB 4.2, an aggregation pipeline.\noptions <document>\n    projection <document>\n    sort <document>\n    maxTimeMS <number>\n    upsert <boolean>\n    returnNewDocument <boolean>\n    collation <document>\n    arrayFilters [ <filterdocument1>, ... ]\n\nReturns: Returns either the original document or, if returnNewDocument: true, the updated document.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.findOneAndUpdate.serverVersions = [3.2,4.4];
    this.findOneAndUpdate.topologies = [0,1,2];
    this.findOneAndUpdate.returnsPromise = true;
    this.findOneAndUpdate.returnType = "Unknown";
    this.insert = function() {
      return this._mapper.insert(this, ...arguments);
    };
    this.insert.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.insert\n\nInserts a document or documents into a collection.\n\ndb.collection.insert(document, options)\n\ndocument <document or array> A document or array of documents to insert into the collection.\noptions <document>\n    writeConcern: <document>\n    ordered: <boolean>\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.insert.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.insert\n\nInserts a document or documents into a collection.\n\ndb.collection.insert(document, options)\n\ndocument <document or array> A document or array of documents to insert into the collection.\noptions <document>\n    writeConcern: <document>\n    ordered: <boolean>\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.insert.serverVersions = [0,4.4];
    this.insert.topologies = [0,1,2];
    this.insert.returnsPromise = true;
    this.insert.returnType = "Unknown";
    this.insertMany = function() {
      return this._mapper.insertMany(this, ...arguments);
    };
    this.insertMany.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.insertMany\n\nInserts multiple documents into a collection.\n\ndb.collection.insertMany(documents, options)\n\ndocuments <document> An array of documents to insert into the collection.\noptions <document>\n    writeConcern <document>\n    ordered <boolean>\n\nReturns: A document containing:\n    A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled\n    An array of _id for each successfully inserted documents\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.insertMany.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.insertMany\n\nInserts multiple documents into a collection.\n\ndb.collection.insertMany(documents, options)\n\ndocuments <document> An array of documents to insert into the collection.\noptions <document>\n    writeConcern <document>\n    ordered <boolean>\n\nReturns: A document containing:\n    A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled\n    An array of _id for each successfully inserted documents\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.insertMany.serverVersions = [3.2,4.4];
    this.insertMany.topologies = [0,1,2];
    this.insertMany.returnsPromise = true;
    this.insertMany.returnType = "Unknown";
    this.insertOne = function() {
      return this._mapper.insertOne(this, ...arguments);
    };
    this.insertOne.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.insertOne\n\nInserts a document into a collection.\n\ndb.collection.insertOne(document, options)\n\ndocument <document> A document to insert into the collection.\noptions <document>\n    writeConcern <document>\n\nReturns: A document containing:\n    A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled.\n    A field insertedId with the _id value of the inserted document.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.insertOne.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.insertOne\n\nInserts a document into a collection.\n\ndb.collection.insertOne(document, options)\n\ndocument <document> A document to insert into the collection.\noptions <document>\n    writeConcern <document>\n\nReturns: A document containing:\n    A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled.\n    A field insertedId with the _id value of the inserted document.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.insertOne.serverVersions = [3.2,4.4];
    this.insertOne.topologies = [0,1,2];
    this.insertOne.returnsPromise = true;
    this.insertOne.returnType = "Unknown";
    this.isCapped = function() {
      return this._mapper.isCapped(this, ...arguments);
    };
    this.isCapped.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.isCapped\n\ndb.collection.isCapped()\n\nReturns true if the collection is a capped collection, otherwise returns false.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.isCapped.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.isCapped\n\ndb.collection.isCapped()\n\nReturns true if the collection is a capped collection, otherwise returns false.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.isCapped.serverVersions = [0,4.4];
    this.isCapped.topologies = [0,1,2];
    this.isCapped.returnsPromise = true;
    this.isCapped.returnType = "Unknown";
    this.remove = function() {
      return this._mapper.remove(this, ...arguments);
    };
    this.remove.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.remove\n\nRemoves documents from a collection.\n\nThe db.collection.remove() method can have one of two syntaxes. The remove() method can take a query document and an optional justOne boolean:\n\ndb.collection.remove(\n   <query>,\n   <justOne>\n)\nOr the method can take a query document and an optional remove options document:\n\nNew in version 2.6.\n\ndb.collection.remove(\n   <query>,\n   {\n     justOne: <boolean>,\n     writeConcern: <document>,\n     collation: <document>\n   }\n)\n\nReturns: The status of the operation.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.remove.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.remove\n\nRemoves documents from a collection.\n\nThe db.collection.remove() method can have one of two syntaxes. The remove() method can take a query document and an optional justOne boolean:\n\ndb.collection.remove(\n   <query>,\n   <justOne>\n)\nOr the method can take a query document and an optional remove options document:\n\nNew in version 2.6.\n\ndb.collection.remove(\n   <query>,\n   {\n     justOne: <boolean>,\n     writeConcern: <document>,\n     collation: <document>\n   }\n)\n\nReturns: The status of the operation.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.remove.serverVersions = [0,4.4];
    this.remove.topologies = [0,1,2];
    this.remove.returnsPromise = true;
    this.remove.returnType = "Unknown";
    this.save = function() {
      return this._mapper.save(this, ...arguments);
    };
    this.save.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.save\n\nUpdates an existing document or inserts a new document, depending on its document parameter.\n\ndb.collection.save(document, options)\n\ndocument <document> A document to save to the collection.\noptions <document>\n    writeConcern <document>\n\nReturns: A WriteResult object that contains the status of the operation.\nChanged in version 2.6: The save() returns an object that contains the status of the operation.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.save.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.save\n\nUpdates an existing document or inserts a new document, depending on its document parameter.\n\ndb.collection.save(document, options)\n\ndocument <document> A document to save to the collection.\noptions <document>\n    writeConcern <document>\n\nReturns: A WriteResult object that contains the status of the operation.\nChanged in version 2.6: The save() returns an object that contains the status of the operation.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.save.serverVersions = [0,4.4];
    this.save.topologies = [0,1,2];
    this.save.returnsPromise = true;
    this.save.returnType = "Unknown";
    this.replaceOne = function() {
      return this._mapper.replaceOne(this, ...arguments);
    };
    this.replaceOne.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.replaceOne\n\nReplaces a single document within the collection based on the filter.\n\ndb.collection.replaceOne(filter, replacement, options)\n\nfilter <document> The selection criteria for the update.\nreplacement\t<document> The replacement document.\noptions <document>\n    upsert <boolean>\n    writeConcern <document>\n    collation <document>\n    hint <document|string>\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.replaceOne.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.replaceOne\n\nReplaces a single document within the collection based on the filter.\n\ndb.collection.replaceOne(filter, replacement, options)\n\nfilter <document> The selection criteria for the update.\nreplacement\t<document> The replacement document.\noptions <document>\n    upsert <boolean>\n    writeConcern <document>\n    collation <document>\n    hint <document|string>\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.replaceOne.serverVersions = [3.2,4.4];
    this.replaceOne.topologies = [0,1,2];
    this.replaceOne.returnsPromise = true;
    this.replaceOne.returnType = "Unknown";
    this.update = function() {
      return this._mapper.update(this, ...arguments);
    };
    this.update.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.update\n\nModifies an existing document or documents in a collection.\n\ndb.collection.update(query, update, options)\n\nfilter <document> The selection criteria for the update.\nupdate <document> The modifications to apply.\noptions <document>\nupsert: <boolean>,\n     multi <boolean>\n     writeConcern <document>\n     collation <document>\n     arrayFilters [ <filterdocument1>, ... ]\n     hint  <document|string>        // Available starting in MongoDB 4.2\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.update.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.update\n\nModifies an existing document or documents in a collection.\n\ndb.collection.update(query, update, options)\n\nfilter <document> The selection criteria for the update.\nupdate <document> The modifications to apply.\noptions <document>\nupsert: <boolean>,\n     multi <boolean>\n     writeConcern <document>\n     collation <document>\n     arrayFilters [ <filterdocument1>, ... ]\n     hint  <document|string>        // Available starting in MongoDB 4.2\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.update.serverVersions = [0,4.4];
    this.update.topologies = [0,1,2];
    this.update.returnsPromise = true;
    this.update.returnType = "Unknown";
    this.updateMany = function() {
      return this._mapper.updateMany(this, ...arguments);
    };
    this.updateMany.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.updateMany\n\nUpdates all documents that match the specified filter for a collection.\n\ndb.collection.updateMany(filter, update, options)\n\nfilter <document> The selection criteria for the update.\nupdate <document> The modifications to apply.\noptions <document>\n    upsert <boolean>\n    writeConcern <document>\n    collation <document>\n    arrayFilters [ <filterdocument1>, ... ]\n    hint  <document|string>        // Available starting in MongoDB 4.2.1\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.updateMany.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.updateMany\n\nUpdates all documents that match the specified filter for a collection.\n\ndb.collection.updateMany(filter, update, options)\n\nfilter <document> The selection criteria for the update.\nupdate <document> The modifications to apply.\noptions <document>\n    upsert <boolean>\n    writeConcern <document>\n    collation <document>\n    arrayFilters [ <filterdocument1>, ... ]\n    hint  <document|string>        // Available starting in MongoDB 4.2.1\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.updateMany.serverVersions = [3.2,4.4];
    this.updateMany.topologies = [0,1,2];
    this.updateMany.returnsPromise = true;
    this.updateMany.returnType = "Unknown";
    this.updateOne = function() {
      return this._mapper.updateOne(this, ...arguments);
    };
    this.updateOne.help = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.updateOne\n\nUpdates a single document within the collection based on the filter.\n\ndb.collection.updateOne(filter, update, options)\n\nfilter <document> The selection criteria for the update.\nupdate <document> The modifications to apply.\noptions <document>\n    upsert <boolean>\n    writeConcern <document>\n    collation <document>\n    arrayFilters [ <filterdocument1>, ... ]\n    hint  <document|string>        // Available starting in MongoDB 4.2.1\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.updateOne.help.toReplString = () => ("https://docs.mongodb.com/manual/reference/method/db.collection.updateOne\n\nUpdates a single document within the collection based on the filter.\n\ndb.collection.updateOne(filter, update, options)\n\nfilter <document> The selection criteria for the update.\nupdate <document> The modifications to apply.\noptions <document>\n    upsert <boolean>\n    writeConcern <document>\n    collation <document>\n    arrayFilters [ <filterdocument1>, ... ]\n    hint  <document|string>        // Available starting in MongoDB 4.2.1\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.updateOne.serverVersions = [3.2,4.4];
    this.updateOne.topologies = [0,1,2];
    this.updateOne.returnsPromise = true;
    this.updateOne.returnType = "Unknown";
  }
}
class Cursor {
  constructor(_mapper, _cursor) {
    this._mapper = _mapper;
    this._cursor = _cursor;

    this.toReplString = () => {
      return this._mapper.it();
    };
    this.help = () => ("The cursor class.\nAttributes: addOption, allowPartialResults, arrayAccess, batchSize, clone, close, collation, comment, count, explain, forEach, getQueryPlan, hasNext, hint, isClosed, isExhausted, itcount, length, limit, map, max, maxScan, maxTimeMS, min, modifiers, next, noCursorTimeout, objsLeftInBatch, oplogReplay, projection, pretty, readConcern, readOnly, readPref, returnKey, showDiskLoc, showRecordId, size, skip, snapshot, sort, tailable, toArray");
    this.help.toReplString = () => ("The cursor class.\nAttributes: addOption, allowPartialResults, arrayAccess, batchSize, clone, close, collation, comment, count, explain, forEach, getQueryPlan, hasNext, hint, isClosed, isExhausted, itcount, length, limit, map, max, maxScan, maxTimeMS, min, modifiers, next, noCursorTimeout, objsLeftInBatch, oplogReplay, projection, pretty, readConcern, readOnly, readPref, returnKey, showDiskLoc, showRecordId, size, skip, snapshot, sort, tailable, toArray");
    this.addOption = function() {
      return this._cursor.addOption(...arguments);
    };
    this.addOption.help = () => ("Adds OP_QUERY wire protocol flags, such as the tailable flag, to change the behavior of queries. Accepts: DBQuery.Option fields tailable, slaveOk, noTimeout, awaitData, exhaust, partial.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.addOption.help.toReplString = () => ("Adds OP_QUERY wire protocol flags, such as the tailable flag, to change the behavior of queries. Accepts: DBQuery.Option fields tailable, slaveOk, noTimeout, awaitData, exhaust, partial.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.addOption.serverVersions = [0,3.2];
    this.addOption.topologies = [0,1,2];
    this.addOption.returnsPromise = false;
    this.addOption.returnType = "Unknown";
    this.allowPartialResults = function() {
      return this._cursor.allowPartialResults(...arguments);
    };
    this.allowPartialResults.help = () => ("Sets the 'partial' option to true.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.allowPartialResults.help.toReplString = () => ("Sets the 'partial' option to true.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.allowPartialResults.serverVersions = [0,4.4];
    this.allowPartialResults.topologies = [0,1,2];
    this.allowPartialResults.returnsPromise = false;
    this.allowPartialResults.returnType = "Unknown";
    this.arrayAccess = function() {
      return this._cursor.arrayAccess(...arguments);
    };
    this.arrayAccess.help = () => ("!! No help defined for this method\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.arrayAccess.help.toReplString = () => ("!! No help defined for this method\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.arrayAccess.serverVersions = [0,4.4];
    this.arrayAccess.topologies = [0,1,2];
    this.arrayAccess.returnsPromise = false;
    this.arrayAccess.returnType = "Unknown";
    this.batchSize = function() {
      return this._cursor.batchSize(...arguments);
    };
    this.batchSize.help = () => ("Specifies the number of documents to return in each batch of the response from the MongoDB instance. In most cases, modifying the batch size will not affect the user or the application, as the mongo shell and most drivers return results as if MongoDB returned a single batch.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.batchSize.help.toReplString = () => ("Specifies the number of documents to return in each batch of the response from the MongoDB instance. In most cases, modifying the batch size will not affect the user or the application, as the mongo shell and most drivers return results as if MongoDB returned a single batch.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.batchSize.serverVersions = [0,4.4];
    this.batchSize.topologies = [0,1,2];
    this.batchSize.returnsPromise = false;
    this.batchSize.returnType = "Unknown";
    this.clone = function() {
      return this._cursor.clone(...arguments);
    };
    this.clone.help = () => ("Clone the cursor.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.clone.help.toReplString = () => ("Clone the cursor.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.clone.serverVersions = [0,4.4];
    this.clone.topologies = [0,1,2];
    this.clone.returnsPromise = false;
    this.clone.returnType = "Unknown";
    this.close = function() {
      return this._cursor.close(...arguments);
    };
    this.close.help = () => ("Instructs the server to close a cursor and free associated server resources. The server will automatically close cursors that have no remaining results, as well as cursors that have been idle for a period of time and lack the cursor.noCursorTimeout() option.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.close.help.toReplString = () => ("Instructs the server to close a cursor and free associated server resources. The server will automatically close cursors that have no remaining results, as well as cursors that have been idle for a period of time and lack the cursor.noCursorTimeout() option.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.close.serverVersions = [0,4.4];
    this.close.topologies = [0,1,2];
    this.close.returnsPromise = false;
    this.close.returnType = "Unknown";
    this.collation = function() {
      return this._cursor.collation(...arguments);
    };
    this.collation.help = () => ("Specifies the collation for the cursor returned by the db.collection.find(). To use, append to the db.collection.find().\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.collation.help.toReplString = () => ("Specifies the collation for the cursor returned by the db.collection.find(). To use, append to the db.collection.find().\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.collation.serverVersions = [3.4,4.4];
    this.collation.topologies = [0,1,2];
    this.collation.returnsPromise = false;
    this.collation.returnType = "Unknown";
    this.comment = function() {
      return this._cursor.comment(...arguments);
    };
    this.comment.help = () => ("Adds a comment field to the query.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.comment.help.toReplString = () => ("Adds a comment field to the query.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.comment.serverVersions = [3.2,4.4];
    this.comment.topologies = [0,1,2];
    this.comment.returnsPromise = false;
    this.comment.returnType = "Unknown";
    this.count = function() {
      return this._cursor.count(...arguments);
    };
    this.count.help = () => ("Counts the number of documents referenced by a cursor.\nAttributes: serverVersions, topologies, returnsPromise, returnType, serverVersion");
    this.count.help.toReplString = () => ("Counts the number of documents referenced by a cursor.\nAttributes: serverVersions, topologies, returnsPromise, returnType, serverVersion");
    this.count.serverVersions = [0,4.4];
    this.count.topologies = [0,1,2];
    this.count.returnsPromise = false;
    this.count.returnType = "Unknown";
    this.count.serverVersion = [0,4];
    this.explain = function() {
      return this._cursor.explain(...arguments);
    };
    this.explain.help = () => ("Provides information on the query plan for the db.collection.find() method.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.explain.help.toReplString = () => ("Provides information on the query plan for the db.collection.find() method.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.explain.serverVersions = [0,4.4];
    this.explain.topologies = [0,1,2];
    this.explain.returnsPromise = false;
    this.explain.returnType = "Unknown";
    this.forEach = function() {
      return this._cursor.forEach(...arguments);
    };
    this.forEach.help = () => ("Iterates the cursor to apply a JavaScript function to each document from the cursor.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.forEach.help.toReplString = () => ("Iterates the cursor to apply a JavaScript function to each document from the cursor.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.forEach.serverVersions = [0,4.4];
    this.forEach.topologies = [0,1,2];
    this.forEach.returnsPromise = false;
    this.forEach.returnType = "Unknown";
    this.getQueryPlan = function() {
      return this._cursor.getQueryPlan(...arguments);
    };
    this.getQueryPlan.help = () => ("Runs cursor.explain()\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.getQueryPlan.help.toReplString = () => ("Runs cursor.explain()\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.getQueryPlan.serverVersions = [0,4.4];
    this.getQueryPlan.topologies = [0,1,2];
    this.getQueryPlan.returnsPromise = false;
    this.getQueryPlan.returnType = "Unknown";
    this.hasNext = function() {
      return this._cursor.hasNext(...arguments);
    };
    this.hasNext.help = () => ("cursor.hasNext() returns true if the cursor returned by the db.collection.find() query can iterate further to return more documents.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.hasNext.help.toReplString = () => ("cursor.hasNext() returns true if the cursor returned by the db.collection.find() query can iterate further to return more documents.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.hasNext.serverVersions = [0,4.4];
    this.hasNext.topologies = [0,1,2];
    this.hasNext.returnsPromise = false;
    this.hasNext.returnType = "Unknown";
    this.hint = function() {
      return this._cursor.hint(...arguments);
    };
    this.hint.help = () => ("Call this method on a query to override MongoDB’s default index selection and query optimization process. Use db.collection.getIndexes() to return the list of current indexes on a collection.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.hint.help.toReplString = () => ("Call this method on a query to override MongoDB’s default index selection and query optimization process. Use db.collection.getIndexes() to return the list of current indexes on a collection.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.hint.serverVersions = [0,4.4];
    this.hint.topologies = [0,1,2];
    this.hint.returnsPromise = false;
    this.hint.returnType = "Unknown";
    this.isClosed = function() {
      return this._cursor.isClosed(...arguments);
    };
    this.isClosed.help = () => ("Returns true if the cursor is closed.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.isClosed.help.toReplString = () => ("Returns true if the cursor is closed.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.isClosed.serverVersions = [0,4.4];
    this.isClosed.topologies = [0,1,2];
    this.isClosed.returnsPromise = false;
    this.isClosed.returnType = "Unknown";
    this.isExhausted = function() {
      return this._cursor.isExhausted(...arguments);
    };
    this.isExhausted.help = () => ("cursor.isExhausted() returns true if the cursor is closed and there are no remaining objects in the batch.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.isExhausted.help.toReplString = () => ("cursor.isExhausted() returns true if the cursor is closed and there are no remaining objects in the batch.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.isExhausted.serverVersions = [0,4.4];
    this.isExhausted.topologies = [0,1,2];
    this.isExhausted.returnsPromise = false;
    this.isExhausted.returnType = "Unknown";
    this.itcount = function() {
      return this._cursor.itcount(...arguments);
    };
    this.itcount.help = () => ("Counts the number of documents remaining in a cursor. itcount() is similar to cursor.count(), but actually executes the query on an existing iterator, exhausting its contents in the process.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.itcount.help.toReplString = () => ("Counts the number of documents remaining in a cursor. itcount() is similar to cursor.count(), but actually executes the query on an existing iterator, exhausting its contents in the process.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.itcount.serverVersions = [0,4.4];
    this.itcount.topologies = [0,1,2];
    this.itcount.returnsPromise = false;
    this.itcount.returnType = "Unknown";
    this.length = function() {
      return this._cursor.length(...arguments);
    };
    this.length.help = () => ("Runs cursor.count()\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.length.help.toReplString = () => ("Runs cursor.count()\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.length.serverVersions = [0,4.4];
    this.length.topologies = [0,1,2];
    this.length.returnsPromise = false;
    this.length.returnType = "Unknown";
    this.limit = function() {
      return this._cursor.limit(...arguments);
    };
    this.limit.help = () => ("Use the limit() method on a cursor to specify the maximum number of documents the cursor will return.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.limit.help.toReplString = () => ("Use the limit() method on a cursor to specify the maximum number of documents the cursor will return.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.limit.serverVersions = [0,4.4];
    this.limit.topologies = [0,1,2];
    this.limit.returnsPromise = false;
    this.limit.returnType = "Unknown";
    this.map = function() {
      return this._cursor.map(...arguments);
    };
    this.map.help = () => ("Applies the first argument, a function, to each document visited by the cursor and collects the return values from successive application into an array.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.map.help.toReplString = () => ("Applies the first argument, a function, to each document visited by the cursor and collects the return values from successive application into an array.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.map.serverVersions = [0,4.4];
    this.map.topologies = [0,1,2];
    this.map.returnsPromise = false;
    this.map.returnType = "Unknown";
    this.max = function() {
      return this._cursor.max(...arguments);
    };
    this.max.help = () => ("Specifies the exclusive upper bound for a specific index in order to constrain the results of find(). max() provides a way to specify an upper bound on compound key indexes.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.max.help.toReplString = () => ("Specifies the exclusive upper bound for a specific index in order to constrain the results of find(). max() provides a way to specify an upper bound on compound key indexes.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.max.serverVersions = [0,4.4];
    this.max.topologies = [0,1,2];
    this.max.returnsPromise = false;
    this.max.returnType = "Unknown";
    this.maxScan = function() {
      return this._cursor.maxScan(...arguments);
    };
    this.maxScan.help = () => ("Constrains the query to only scan the specified number of documents when fulfilling the query.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.maxScan.help.toReplString = () => ("Constrains the query to only scan the specified number of documents when fulfilling the query.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.maxScan.serverVersions = [0,4];
    this.maxScan.topologies = [0,1,2];
    this.maxScan.returnsPromise = false;
    this.maxScan.returnType = "Unknown";
    this.maxTimeMS = function() {
      return this._cursor.maxTimeMS(...arguments);
    };
    this.maxTimeMS.help = () => ("Specifies a cumulative time limit in milliseconds for processing operations on a cursor.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.maxTimeMS.help.toReplString = () => ("Specifies a cumulative time limit in milliseconds for processing operations on a cursor.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.maxTimeMS.serverVersions = [0,4.4];
    this.maxTimeMS.topologies = [0,1,2];
    this.maxTimeMS.returnsPromise = false;
    this.maxTimeMS.returnType = "Unknown";
    this.min = function() {
      return this._cursor.min(...arguments);
    };
    this.min.help = () => ("Specifies the inclusive lower bound for a specific index in order to constrain the results of find(). min() provides a way to specify lower bounds on compound key indexes.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.min.help.toReplString = () => ("Specifies the inclusive lower bound for a specific index in order to constrain the results of find(). min() provides a way to specify lower bounds on compound key indexes.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.min.serverVersions = [0,4.4];
    this.min.topologies = [0,1,2];
    this.min.returnsPromise = false;
    this.min.returnType = "Unknown";
    this.modifiers = function() {
      return this._cursor.modifiers(...arguments);
    };
    this.modifiers.help = () => ("Get query modifiers.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.modifiers.help.toReplString = () => ("Get query modifiers.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.modifiers.serverVersions = [0,4.4];
    this.modifiers.topologies = [0,1,2];
    this.modifiers.returnsPromise = false;
    this.modifiers.returnType = "Unknown";
    this.next = function() {
      return this._cursor.next(...arguments);
    };
    this.next.help = () => ("The next document in the cursor returned by the db.collection.find() method.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.next.help.toReplString = () => ("The next document in the cursor returned by the db.collection.find() method.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.next.serverVersions = [0,4.4];
    this.next.topologies = [0,1,2];
    this.next.returnsPromise = false;
    this.next.returnType = "Unknown";
    this.noCursorTimeout = function() {
      return this._cursor.noCursorTimeout(...arguments);
    };
    this.noCursorTimeout.help = () => ("Instructs the server to avoid closing a cursor automatically after a period of inactivity.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.noCursorTimeout.help.toReplString = () => ("Instructs the server to avoid closing a cursor automatically after a period of inactivity.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.noCursorTimeout.serverVersions = [0,4.4];
    this.noCursorTimeout.topologies = [0,1,2];
    this.noCursorTimeout.returnsPromise = false;
    this.noCursorTimeout.returnType = "Unknown";
    this.objsLeftInBatch = function() {
      return this._cursor.objsLeftInBatch(...arguments);
    };
    this.objsLeftInBatch.help = () => ("cursor.objsLeftInBatch() returns the number of documents remaining in the current batch.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.objsLeftInBatch.help.toReplString = () => ("cursor.objsLeftInBatch() returns the number of documents remaining in the current batch.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.objsLeftInBatch.serverVersions = [0,4.4];
    this.objsLeftInBatch.topologies = [0,1,2];
    this.objsLeftInBatch.returnsPromise = false;
    this.objsLeftInBatch.returnType = "Unknown";
    this.oplogReplay = function() {
      return this._cursor.oplogReplay(...arguments);
    };
    this.oplogReplay.help = () => ("Sets oplogReplay cursor flag to true.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.oplogReplay.help.toReplString = () => ("Sets oplogReplay cursor flag to true.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.oplogReplay.serverVersions = [0,4.4];
    this.oplogReplay.topologies = [0,1,2];
    this.oplogReplay.returnsPromise = false;
    this.oplogReplay.returnType = "Unknown";
    this.projection = function() {
      return this._cursor.projection(...arguments);
    };
    this.projection.help = () => ("Sets a field projection for the query.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.projection.help.toReplString = () => ("Sets a field projection for the query.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.projection.serverVersions = [0,4.4];
    this.projection.topologies = [0,1,2];
    this.projection.returnsPromise = false;
    this.projection.returnType = "Unknown";
    this.pretty = function() {
      return this._cursor.pretty(...arguments);
    };
    this.pretty.help = () => ("Configures the cursor to display results in an easy-to-read format.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.pretty.help.toReplString = () => ("Configures the cursor to display results in an easy-to-read format.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.pretty.serverVersions = [0,4.4];
    this.pretty.topologies = [0,1,2];
    this.pretty.returnsPromise = false;
    this.pretty.returnType = "Unknown";
    this.readConcern = function() {
      return this._cursor.readConcern(...arguments);
    };
    this.readConcern.help = () => ("Specify a read concern for the db.collection.find() method.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.readConcern.help.toReplString = () => ("Specify a read concern for the db.collection.find() method.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.readConcern.serverVersions = [3.2,4.4];
    this.readConcern.topologies = [0,1,2];
    this.readConcern.returnsPromise = false;
    this.readConcern.returnType = "Unknown";
    this.readOnly = function() {
      return this._cursor.readOnly(...arguments);
    };
    this.readOnly.help = () => ("TODO\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.readOnly.help.toReplString = () => ("TODO\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.readOnly.serverVersions = [0,4.4];
    this.readOnly.topologies = [0,1,2];
    this.readOnly.returnsPromise = false;
    this.readOnly.returnType = "Unknown";
    this.readPref = function() {
      return this._cursor.readPref(...arguments);
    };
    this.readPref.help = () => ("Append readPref() to a cursor to control how the client routes the query to members of the replica set.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.readPref.help.toReplString = () => ("Append readPref() to a cursor to control how the client routes the query to members of the replica set.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.readPref.serverVersions = [0,4.4];
    this.readPref.topologies = [0,1,2];
    this.readPref.returnsPromise = false;
    this.readPref.returnType = "Unknown";
    this.returnKey = function() {
      return this._cursor.returnKey(...arguments);
    };
    this.returnKey.help = () => ("Modifies the cursor to return index keys rather than the documents.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.returnKey.help.toReplString = () => ("Modifies the cursor to return index keys rather than the documents.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.returnKey.serverVersions = [3.2,4.4];
    this.returnKey.topologies = [0,1,2];
    this.returnKey.returnsPromise = false;
    this.returnKey.returnType = "Unknown";
    this.showDiskLoc = function() {
      return this._cursor.showDiskLoc(...arguments);
    };
    this.showDiskLoc.help = () => ("The $showDiskLoc option has now been deprecated and replaced with the showRecordId field. $showDiskLoc will still be accepted for OP_QUERY stye find.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.showDiskLoc.help.toReplString = () => ("The $showDiskLoc option has now been deprecated and replaced with the showRecordId field. $showDiskLoc will still be accepted for OP_QUERY stye find.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.showDiskLoc.serverVersions = [0,4.4];
    this.showDiskLoc.topologies = [0,1,2];
    this.showDiskLoc.returnsPromise = false;
    this.showDiskLoc.returnType = "Unknown";
    this.showRecordId = function() {
      return this._cursor.showRecordId(...arguments);
    };
    this.showRecordId.help = () => ("Modifies the output of a query by adding a field $recordId to matching documents. $recordId is the internal key which uniquely identifies a document in a collection.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.showRecordId.help.toReplString = () => ("Modifies the output of a query by adding a field $recordId to matching documents. $recordId is the internal key which uniquely identifies a document in a collection.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.showRecordId.serverVersions = [0,4.4];
    this.showRecordId.topologies = [0,1,2];
    this.showRecordId.returnsPromise = false;
    this.showRecordId.returnType = "Unknown";
    this.size = function() {
      return this._cursor.size(...arguments);
    };
    this.size.help = () => ("A count of the number of documents that match the db.collection.find() query after applying any cursor.skip() and cursor.limit() methods.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.size.help.toReplString = () => ("A count of the number of documents that match the db.collection.find() query after applying any cursor.skip() and cursor.limit() methods.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.size.serverVersions = [0,4.4];
    this.size.topologies = [0,1,2];
    this.size.returnsPromise = false;
    this.size.returnType = "Unknown";
    this.skip = function() {
      return this._cursor.skip(...arguments);
    };
    this.skip.help = () => ("Call the cursor.skip() method on a cursor to control where MongoDB begins returning results. This approach may be useful in implementing paginated results.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.skip.help.toReplString = () => ("Call the cursor.skip() method on a cursor to control where MongoDB begins returning results. This approach may be useful in implementing paginated results.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.skip.serverVersions = [0,4.4];
    this.skip.topologies = [0,1,2];
    this.skip.returnsPromise = false;
    this.skip.returnType = "Unknown";
    this.snapshot = function() {
      return this._cursor.snapshot(...arguments);
    };
    this.snapshot.help = () => ("The $snapshot operator prevents the cursor from returning a document more than once because an intervening write operation results in a move of the document.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.snapshot.help.toReplString = () => ("The $snapshot operator prevents the cursor from returning a document more than once because an intervening write operation results in a move of the document.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.snapshot.serverVersions = [0,4];
    this.snapshot.topologies = [0,1,2];
    this.snapshot.returnsPromise = false;
    this.snapshot.returnType = "Unknown";
    this.sort = function() {
      return this._cursor.sort(...arguments);
    };
    this.sort.help = () => ("Specifies the order in which the query returns matching documents. You must apply sort() to the cursor before retrieving any documents from the database.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.sort.help.toReplString = () => ("Specifies the order in which the query returns matching documents. You must apply sort() to the cursor before retrieving any documents from the database.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.sort.serverVersions = [0,4.4];
    this.sort.topologies = [0,1,2];
    this.sort.returnsPromise = false;
    this.sort.returnType = "Unknown";
    this.tailable = function() {
      return this._cursor.tailable(...arguments);
    };
    this.tailable.help = () => ("Marks the cursor as tailable.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.tailable.help.toReplString = () => ("Marks the cursor as tailable.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.tailable.serverVersions = [3.2,4.4];
    this.tailable.topologies = [0,1,2];
    this.tailable.returnsPromise = false;
    this.tailable.returnType = "Unknown";
    this.toArray = function() {
      return this._cursor.toArray(...arguments);
    };
    this.toArray.help = () => ("The toArray() method returns an array that contains all the documents from a cursor. The method iterates completely the cursor, loading all the documents into RAM and exhausting the cursor.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.toArray.help.toReplString = () => ("The toArray() method returns an array that contains all the documents from a cursor. The method iterates completely the cursor, loading all the documents into RAM and exhausting the cursor.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.toArray.serverVersions = [0,4.4];
    this.toArray.topologies = [0,1,2];
    this.toArray.returnsPromise = false;
    this.toArray.returnType = "Unknown";
  }
}
class Database {
  constructor(_mapper, _database) {
    const handler = {
      get: function (obj, prop) {
        if (!(prop in obj)) {
          obj[prop] = new Collection(_mapper, _database, prop);
        }
        return obj[prop];
      }
    };
    this._mapper = _mapper;
    this._database = _database;

    this.toReplString = () => {
      return this._database;
    };
    this.help = () => ("The database class.\nAttributes: runCommand");
    this.help.toReplString = () => ("The database class.\nAttributes: runCommand");
    this.runCommand = function() {
      return this._mapper.runCommand(this, ...arguments);
    };
    this.runCommand.help = () => ("Runs an arbitrary command on the database.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.runCommand.help.toReplString = () => ("Runs an arbitrary command on the database.\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.runCommand.serverVersions = [0,4.4];
    this.runCommand.topologies = [0,1,2];
    this.runCommand.returnsPromise = false;
    this.runCommand.returnType = "Unknown";

    return new Proxy(this, handler);
  }
}
class DeleteResult {
  constructor(acknowleged, deletedCount) {
    this.acknowleged = acknowleged;
    this.deletedCount = deletedCount;

    this.toReplString = () => {
      return JSON.stringify(this, null, ' ');
    };
    this.help = () => ("The DeleteResult class.\nAttributes: acknowleged, deletedCount");
    this.help.toReplString = () => ("The DeleteResult class.\nAttributes: acknowleged, deletedCount");
  }
}
class InsertManyResult {
  constructor(acknowleged, insertedIds) {
    this.acknowleged = acknowleged;
    this.insertedIds = insertedIds;

    this.toReplString = () => {
      return JSON.stringify(this, null, ' ');
    };
    this.help = () => ("The InsertManyResult class.\nAttributes: acknowleged, insertedIds");
    this.help.toReplString = () => ("The InsertManyResult class.\nAttributes: acknowleged, insertedIds");
  }
}
class InsertOneResult {
  constructor(acknowleged, insertedId) {
    this.acknowleged = acknowleged;
    this.insertedId = insertedId;

    this.toReplString = () => {
      return JSON.stringify(this, null, ' ');
    };
    this.help = () => ("The InsertManyResult class.\nAttributes: acknowleged, insertedId");
    this.help.toReplString = () => ("The InsertManyResult class.\nAttributes: acknowleged, insertedId");
  }
}
class ReplicaSet {
  constructor(_mapper) {
    this._mapper = _mapper;

    this.toReplString = () => {
      return JSON.stringify(this, null, ' ');
    };
    this.help = () => ("The Replica Set class.\nAttributes: ");
    this.help.toReplString = () => ("The Replica Set class.\nAttributes: ");
  }
}
class Shard {
  constructor(_mapper) {
    this._mapper = _mapper;

    this.toReplString = () => {
      return JSON.stringify(this, null, ' ');
    };
    this.help = () => ("The Shard class.\nAttributes: ");
    this.help.toReplString = () => ("The Shard class.\nAttributes: ");
  }
}
class ShellApi {
  constructor(_mapper) {
    this._mapper = _mapper;

    this.toReplString = () => {
      return JSON.stringify(this, null, ' ');
    };
    this.help = () => ("Welcome to the new MongoDB Shell!\nAttributes: use, it");
    this.help.toReplString = () => ("Welcome to the new MongoDB Shell!\nAttributes: use, it");
    this.use = function() {
      return this._mapper.use(this, ...arguments);
    };
    this.use.help = () => ("!! No help defined for this method\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.use.help.toReplString = () => ("!! No help defined for this method\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.use.serverVersions = [0,4.4];
    this.use.topologies = [0,1,2];
    this.use.returnsPromise = false;
    this.use.returnType = "Unknown";
    this.it = function() {
      return this._mapper.it(this, ...arguments);
    };
    this.it.help = () => ("!! No help defined for this method\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.it.help.toReplString = () => ("!! No help defined for this method\nAttributes: serverVersions, topologies, returnsPromise, returnType");
    this.it.serverVersions = [0,4.4];
    this.it.topologies = [0,1,2];
    this.it.returnsPromise = false;
    this.it.returnType = "Unknown";
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
      return JSON.stringify(this, null, ' ');
    };
    this.help = () => ("The UpdateResult class.\nAttributes: acknowleged, matchedCount, modifiedCount, upsertedCount, insertedId");
    this.help.toReplString = () => ("The UpdateResult class.\nAttributes: acknowleged, matchedCount, modifiedCount, upsertedCount, insertedId");
  }
}

const ReadPreference = Object.freeze({
 "PRIMARY": 0,
 "PRIMARY_PREFERRED": 1,
 "SECONDARY": 2,
 "SECONDARY_PREFERRED": 3,
 "NEAREST": 4
});
const DBQuery = Object.freeze({
 "Option": {
  "tailable": 2,
  "slaveOk": 4,
  "oplogReplay": 8,
  "noTimeout": 16,
  "awaitData": 32,
  "exhaust": 64,
  "partial": 128
 }
});
const ServerVersions = Object.freeze({
 "latest": 4.4,
 "earliest": 0
});
const Topologies = Object.freeze({
 "ReplSet": 0,
 "Standalone": 1,
 "Shard": 2
});

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
module.exports.ReadPreference = ReadPreference;
module.exports.DBQuery = DBQuery;
module.exports.ServerVersions = ServerVersions;
module.exports.Topologies = Topologies;
