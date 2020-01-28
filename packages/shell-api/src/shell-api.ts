/* AUTO-GENERATED SHELL API CLASSES*/
import i18n from 'mongosh-i18n';

class AggregationCursor {
  constructor(_mapper, _cursor) {
    this._mapper = _mapper;
    this._cursor = _cursor;

    this.toReplString = () => {
      return this._mapper.it();
    };
    this.help = () => (i18n.__('shell-api.aggregation-cursor.description'));
    this.help.toReplString = () => (i18n.__('shell-api.aggregation-cursor.description'));
    this.bsonsize = function() {
      return this._cursor.bsonsize(...arguments);
    };
    this.bsonsize.help = () => (i18n.__('!! No help defined for this method'));
    this.bsonsize.help.toReplString = () => (i18n.__('!! No help defined for this method'));
    this.bsonsize.serverVersions = [0,4.4];
    this.bsonsize.topologies = [0,1,2];
    this.bsonsize.returnsPromise = false;
    this.bsonsize.returnType = "Unknown";
    this.close = function() {
      return this._cursor.close(...arguments);
    };
    this.close.help = () => (i18n.__('shell-api.aggregation-cursor.help.close'));
    this.close.help.toReplString = () => (i18n.__('shell-api.aggregation-cursor.help.close'));
    this.close.serverVersions = [0,4.4];
    this.close.topologies = [0,1,2];
    this.close.returnsPromise = false;
    this.close.returnType = "Unknown";
    this.forEach = function() {
      return this._cursor.forEach(...arguments);
    };
    this.forEach.help = () => (i18n.__('shell-api.aggregation-cursor.help.for-each'));
    this.forEach.help.toReplString = () => (i18n.__('shell-api.aggregation-cursor.help.for-each'));
    this.forEach.serverVersions = [0,4.4];
    this.forEach.topologies = [0,1,2];
    this.forEach.returnsPromise = false;
    this.forEach.returnType = "Unknown";
    this.hasNext = function() {
      return this._cursor.hasNext(...arguments);
    };
    this.hasNext.help = () => (i18n.__('shell-api.aggregation-cursor.help.has-next'));
    this.hasNext.help.toReplString = () => (i18n.__('shell-api.aggregation-cursor.help.has-next'));
    this.hasNext.serverVersions = [0,4.4];
    this.hasNext.topologies = [0,1,2];
    this.hasNext.returnsPromise = false;
    this.hasNext.returnType = "Unknown";
    this.isClosed = function() {
      return this._cursor.isClosed(...arguments);
    };
    this.isClosed.help = () => (i18n.__('shell-api.aggregation-cursor.help.is-closed'));
    this.isClosed.help.toReplString = () => (i18n.__('shell-api.aggregation-cursor.help.is-closed'));
    this.isClosed.serverVersions = [0,4.4];
    this.isClosed.topologies = [0,1,2];
    this.isClosed.returnsPromise = false;
    this.isClosed.returnType = "Unknown";
    this.isExhausted = function() {
      return this._cursor.isExhausted(...arguments);
    };
    this.isExhausted.help = () => (i18n.__('shell-api.aggregation-cursor.help.is-exhausted'));
    this.isExhausted.help.toReplString = () => (i18n.__('shell-api.aggregation-cursor.help.is-exhausted'));
    this.isExhausted.serverVersions = [0,4.4];
    this.isExhausted.topologies = [0,1,2];
    this.isExhausted.returnsPromise = false;
    this.isExhausted.returnType = "Unknown";
    this.itcount = function() {
      return this._cursor.itcount(...arguments);
    };
    this.itcount.help = () => (i18n.__('shell-api.aggregation-cursor.help.itcount'));
    this.itcount.help.toReplString = () => (i18n.__('shell-api.aggregation-cursor.help.itcount'));
    this.itcount.serverVersions = [0,4.4];
    this.itcount.topologies = [0,1,2];
    this.itcount.returnsPromise = false;
    this.itcount.returnType = "Unknown";
    this.map = function() {
      return this._cursor.map(...arguments);
    };
    this.map.help = () => (i18n.__('shell-api.aggregation-cursor.help.map'));
    this.map.help.toReplString = () => (i18n.__('shell-api.aggregation-cursor.help.map'));
    this.map.serverVersions = [0,4.4];
    this.map.topologies = [0,1,2];
    this.map.returnsPromise = false;
    this.map.returnType = "Unknown";
    this.next = function() {
      return this._cursor.next(...arguments);
    };
    this.next.help = () => (i18n.__('shell-api.aggregation-cursor.help.next'));
    this.next.help.toReplString = () => (i18n.__('shell-api.aggregation-cursor.help.next'));
    this.next.serverVersions = [0,4.4];
    this.next.topologies = [0,1,2];
    this.next.returnsPromise = false;
    this.next.returnType = "Unknown";
    this.objsLeftInBatch = function() {
      return this._cursor.objsLeftInBatch(...arguments);
    };
    this.objsLeftInBatch.help = () => (i18n.__('shell-api.aggregation-cursor.help.objs-left-in-batch'));
    this.objsLeftInBatch.help.toReplString = () => (i18n.__('shell-api.aggregation-cursor.help.objs-left-in-batch'));
    this.objsLeftInBatch.serverVersions = [0,4.4];
    this.objsLeftInBatch.topologies = [0,1,2];
    this.objsLeftInBatch.returnsPromise = false;
    this.objsLeftInBatch.returnType = "Unknown";
    this.toArray = function() {
      return this._cursor.toArray(...arguments);
    };
    this.toArray.help = () => (i18n.__('shell-api.aggregation-cursor.help.to-array'));
    this.toArray.help.toReplString = () => (i18n.__('shell-api.aggregation-cursor.help.to-array'));
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
    this.help = () => (i18n.__('The BulkWriteResult class.'));
    this.help.toReplString = () => (i18n.__('The BulkWriteResult class.'));
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
    this.help = () => (i18n.__('The collection class.'));
    this.help.toReplString = () => (i18n.__('The collection class.'));
    this.aggregate = function() {
      return this._mapper.aggregate(this, ...arguments);
    };
    this.aggregate.help = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.aggregate

Calculates aggregate values for the data in a collection or a view.

db.collection.aggregate(pipeline, options)

pipeline <array> A sequence of data aggregation operations or stages.
options <document>
    explain <bool>
    allowDiskUse <bool>
    cursor <document>
    maxTimeMS <int>
    bypassDocumentValidation <bool>
    readConcern <document>
    collation <document>
    hint <document>
    comment <string>
    writeConcern <document>

Returns: A cursor to the documents produced by the final stage of the aggregation pipeline operation, or if you include the explain option, the document that provides details on the processing of the aggregation operation. If the pipeline includes the $out operator, aggregate() returns an empty cursor.'));
    this.aggregate.help.toReplString = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.aggregate

Calculates aggregate values for the data in a collection or a view.

db.collection.aggregate(pipeline, options)

pipeline <array> A sequence of data aggregation operations or stages.
options <document>
    explain <bool>
    allowDiskUse <bool>
    cursor <document>
    maxTimeMS <int>
    bypassDocumentValidation <bool>
    readConcern <document>
    collation <document>
    hint <document>
    comment <string>
    writeConcern <document>

Returns: A cursor to the documents produced by the final stage of the aggregation pipeline operation, or if you include the explain option, the document that provides details on the processing of the aggregation operation. If the pipeline includes the $out operator, aggregate() returns an empty cursor.'));
    this.aggregate.serverVersions = [0,4.4];
    this.aggregate.topologies = [0,1,2];
    this.aggregate.returnsPromise = false;
    this.aggregate.returnType = "AggregationCursor";
    this.bulkWrite = function() {
      return this._mapper.bulkWrite(this, ...arguments);
    };
    this.bulkWrite.help = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.bulkWrite

Performs multiple write operations with controls for order of execution.

db.collection.bulkWrite(operations, options)

operations <array> An array of bulkWrite() write operations.
options <document>
    writeConcern <document>
    ordered	<boolean>

Returns: A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled.
         A count for each write operation.
         An array containing an _id for each successfully inserted or upserted documents.'));
    this.bulkWrite.help.toReplString = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.bulkWrite

Performs multiple write operations with controls for order of execution.

db.collection.bulkWrite(operations, options)

operations <array> An array of bulkWrite() write operations.
options <document>
    writeConcern <document>
    ordered	<boolean>

Returns: A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled.
         A count for each write operation.
         An array containing an _id for each successfully inserted or upserted documents.'));
    this.bulkWrite.serverVersions = [3.2,4.4];
    this.bulkWrite.topologies = [0,1,2];
    this.bulkWrite.returnsPromise = true;
    this.bulkWrite.returnType = "Unknown";
    this.countDocuments = function() {
      return this._mapper.countDocuments(this, ...arguments);
    };
    this.countDocuments.help = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.countDocuments

Returns the count of documents that match the query for a collection or view.

db.collection.countDocuments(query, options)

query <document> The query selection criteria. To count all documents, specify an empty document.
options <document>
    limit <integer>	Optional. The maximum number of documents to count.
    skip <integer>	Optional. The number of documents to skip before counting.
    hint <string or document>	Optional. An index name or the index specification to use for the query.
    maxTimeMS <integer>	Optional. The maximum amount of time to allow the count to run.'));
    this.countDocuments.help.toReplString = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.countDocuments

Returns the count of documents that match the query for a collection or view.

db.collection.countDocuments(query, options)

query <document> The query selection criteria. To count all documents, specify an empty document.
options <document>
    limit <integer>	Optional. The maximum number of documents to count.
    skip <integer>	Optional. The number of documents to skip before counting.
    hint <string or document>	Optional. An index name or the index specification to use for the query.
    maxTimeMS <integer>	Optional. The maximum amount of time to allow the count to run.'));
    this.countDocuments.serverVersions = ["4.0.3",4.4];
    this.countDocuments.topologies = [0,1,2];
    this.countDocuments.returnsPromise = true;
    this.countDocuments.returnType = "Unknown";
    this.count = function() {
      return this._mapper.count(this, ...arguments);
    };
    this.count.help = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.count

Returns the count of documents that would match a find() query for the collection or view. The db.collection.count() method does not perform the find() operation but instead counts and returns the number of results that match a query.
Avoid using the db.collection.count() method without a query predicate since without the query predicate, the method returns results based on the collection’s metadata, which may result in an approximate count.

db.collection.count(query, options)

query	<document>	The query selection criteria.
options	<document>
    limit <integer>	Optional. The maximum number of documents to count.
    skip <integer>	Optional. The number of documents to skip before counting.
    hint <string or document> Optional. An index name hint or specification for the query.
    maxTimeMS <integer>	Optional. The maximum amount of time to allow the query to run.
    readConcern	<string>
    collation <document>'));
    this.count.help.toReplString = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.count

Returns the count of documents that would match a find() query for the collection or view. The db.collection.count() method does not perform the find() operation but instead counts and returns the number of results that match a query.
Avoid using the db.collection.count() method without a query predicate since without the query predicate, the method returns results based on the collection’s metadata, which may result in an approximate count.

db.collection.count(query, options)

query	<document>	The query selection criteria.
options	<document>
    limit <integer>	Optional. The maximum number of documents to count.
    skip <integer>	Optional. The number of documents to skip before counting.
    hint <string or document> Optional. An index name hint or specification for the query.
    maxTimeMS <integer>	Optional. The maximum amount of time to allow the query to run.
    readConcern	<string>
    collation <document>'));
    this.count.serverVersions = [0,4.4];
    this.count.topologies = [0,1,2];
    this.count.returnsPromise = true;
    this.count.returnType = "Unknown";
    this.deleteMany = function() {
      return this._mapper.deleteMany(this, ...arguments);
    };
    this.deleteMany.help = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.deleteMany

Removes all documents that match the filter from a collection.

db.collection.deleteMany()

filter	<document> Specifies deletion criteria using query operators.
options <document>
    writeConcern <document>
    collation <document>

Returns: A document containing:
    A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled
    deletedCount containing the number of deleted documents'));
    this.deleteMany.help.toReplString = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.deleteMany

Removes all documents that match the filter from a collection.

db.collection.deleteMany()

filter	<document> Specifies deletion criteria using query operators.
options <document>
    writeConcern <document>
    collation <document>

Returns: A document containing:
    A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled
    deletedCount containing the number of deleted documents'));
    this.deleteMany.serverVersions = [0,4.4];
    this.deleteMany.topologies = [0,1,2];
    this.deleteMany.returnsPromise = true;
    this.deleteMany.returnType = "Unknown";
    this.deleteOne = function() {
      return this._mapper.deleteOne(this, ...arguments);
    };
    this.deleteOne.help = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.deleteOne

Removes a single document from a collection.

db.collection.deleteOne(filter, options)

filter <document> Specifies deletion criteria using query operators.
options <document>
    writeConcern <document>
    collation <document>

Returns:	A document containing:
    A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled
    deletedCount containing the number of deleted documents'));
    this.deleteOne.help.toReplString = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.deleteOne

Removes a single document from a collection.

db.collection.deleteOne(filter, options)

filter <document> Specifies deletion criteria using query operators.
options <document>
    writeConcern <document>
    collation <document>

Returns:	A document containing:
    A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled
    deletedCount containing the number of deleted documents'));
    this.deleteOne.serverVersions = [0,4.4];
    this.deleteOne.topologies = [0,1,2];
    this.deleteOne.returnsPromise = true;
    this.deleteOne.returnType = "Unknown";
    this.distinct = function() {
      return this._mapper.distinct(this, ...arguments);
    };
    this.distinct.help = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.distinct

Finds the distinct values for a specified field across a single collection or view and returns the results in an array.

db.collection.distinct(field, query, options)

field <string> The field for which to return distinct values.
query <document> A query that specifies the documents from which to retrieve the distinct values.
options	<document>
    collation <document>

Returns: The results in an array.'));
    this.distinct.help.toReplString = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.distinct

Finds the distinct values for a specified field across a single collection or view and returns the results in an array.

db.collection.distinct(field, query, options)

field <string> The field for which to return distinct values.
query <document> A query that specifies the documents from which to retrieve the distinct values.
options	<document>
    collation <document>

Returns: The results in an array.'));
    this.distinct.serverVersions = [0,4.4];
    this.distinct.topologies = [0,1,2];
    this.distinct.returnsPromise = false;
    this.distinct.returnType = "Cursor";
    this.estimatedDocumentCount = function() {
      return this._mapper.estimatedDocumentCount(this, ...arguments);
    };
    this.estimatedDocumentCount.help = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.estimatedDocumentCount

Returns the count of all documents in a collection or view.

db.collection.estimatedDocumentCount( <options> )

options	<document>
    maxTimeMS <integer> Optional. The maximum amount of time to allow the count to run.

Returns: count as an integer'));
    this.estimatedDocumentCount.help.toReplString = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.estimatedDocumentCount

Returns the count of all documents in a collection or view.

db.collection.estimatedDocumentCount( <options> )

options	<document>
    maxTimeMS <integer> Optional. The maximum amount of time to allow the count to run.

Returns: count as an integer'));
    this.estimatedDocumentCount.serverVersions = ["4.0.3",4.4];
    this.estimatedDocumentCount.topologies = [0,1,2];
    this.estimatedDocumentCount.returnsPromise = true;
    this.estimatedDocumentCount.returnType = "Unknown";
    this.find = function() {
      return this._mapper.find(this, ...arguments);
    };
    this.find.help = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.find

Selects documents in a collection or view.

db.collection.find(query, projection)

query <document> Optional. Specifies selection filter using query operators. To return all documents in a collection, omit this parameter or pass an empty document ({}).
projection <document> Optional. Specifies the fields to return in the documents that match the query filter. To return all fields in the matching documents, omit this parameter.

Returns: A cursor to the documents that match the query criteria.'));
    this.find.help.toReplString = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.find

Selects documents in a collection or view.

db.collection.find(query, projection)

query <document> Optional. Specifies selection filter using query operators. To return all documents in a collection, omit this parameter or pass an empty document ({}).
projection <document> Optional. Specifies the fields to return in the documents that match the query filter. To return all fields in the matching documents, omit this parameter.

Returns: A cursor to the documents that match the query criteria.'));
    this.find.serverVersions = [0,4.4];
    this.find.topologies = [0,1,2];
    this.find.returnsPromise = false;
    this.find.returnType = "Cursor";
    this.findAndModify = function() {
      return this._mapper.findAndModify(this, ...arguments);
    };
    this.findAndModify.help = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.findAndModify

Modifies and returns a single document.

db.collection.findAndModify(document)

document <document>
    query <document>,
    sort <document>,
    remove <boolean>,
    update <document or aggregation pipeline>, // Changed in MongoDB 4.2
    new <boolean>,
    fields <document>,
    upsert <boolean>,
    bypassDocumentValidation <boolean>,
    writeConcern <document>,
    collation <document>,
    arrayFilters [ <filterdocument1>, ... ]

Returns: For remove operations, if the query matches a document, findAndModify() returns the removed document. If the query does not match a document to remove, findAndModify() returns null.'));
    this.findAndModify.help.toReplString = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.findAndModify

Modifies and returns a single document.

db.collection.findAndModify(document)

document <document>
    query <document>,
    sort <document>,
    remove <boolean>,
    update <document or aggregation pipeline>, // Changed in MongoDB 4.2
    new <boolean>,
    fields <document>,
    upsert <boolean>,
    bypassDocumentValidation <boolean>,
    writeConcern <document>,
    collation <document>,
    arrayFilters [ <filterdocument1>, ... ]

Returns: For remove operations, if the query matches a document, findAndModify() returns the removed document. If the query does not match a document to remove, findAndModify() returns null.'));
    this.findAndModify.serverVersions = [0,4.4];
    this.findAndModify.topologies = [0,1,2];
    this.findAndModify.returnsPromise = false;
    this.findAndModify.returnType = "Unknown";
    this.findOne = function() {
      return this._mapper.findOne(this, ...arguments);
    };
    this.findOne.help = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.findOne

Selects documents in a collection or view.

db.collection.findOne(query, projection)

query <document> Optional. Specifies selection filter using query operators. To return all documents in a collection, omit this parameter or pass an empty document ({}).
projection <document> Optional. Specifies the fields to return in the documents that match the query filter. To return all fields in the matching documents, omit this parameter.

Returns: A cursor to the documents that match the query criteria.'));
    this.findOne.help.toReplString = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.findOne

Selects documents in a collection or view.

db.collection.findOne(query, projection)

query <document> Optional. Specifies selection filter using query operators. To return all documents in a collection, omit this parameter or pass an empty document ({}).
projection <document> Optional. Specifies the fields to return in the documents that match the query filter. To return all fields in the matching documents, omit this parameter.

Returns: A cursor to the documents that match the query criteria.'));
    this.findOne.serverVersions = [0,4.4];
    this.findOne.topologies = [0,1,2];
    this.findOne.returnsPromise = false;
    this.findOne.returnType = "Unknown";
    this.findOneAndDelete = function() {
      return this._mapper.findOneAndDelete(this, ...arguments);
    };
    this.findOneAndDelete.help = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndDelete

Deletes a single document based on the filter and sort criteria, returning the deleted document.

db.collection.findOneAndDelete(filter, options)

filter <document> The selection criteria for the update.
options <document>
    projection <document>
    sort <document>
    maxTimeMS <number>
    collation <document>

Returns: Returns the deleted document.'));
    this.findOneAndDelete.help.toReplString = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndDelete

Deletes a single document based on the filter and sort criteria, returning the deleted document.

db.collection.findOneAndDelete(filter, options)

filter <document> The selection criteria for the update.
options <document>
    projection <document>
    sort <document>
    maxTimeMS <number>
    collation <document>

Returns: Returns the deleted document.'));
    this.findOneAndDelete.serverVersions = [3.2,4.4];
    this.findOneAndDelete.topologies = [0,1,2];
    this.findOneAndDelete.returnsPromise = true;
    this.findOneAndDelete.returnType = "Unknown";
    this.findOneAndReplace = function() {
      return this._mapper.findOneAndReplace(this, ...arguments);
    };
    this.findOneAndReplace.help = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndReplace

Modifies and replaces a single document based on the filter and sort criteria.

db.collection.findOneAndReplace(filter, replacement, options)

filter <document> The selection criteria for the update.
replacement	<document> The replacement document.
options <document>
    projection <document>
    sort <document>
    maxTimeMS <number>
    upsert <boolean>
    returnNewDocument <boolean>
    collation <document>

Returns: Returns either the original document or, if returnNewDocument: true, the replacement document.'));
    this.findOneAndReplace.help.toReplString = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndReplace

Modifies and replaces a single document based on the filter and sort criteria.

db.collection.findOneAndReplace(filter, replacement, options)

filter <document> The selection criteria for the update.
replacement	<document> The replacement document.
options <document>
    projection <document>
    sort <document>
    maxTimeMS <number>
    upsert <boolean>
    returnNewDocument <boolean>
    collation <document>

Returns: Returns either the original document or, if returnNewDocument: true, the replacement document.'));
    this.findOneAndReplace.serverVersions = [3.2,4.4];
    this.findOneAndReplace.topologies = [0,1,2];
    this.findOneAndReplace.returnsPromise = true;
    this.findOneAndReplace.returnType = "Unknown";
    this.findOneAndUpdate = function() {
      return this._mapper.findOneAndUpdate(this, ...arguments);
    };
    this.findOneAndUpdate.help = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndUpdate

Updates a single document based on the filter and sort criteria.

db.collection.findOneAndUpdate(filter, update, options)

filter <document> The selection criteria for the update.
update <document or array> The update document or, starting in MongoDB 4.2, an aggregation pipeline.
options <document>
    projection <document>
    sort <document>
    maxTimeMS <number>
    upsert <boolean>
    returnNewDocument <boolean>
    collation <document>
    arrayFilters [ <filterdocument1>, ... ]

Returns: Returns either the original document or, if returnNewDocument: true, the updated document.'));
    this.findOneAndUpdate.help.toReplString = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndUpdate

Updates a single document based on the filter and sort criteria.

db.collection.findOneAndUpdate(filter, update, options)

filter <document> The selection criteria for the update.
update <document or array> The update document or, starting in MongoDB 4.2, an aggregation pipeline.
options <document>
    projection <document>
    sort <document>
    maxTimeMS <number>
    upsert <boolean>
    returnNewDocument <boolean>
    collation <document>
    arrayFilters [ <filterdocument1>, ... ]

Returns: Returns either the original document or, if returnNewDocument: true, the updated document.'));
    this.findOneAndUpdate.serverVersions = [3.2,4.4];
    this.findOneAndUpdate.topologies = [0,1,2];
    this.findOneAndUpdate.returnsPromise = true;
    this.findOneAndUpdate.returnType = "Unknown";
    this.insert = function() {
      return this._mapper.insert(this, ...arguments);
    };
    this.insert.help = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.insert

Inserts a document or documents into a collection.

db.collection.insert(document, options)

document <document or array> A document or array of documents to insert into the collection.
options <document>
    writeConcern: <document>
    ordered: <boolean>'));
    this.insert.help.toReplString = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.insert

Inserts a document or documents into a collection.

db.collection.insert(document, options)

document <document or array> A document or array of documents to insert into the collection.
options <document>
    writeConcern: <document>
    ordered: <boolean>'));
    this.insert.serverVersions = [0,4.4];
    this.insert.topologies = [0,1,2];
    this.insert.returnsPromise = true;
    this.insert.returnType = "Unknown";
    this.insertMany = function() {
      return this._mapper.insertMany(this, ...arguments);
    };
    this.insertMany.help = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.insertMany

Inserts multiple documents into a collection.

db.collection.insertMany(documents, options)

documents <document> An array of documents to insert into the collection.
options <document>
    writeConcern <document>
    ordered <boolean>

Returns: A document containing:
    A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled
    An array of _id for each successfully inserted documents'));
    this.insertMany.help.toReplString = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.insertMany

Inserts multiple documents into a collection.

db.collection.insertMany(documents, options)

documents <document> An array of documents to insert into the collection.
options <document>
    writeConcern <document>
    ordered <boolean>

Returns: A document containing:
    A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled
    An array of _id for each successfully inserted documents'));
    this.insertMany.serverVersions = [3.2,4.4];
    this.insertMany.topologies = [0,1,2];
    this.insertMany.returnsPromise = true;
    this.insertMany.returnType = "Unknown";
    this.insertOne = function() {
      return this._mapper.insertOne(this, ...arguments);
    };
    this.insertOne.help = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.insertOne

Inserts a document into a collection.

db.collection.insertOne(document, options)

document <document> A document to insert into the collection.
options <document>
    writeConcern <document>

Returns: A document containing:
    A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled.
    A field insertedId with the _id value of the inserted document.'));
    this.insertOne.help.toReplString = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.insertOne

Inserts a document into a collection.

db.collection.insertOne(document, options)

document <document> A document to insert into the collection.
options <document>
    writeConcern <document>

Returns: A document containing:
    A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled.
    A field insertedId with the _id value of the inserted document.'));
    this.insertOne.serverVersions = [3.2,4.4];
    this.insertOne.topologies = [0,1,2];
    this.insertOne.returnsPromise = true;
    this.insertOne.returnType = "Unknown";
    this.isCapped = function() {
      return this._mapper.isCapped(this, ...arguments);
    };
    this.isCapped.help = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.isCapped

db.collection.isCapped()

Returns true if the collection is a capped collection, otherwise returns false.'));
    this.isCapped.help.toReplString = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.isCapped

db.collection.isCapped()

Returns true if the collection is a capped collection, otherwise returns false.'));
    this.isCapped.serverVersions = [0,4.4];
    this.isCapped.topologies = [0,1,2];
    this.isCapped.returnsPromise = true;
    this.isCapped.returnType = "Unknown";
    this.remove = function() {
      return this._mapper.remove(this, ...arguments);
    };
    this.remove.help = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.remove

Removes documents from a collection.

The db.collection.remove() method can have one of two syntaxes. The remove() method can take a query document and an optional justOne boolean:

db.collection.remove(
   <query>,
   <justOne>
)
Or the method can take a query document and an optional remove options document:

New in version 2.6.

db.collection.remove(
   <query>,
   {
     justOne: <boolean>,
     writeConcern: <document>,
     collation: <document>
   }
)

Returns: The status of the operation.'));
    this.remove.help.toReplString = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.remove

Removes documents from a collection.

The db.collection.remove() method can have one of two syntaxes. The remove() method can take a query document and an optional justOne boolean:

db.collection.remove(
   <query>,
   <justOne>
)
Or the method can take a query document and an optional remove options document:

New in version 2.6.

db.collection.remove(
   <query>,
   {
     justOne: <boolean>,
     writeConcern: <document>,
     collation: <document>
   }
)

Returns: The status of the operation.'));
    this.remove.serverVersions = [0,4.4];
    this.remove.topologies = [0,1,2];
    this.remove.returnsPromise = true;
    this.remove.returnType = "Unknown";
    this.save = function() {
      return this._mapper.save(this, ...arguments);
    };
    this.save.help = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.save

Updates an existing document or inserts a new document, depending on its document parameter.

db.collection.save(document, options)

document <document> A document to save to the collection.
options <document>
    writeConcern <document>

Returns: A WriteResult object that contains the status of the operation.
Changed in version 2.6: The save() returns an object that contains the status of the operation.'));
    this.save.help.toReplString = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.save

Updates an existing document or inserts a new document, depending on its document parameter.

db.collection.save(document, options)

document <document> A document to save to the collection.
options <document>
    writeConcern <document>

Returns: A WriteResult object that contains the status of the operation.
Changed in version 2.6: The save() returns an object that contains the status of the operation.'));
    this.save.serverVersions = [0,4.4];
    this.save.topologies = [0,1,2];
    this.save.returnsPromise = true;
    this.save.returnType = "Unknown";
    this.replaceOne = function() {
      return this._mapper.replaceOne(this, ...arguments);
    };
    this.replaceOne.help = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.replaceOne

Replaces a single document within the collection based on the filter.

db.collection.replaceOne(filter, replacement, options)

filter <document> The selection criteria for the update.
replacement	<document> The replacement document.
options <document>
    upsert <boolean>
    writeConcern <document>
    collation <document>
    hint <document|string>'));
    this.replaceOne.help.toReplString = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.replaceOne

Replaces a single document within the collection based on the filter.

db.collection.replaceOne(filter, replacement, options)

filter <document> The selection criteria for the update.
replacement	<document> The replacement document.
options <document>
    upsert <boolean>
    writeConcern <document>
    collation <document>
    hint <document|string>'));
    this.replaceOne.serverVersions = [3.2,4.4];
    this.replaceOne.topologies = [0,1,2];
    this.replaceOne.returnsPromise = true;
    this.replaceOne.returnType = "Unknown";
    this.update = function() {
      return this._mapper.update(this, ...arguments);
    };
    this.update.help = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.update

Modifies an existing document or documents in a collection.

db.collection.update(query, update, options)

filter <document> The selection criteria for the update.
update <document> The modifications to apply.
options <document>
upsert: <boolean>,
     multi <boolean>
     writeConcern <document>
     collation <document>
     arrayFilters [ <filterdocument1>, ... ]
     hint  <document|string>        // Available starting in MongoDB 4.2'));
    this.update.help.toReplString = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.update

Modifies an existing document or documents in a collection.

db.collection.update(query, update, options)

filter <document> The selection criteria for the update.
update <document> The modifications to apply.
options <document>
upsert: <boolean>,
     multi <boolean>
     writeConcern <document>
     collation <document>
     arrayFilters [ <filterdocument1>, ... ]
     hint  <document|string>        // Available starting in MongoDB 4.2'));
    this.update.serverVersions = [0,4.4];
    this.update.topologies = [0,1,2];
    this.update.returnsPromise = true;
    this.update.returnType = "Unknown";
    this.updateMany = function() {
      return this._mapper.updateMany(this, ...arguments);
    };
    this.updateMany.help = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.updateMany

Updates all documents that match the specified filter for a collection.

db.collection.updateMany(filter, update, options)

filter <document> The selection criteria for the update.
update <document> The modifications to apply.
options <document>
    upsert <boolean>
    writeConcern <document>
    collation <document>
    arrayFilters [ <filterdocument1>, ... ]
    hint  <document|string>        // Available starting in MongoDB 4.2.1'));
    this.updateMany.help.toReplString = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.updateMany

Updates all documents that match the specified filter for a collection.

db.collection.updateMany(filter, update, options)

filter <document> The selection criteria for the update.
update <document> The modifications to apply.
options <document>
    upsert <boolean>
    writeConcern <document>
    collation <document>
    arrayFilters [ <filterdocument1>, ... ]
    hint  <document|string>        // Available starting in MongoDB 4.2.1'));
    this.updateMany.serverVersions = [3.2,4.4];
    this.updateMany.topologies = [0,1,2];
    this.updateMany.returnsPromise = true;
    this.updateMany.returnType = "Unknown";
    this.updateOne = function() {
      return this._mapper.updateOne(this, ...arguments);
    };
    this.updateOne.help = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.updateOne

Updates a single document within the collection based on the filter.

db.collection.updateOne(filter, update, options)

filter <document> The selection criteria for the update.
update <document> The modifications to apply.
options <document>
    upsert <boolean>
    writeConcern <document>
    collation <document>
    arrayFilters [ <filterdocument1>, ... ]
    hint  <document|string>        // Available starting in MongoDB 4.2.1'));
    this.updateOne.help.toReplString = () => (i18n.__('https://docs.mongodb.com/manual/reference/method/db.collection.updateOne

Updates a single document within the collection based on the filter.

db.collection.updateOne(filter, update, options)

filter <document> The selection criteria for the update.
update <document> The modifications to apply.
options <document>
    upsert <boolean>
    writeConcern <document>
    collation <document>
    arrayFilters [ <filterdocument1>, ... ]
    hint  <document|string>        // Available starting in MongoDB 4.2.1'));
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
    this.help = () => (i18n.__('The cursor class.'));
    this.help.toReplString = () => (i18n.__('The cursor class.'));
    this.addOption = function() {
      return this._cursor.addOption(...arguments);
    };
    this.addOption.help = () => (i18n.__('Adds OP_QUERY wire protocol flags, such as the tailable flag, to change the behavior of queries. Accepts: DBQuery.Option fields tailable, slaveOk, noTimeout, awaitData, exhaust, partial.'));
    this.addOption.help.toReplString = () => (i18n.__('Adds OP_QUERY wire protocol flags, such as the tailable flag, to change the behavior of queries. Accepts: DBQuery.Option fields tailable, slaveOk, noTimeout, awaitData, exhaust, partial.'));
    this.addOption.serverVersions = [0,3.2];
    this.addOption.topologies = [0,1,2];
    this.addOption.returnsPromise = false;
    this.addOption.returnType = "Unknown";
    this.allowPartialResults = function() {
      return this._cursor.allowPartialResults(...arguments);
    };
    this.allowPartialResults.help = () => (i18n.__('Sets the 'partial' option to true.'));
    this.allowPartialResults.help.toReplString = () => (i18n.__('Sets the 'partial' option to true.'));
    this.allowPartialResults.serverVersions = [0,4.4];
    this.allowPartialResults.topologies = [0,1,2];
    this.allowPartialResults.returnsPromise = false;
    this.allowPartialResults.returnType = "Unknown";
    this.arrayAccess = function() {
      return this._cursor.arrayAccess(...arguments);
    };
    this.arrayAccess.help = () => (i18n.__('!! No help defined for this method'));
    this.arrayAccess.help.toReplString = () => (i18n.__('!! No help defined for this method'));
    this.arrayAccess.serverVersions = [0,4.4];
    this.arrayAccess.topologies = [0,1,2];
    this.arrayAccess.returnsPromise = false;
    this.arrayAccess.returnType = "Unknown";
    this.batchSize = function() {
      return this._cursor.batchSize(...arguments);
    };
    this.batchSize.help = () => (i18n.__('Specifies the number of documents to return in each batch of the response from the MongoDB instance. In most cases, modifying the batch size will not affect the user or the application, as the mongo shell and most drivers return results as if MongoDB returned a single batch.'));
    this.batchSize.help.toReplString = () => (i18n.__('Specifies the number of documents to return in each batch of the response from the MongoDB instance. In most cases, modifying the batch size will not affect the user or the application, as the mongo shell and most drivers return results as if MongoDB returned a single batch.'));
    this.batchSize.serverVersions = [0,4.4];
    this.batchSize.topologies = [0,1,2];
    this.batchSize.returnsPromise = false;
    this.batchSize.returnType = "Unknown";
    this.clone = function() {
      return this._cursor.clone(...arguments);
    };
    this.clone.help = () => (i18n.__('Clone the cursor.'));
    this.clone.help.toReplString = () => (i18n.__('Clone the cursor.'));
    this.clone.serverVersions = [0,4.4];
    this.clone.topologies = [0,1,2];
    this.clone.returnsPromise = false;
    this.clone.returnType = "Unknown";
    this.close = function() {
      return this._cursor.close(...arguments);
    };
    this.close.help = () => (i18n.__('Instructs the server to close a cursor and free associated server resources. The server will automatically close cursors that have no remaining results, as well as cursors that have been idle for a period of time and lack the cursor.noCursorTimeout() option.'));
    this.close.help.toReplString = () => (i18n.__('Instructs the server to close a cursor and free associated server resources. The server will automatically close cursors that have no remaining results, as well as cursors that have been idle for a period of time and lack the cursor.noCursorTimeout() option.'));
    this.close.serverVersions = [0,4.4];
    this.close.topologies = [0,1,2];
    this.close.returnsPromise = false;
    this.close.returnType = "Unknown";
    this.collation = function() {
      return this._cursor.collation(...arguments);
    };
    this.collation.help = () => (i18n.__('Specifies the collation for the cursor returned by the db.collection.find(). To use, append to the db.collection.find().'));
    this.collation.help.toReplString = () => (i18n.__('Specifies the collation for the cursor returned by the db.collection.find(). To use, append to the db.collection.find().'));
    this.collation.serverVersions = [3.4,4.4];
    this.collation.topologies = [0,1,2];
    this.collation.returnsPromise = false;
    this.collation.returnType = "Unknown";
    this.comment = function() {
      return this._cursor.comment(...arguments);
    };
    this.comment.help = () => (i18n.__('Adds a comment field to the query.'));
    this.comment.help.toReplString = () => (i18n.__('Adds a comment field to the query.'));
    this.comment.serverVersions = [3.2,4.4];
    this.comment.topologies = [0,1,2];
    this.comment.returnsPromise = false;
    this.comment.returnType = "Unknown";
    this.count = function() {
      return this._cursor.count(...arguments);
    };
    this.count.help = () => (i18n.__('Counts the number of documents referenced by a cursor.'));
    this.count.help.toReplString = () => (i18n.__('Counts the number of documents referenced by a cursor.'));
    this.count.serverVersions = [0,4.4];
    this.count.topologies = [0,1,2];
    this.count.returnsPromise = false;
    this.count.returnType = "Unknown";
    this.count.serverVersion = [0,4];
    this.explain = function() {
      return this._cursor.explain(...arguments);
    };
    this.explain.help = () => (i18n.__('Provides information on the query plan for the db.collection.find() method.'));
    this.explain.help.toReplString = () => (i18n.__('Provides information on the query plan for the db.collection.find() method.'));
    this.explain.serverVersions = [0,4.4];
    this.explain.topologies = [0,1,2];
    this.explain.returnsPromise = false;
    this.explain.returnType = "Unknown";
    this.forEach = function() {
      return this._cursor.forEach(...arguments);
    };
    this.forEach.help = () => (i18n.__('Iterates the cursor to apply a JavaScript function to each document from the cursor.'));
    this.forEach.help.toReplString = () => (i18n.__('Iterates the cursor to apply a JavaScript function to each document from the cursor.'));
    this.forEach.serverVersions = [0,4.4];
    this.forEach.topologies = [0,1,2];
    this.forEach.returnsPromise = false;
    this.forEach.returnType = "Unknown";
    this.getQueryPlan = function() {
      return this._cursor.getQueryPlan(...arguments);
    };
    this.getQueryPlan.help = () => (i18n.__('Runs cursor.explain()'));
    this.getQueryPlan.help.toReplString = () => (i18n.__('Runs cursor.explain()'));
    this.getQueryPlan.serverVersions = [0,4.4];
    this.getQueryPlan.topologies = [0,1,2];
    this.getQueryPlan.returnsPromise = false;
    this.getQueryPlan.returnType = "Unknown";
    this.hasNext = function() {
      return this._cursor.hasNext(...arguments);
    };
    this.hasNext.help = () => (i18n.__('cursor.hasNext() returns true if the cursor returned by the db.collection.find() query can iterate further to return more documents.'));
    this.hasNext.help.toReplString = () => (i18n.__('cursor.hasNext() returns true if the cursor returned by the db.collection.find() query can iterate further to return more documents.'));
    this.hasNext.serverVersions = [0,4.4];
    this.hasNext.topologies = [0,1,2];
    this.hasNext.returnsPromise = false;
    this.hasNext.returnType = "Unknown";
    this.hint = function() {
      return this._cursor.hint(...arguments);
    };
    this.hint.help = () => (i18n.__('Call this method on a query to override MongoDB’s default index selection and query optimization process. Use db.collection.getIndexes() to return the list of current indexes on a collection.'));
    this.hint.help.toReplString = () => (i18n.__('Call this method on a query to override MongoDB’s default index selection and query optimization process. Use db.collection.getIndexes() to return the list of current indexes on a collection.'));
    this.hint.serverVersions = [0,4.4];
    this.hint.topologies = [0,1,2];
    this.hint.returnsPromise = false;
    this.hint.returnType = "Unknown";
    this.isClosed = function() {
      return this._cursor.isClosed(...arguments);
    };
    this.isClosed.help = () => (i18n.__('Returns true if the cursor is closed.'));
    this.isClosed.help.toReplString = () => (i18n.__('Returns true if the cursor is closed.'));
    this.isClosed.serverVersions = [0,4.4];
    this.isClosed.topologies = [0,1,2];
    this.isClosed.returnsPromise = false;
    this.isClosed.returnType = "Unknown";
    this.isExhausted = function() {
      return this._cursor.isExhausted(...arguments);
    };
    this.isExhausted.help = () => (i18n.__('cursor.isExhausted() returns true if the cursor is closed and there are no remaining objects in the batch.'));
    this.isExhausted.help.toReplString = () => (i18n.__('cursor.isExhausted() returns true if the cursor is closed and there are no remaining objects in the batch.'));
    this.isExhausted.serverVersions = [0,4.4];
    this.isExhausted.topologies = [0,1,2];
    this.isExhausted.returnsPromise = false;
    this.isExhausted.returnType = "Unknown";
    this.itcount = function() {
      return this._cursor.itcount(...arguments);
    };
    this.itcount.help = () => (i18n.__('Counts the number of documents remaining in a cursor. itcount() is similar to cursor.count(), but actually executes the query on an existing iterator, exhausting its contents in the process.'));
    this.itcount.help.toReplString = () => (i18n.__('Counts the number of documents remaining in a cursor. itcount() is similar to cursor.count(), but actually executes the query on an existing iterator, exhausting its contents in the process.'));
    this.itcount.serverVersions = [0,4.4];
    this.itcount.topologies = [0,1,2];
    this.itcount.returnsPromise = false;
    this.itcount.returnType = "Unknown";
    this.length = function() {
      return this._cursor.length(...arguments);
    };
    this.length.help = () => (i18n.__('Runs cursor.count()'));
    this.length.help.toReplString = () => (i18n.__('Runs cursor.count()'));
    this.length.serverVersions = [0,4.4];
    this.length.topologies = [0,1,2];
    this.length.returnsPromise = false;
    this.length.returnType = "Unknown";
    this.limit = function() {
      return this._cursor.limit(...arguments);
    };
    this.limit.help = () => (i18n.__('Use the limit() method on a cursor to specify the maximum number of documents the cursor will return.'));
    this.limit.help.toReplString = () => (i18n.__('Use the limit() method on a cursor to specify the maximum number of documents the cursor will return.'));
    this.limit.serverVersions = [0,4.4];
    this.limit.topologies = [0,1,2];
    this.limit.returnsPromise = false;
    this.limit.returnType = "Unknown";
    this.map = function() {
      return this._cursor.map(...arguments);
    };
    this.map.help = () => (i18n.__('Applies the first argument, a function, to each document visited by the cursor and collects the return values from successive application into an array.'));
    this.map.help.toReplString = () => (i18n.__('Applies the first argument, a function, to each document visited by the cursor and collects the return values from successive application into an array.'));
    this.map.serverVersions = [0,4.4];
    this.map.topologies = [0,1,2];
    this.map.returnsPromise = false;
    this.map.returnType = "Unknown";
    this.max = function() {
      return this._cursor.max(...arguments);
    };
    this.max.help = () => (i18n.__('Specifies the exclusive upper bound for a specific index in order to constrain the results of find(). max() provides a way to specify an upper bound on compound key indexes.'));
    this.max.help.toReplString = () => (i18n.__('Specifies the exclusive upper bound for a specific index in order to constrain the results of find(). max() provides a way to specify an upper bound on compound key indexes.'));
    this.max.serverVersions = [0,4.4];
    this.max.topologies = [0,1,2];
    this.max.returnsPromise = false;
    this.max.returnType = "Unknown";
    this.maxScan = function() {
      return this._cursor.maxScan(...arguments);
    };
    this.maxScan.help = () => (i18n.__('Constrains the query to only scan the specified number of documents when fulfilling the query.'));
    this.maxScan.help.toReplString = () => (i18n.__('Constrains the query to only scan the specified number of documents when fulfilling the query.'));
    this.maxScan.serverVersions = [0,4];
    this.maxScan.topologies = [0,1,2];
    this.maxScan.returnsPromise = false;
    this.maxScan.returnType = "Unknown";
    this.maxTimeMS = function() {
      return this._cursor.maxTimeMS(...arguments);
    };
    this.maxTimeMS.help = () => (i18n.__('Specifies a cumulative time limit in milliseconds for processing operations on a cursor.'));
    this.maxTimeMS.help.toReplString = () => (i18n.__('Specifies a cumulative time limit in milliseconds for processing operations on a cursor.'));
    this.maxTimeMS.serverVersions = [0,4.4];
    this.maxTimeMS.topologies = [0,1,2];
    this.maxTimeMS.returnsPromise = false;
    this.maxTimeMS.returnType = "Unknown";
    this.min = function() {
      return this._cursor.min(...arguments);
    };
    this.min.help = () => (i18n.__('Specifies the inclusive lower bound for a specific index in order to constrain the results of find(). min() provides a way to specify lower bounds on compound key indexes.'));
    this.min.help.toReplString = () => (i18n.__('Specifies the inclusive lower bound for a specific index in order to constrain the results of find(). min() provides a way to specify lower bounds on compound key indexes.'));
    this.min.serverVersions = [0,4.4];
    this.min.topologies = [0,1,2];
    this.min.returnsPromise = false;
    this.min.returnType = "Unknown";
    this.modifiers = function() {
      return this._cursor.modifiers(...arguments);
    };
    this.modifiers.help = () => (i18n.__('Get query modifiers.'));
    this.modifiers.help.toReplString = () => (i18n.__('Get query modifiers.'));
    this.modifiers.serverVersions = [0,4.4];
    this.modifiers.topologies = [0,1,2];
    this.modifiers.returnsPromise = false;
    this.modifiers.returnType = "Unknown";
    this.next = function() {
      return this._cursor.next(...arguments);
    };
    this.next.help = () => (i18n.__('The next document in the cursor returned by the db.collection.find() method.'));
    this.next.help.toReplString = () => (i18n.__('The next document in the cursor returned by the db.collection.find() method.'));
    this.next.serverVersions = [0,4.4];
    this.next.topologies = [0,1,2];
    this.next.returnsPromise = false;
    this.next.returnType = "Unknown";
    this.noCursorTimeout = function() {
      return this._cursor.noCursorTimeout(...arguments);
    };
    this.noCursorTimeout.help = () => (i18n.__('Instructs the server to avoid closing a cursor automatically after a period of inactivity.'));
    this.noCursorTimeout.help.toReplString = () => (i18n.__('Instructs the server to avoid closing a cursor automatically after a period of inactivity.'));
    this.noCursorTimeout.serverVersions = [0,4.4];
    this.noCursorTimeout.topologies = [0,1,2];
    this.noCursorTimeout.returnsPromise = false;
    this.noCursorTimeout.returnType = "Unknown";
    this.objsLeftInBatch = function() {
      return this._cursor.objsLeftInBatch(...arguments);
    };
    this.objsLeftInBatch.help = () => (i18n.__('cursor.objsLeftInBatch() returns the number of documents remaining in the current batch.'));
    this.objsLeftInBatch.help.toReplString = () => (i18n.__('cursor.objsLeftInBatch() returns the number of documents remaining in the current batch.'));
    this.objsLeftInBatch.serverVersions = [0,4.4];
    this.objsLeftInBatch.topologies = [0,1,2];
    this.objsLeftInBatch.returnsPromise = false;
    this.objsLeftInBatch.returnType = "Unknown";
    this.oplogReplay = function() {
      return this._cursor.oplogReplay(...arguments);
    };
    this.oplogReplay.help = () => (i18n.__('Sets oplogReplay cursor flag to true.'));
    this.oplogReplay.help.toReplString = () => (i18n.__('Sets oplogReplay cursor flag to true.'));
    this.oplogReplay.serverVersions = [0,4.4];
    this.oplogReplay.topologies = [0,1,2];
    this.oplogReplay.returnsPromise = false;
    this.oplogReplay.returnType = "Unknown";
    this.projection = function() {
      return this._cursor.projection(...arguments);
    };
    this.projection.help = () => (i18n.__('Sets a field projection for the query.'));
    this.projection.help.toReplString = () => (i18n.__('Sets a field projection for the query.'));
    this.projection.serverVersions = [0,4.4];
    this.projection.topologies = [0,1,2];
    this.projection.returnsPromise = false;
    this.projection.returnType = "Unknown";
    this.pretty = function() {
      return this._cursor.pretty(...arguments);
    };
    this.pretty.help = () => (i18n.__('Configures the cursor to display results in an easy-to-read format.'));
    this.pretty.help.toReplString = () => (i18n.__('Configures the cursor to display results in an easy-to-read format.'));
    this.pretty.serverVersions = [0,4.4];
    this.pretty.topologies = [0,1,2];
    this.pretty.returnsPromise = false;
    this.pretty.returnType = "Unknown";
    this.readConcern = function() {
      return this._cursor.readConcern(...arguments);
    };
    this.readConcern.help = () => (i18n.__('Specify a read concern for the db.collection.find() method.'));
    this.readConcern.help.toReplString = () => (i18n.__('Specify a read concern for the db.collection.find() method.'));
    this.readConcern.serverVersions = [3.2,4.4];
    this.readConcern.topologies = [0,1,2];
    this.readConcern.returnsPromise = false;
    this.readConcern.returnType = "Unknown";
    this.readOnly = function() {
      return this._cursor.readOnly(...arguments);
    };
    this.readOnly.help = () => (i18n.__('TODO'));
    this.readOnly.help.toReplString = () => (i18n.__('TODO'));
    this.readOnly.serverVersions = [0,4.4];
    this.readOnly.topologies = [0,1,2];
    this.readOnly.returnsPromise = false;
    this.readOnly.returnType = "Unknown";
    this.readPref = function() {
      return this._cursor.readPref(...arguments);
    };
    this.readPref.help = () => (i18n.__('Append readPref() to a cursor to control how the client routes the query to members of the replica set.'));
    this.readPref.help.toReplString = () => (i18n.__('Append readPref() to a cursor to control how the client routes the query to members of the replica set.'));
    this.readPref.serverVersions = [0,4.4];
    this.readPref.topologies = [0,1,2];
    this.readPref.returnsPromise = false;
    this.readPref.returnType = "Unknown";
    this.returnKey = function() {
      return this._cursor.returnKey(...arguments);
    };
    this.returnKey.help = () => (i18n.__('Modifies the cursor to return index keys rather than the documents.'));
    this.returnKey.help.toReplString = () => (i18n.__('Modifies the cursor to return index keys rather than the documents.'));
    this.returnKey.serverVersions = [3.2,4.4];
    this.returnKey.topologies = [0,1,2];
    this.returnKey.returnsPromise = false;
    this.returnKey.returnType = "Unknown";
    this.showDiskLoc = function() {
      return this._cursor.showDiskLoc(...arguments);
    };
    this.showDiskLoc.help = () => (i18n.__('The $showDiskLoc option has now been deprecated and replaced with the showRecordId field. $showDiskLoc will still be accepted for OP_QUERY stye find.'));
    this.showDiskLoc.help.toReplString = () => (i18n.__('The $showDiskLoc option has now been deprecated and replaced with the showRecordId field. $showDiskLoc will still be accepted for OP_QUERY stye find.'));
    this.showDiskLoc.serverVersions = [0,4.4];
    this.showDiskLoc.topologies = [0,1,2];
    this.showDiskLoc.returnsPromise = false;
    this.showDiskLoc.returnType = "Unknown";
    this.showRecordId = function() {
      return this._cursor.showRecordId(...arguments);
    };
    this.showRecordId.help = () => (i18n.__('Modifies the output of a query by adding a field $recordId to matching documents. $recordId is the internal key which uniquely identifies a document in a collection.'));
    this.showRecordId.help.toReplString = () => (i18n.__('Modifies the output of a query by adding a field $recordId to matching documents. $recordId is the internal key which uniquely identifies a document in a collection.'));
    this.showRecordId.serverVersions = [0,4.4];
    this.showRecordId.topologies = [0,1,2];
    this.showRecordId.returnsPromise = false;
    this.showRecordId.returnType = "Unknown";
    this.size = function() {
      return this._cursor.size(...arguments);
    };
    this.size.help = () => (i18n.__('A count of the number of documents that match the db.collection.find() query after applying any cursor.skip() and cursor.limit() methods.'));
    this.size.help.toReplString = () => (i18n.__('A count of the number of documents that match the db.collection.find() query after applying any cursor.skip() and cursor.limit() methods.'));
    this.size.serverVersions = [0,4.4];
    this.size.topologies = [0,1,2];
    this.size.returnsPromise = false;
    this.size.returnType = "Unknown";
    this.skip = function() {
      return this._cursor.skip(...arguments);
    };
    this.skip.help = () => (i18n.__('Call the cursor.skip() method on a cursor to control where MongoDB begins returning results. This approach may be useful in implementing paginated results.'));
    this.skip.help.toReplString = () => (i18n.__('Call the cursor.skip() method on a cursor to control where MongoDB begins returning results. This approach may be useful in implementing paginated results.'));
    this.skip.serverVersions = [0,4.4];
    this.skip.topologies = [0,1,2];
    this.skip.returnsPromise = false;
    this.skip.returnType = "Unknown";
    this.snapshot = function() {
      return this._cursor.snapshot(...arguments);
    };
    this.snapshot.help = () => (i18n.__('The $snapshot operator prevents the cursor from returning a document more than once because an intervening write operation results in a move of the document.'));
    this.snapshot.help.toReplString = () => (i18n.__('The $snapshot operator prevents the cursor from returning a document more than once because an intervening write operation results in a move of the document.'));
    this.snapshot.serverVersions = [0,4];
    this.snapshot.topologies = [0,1,2];
    this.snapshot.returnsPromise = false;
    this.snapshot.returnType = "Unknown";
    this.sort = function() {
      return this._cursor.sort(...arguments);
    };
    this.sort.help = () => (i18n.__('Specifies the order in which the query returns matching documents. You must apply sort() to the cursor before retrieving any documents from the database.'));
    this.sort.help.toReplString = () => (i18n.__('Specifies the order in which the query returns matching documents. You must apply sort() to the cursor before retrieving any documents from the database.'));
    this.sort.serverVersions = [0,4.4];
    this.sort.topologies = [0,1,2];
    this.sort.returnsPromise = false;
    this.sort.returnType = "Unknown";
    this.tailable = function() {
      return this._cursor.tailable(...arguments);
    };
    this.tailable.help = () => (i18n.__('Marks the cursor as tailable.'));
    this.tailable.help.toReplString = () => (i18n.__('Marks the cursor as tailable.'));
    this.tailable.serverVersions = [3.2,4.4];
    this.tailable.topologies = [0,1,2];
    this.tailable.returnsPromise = false;
    this.tailable.returnType = "Unknown";
    this.toArray = function() {
      return this._cursor.toArray(...arguments);
    };
    this.toArray.help = () => (i18n.__('The toArray() method returns an array that contains all the documents from a cursor. The method iterates completely the cursor, loading all the documents into RAM and exhausting the cursor.'));
    this.toArray.help.toReplString = () => (i18n.__('The toArray() method returns an array that contains all the documents from a cursor. The method iterates completely the cursor, loading all the documents into RAM and exhausting the cursor.'));
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
    this.help = () => (i18n.__('The database class.'));
    this.help.toReplString = () => (i18n.__('The database class.'));
    this.runCommand = function() {
      return this._mapper.runCommand(this, ...arguments);
    };
    this.runCommand.help = () => (i18n.__('Runs an arbitrary command on the database.'));
    this.runCommand.help.toReplString = () => (i18n.__('Runs an arbitrary command on the database.'));
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
    this.help = () => (i18n.__('The DeleteResult class.'));
    this.help.toReplString = () => (i18n.__('The DeleteResult class.'));
  }
}
class InsertManyResult {
  constructor(acknowleged, insertedIds) {
    this.acknowleged = acknowleged;
    this.insertedIds = insertedIds;

    this.toReplString = () => {
      return JSON.stringify(this, null, ' ');
    };
    this.help = () => (i18n.__('The InsertManyResult class.'));
    this.help.toReplString = () => (i18n.__('The InsertManyResult class.'));
  }
}
class InsertOneResult {
  constructor(acknowleged, insertedId) {
    this.acknowleged = acknowleged;
    this.insertedId = insertedId;

    this.toReplString = () => {
      return JSON.stringify(this, null, ' ');
    };
    this.help = () => (i18n.__('The InsertManyResult class.'));
    this.help.toReplString = () => (i18n.__('The InsertManyResult class.'));
  }
}
class ReplicaSet {
  constructor(_mapper) {
    this._mapper = _mapper;

    this.toReplString = () => {
      return JSON.stringify(this, null, ' ');
    };
    this.help = () => (i18n.__('The Replica Set class.'));
    this.help.toReplString = () => (i18n.__('The Replica Set class.'));
  }
}
class Shard {
  constructor(_mapper) {
    this._mapper = _mapper;

    this.toReplString = () => {
      return JSON.stringify(this, null, ' ');
    };
    this.help = () => (i18n.__('The Shard class.'));
    this.help.toReplString = () => (i18n.__('The Shard class.'));
  }
}
class ShellApi {
  constructor(_mapper) {
    this._mapper = _mapper;

    this.toReplString = () => {
      return JSON.stringify(this, null, ' ');
    };
    this.help = () => (i18n.__('Welcome to the new MongoDB Shell!'));
    this.help.toReplString = () => (i18n.__('Welcome to the new MongoDB Shell!'));
    this.use = function() {
      return this._mapper.use(this, ...arguments);
    };
    this.use.help = () => (i18n.__('!! No help defined for this method'));
    this.use.help.toReplString = () => (i18n.__('!! No help defined for this method'));
    this.use.serverVersions = [0,4.4];
    this.use.topologies = [0,1,2];
    this.use.returnsPromise = false;
    this.use.returnType = "Unknown";
    this.it = function() {
      return this._mapper.it(this, ...arguments);
    };
    this.it.help = () => (i18n.__('!! No help defined for this method'));
    this.it.help.toReplString = () => (i18n.__('!! No help defined for this method'));
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
    this.help = () => (i18n.__('The UpdateResult class.'));
    this.help.toReplString = () => (i18n.__('The UpdateResult class.'));
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

export default ShellApi;
export { AggregationCursor };
export { BulkWriteResult };
export { Collection };
export { Cursor };
export { Database };
export { DeleteResult };
export { InsertManyResult };
export { InsertOneResult };
export { ReplicaSet };
export { Shard };
export { ShellApi };
export { UpdateResult };
export { ReadPreference };
export { DBQuery };
export { ServerVersions };
export { Topologies };
