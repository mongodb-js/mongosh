
```json
"collection": {
  "description": "",
  "help": {
    "aggregate": "https://docs.mongodb.com/manual/reference/method/db.collection.aggregate

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

        Returns: A cursor to the documents produced by the final stage of the aggregation pipeline operation, or if you include the explain option, the document that provides details on the processing of the aggregation operation. If the pipeline includes the $out operator, aggregate() returns an empty cursor.",
    "bulk-write": "https://docs.mongodb.com/manual/reference/method/db.collection.bulkWrite

        Performs multiple write operations with controls for order of execution.

        db.collection.bulkWrite(operations, options)

        operations <array> An array of bulkWrite() write operations.
        options <document>
            writeConcern <document>
            ordered	<boolean>

        Returns: A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled.
                 A count for each write operation.
                 An array containing an _id for each successfully inserted or upserted documents.",
    "count-documents": "https://docs.mongodb.com/manual/reference/method/db.collection.countDocuments

        Returns the count of documents that match the query for a collection or view.

        db.collection.countDocuments(query, options)

        query <document> The query selection criteria. To count all documents, specify an empty document.
        options <document>
            limit <integer>	Optional. The maximum number of documents to count.
            skip <integer>	Optional. The number of documents to skip before counting.
            hint <string or document>	Optional. An index name or the index specification to use for the query.
            maxTimeMS <integer>	Optional. The maximum amount of time to allow the count to run.",
    "count": "https://docs.mongodb.com/manual/reference/method/db.collection.count

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
            collation <document>",
    "delete-many": "https://docs.mongodb.com/manual/reference/method/db.collection.deleteMany

        Removes all documents that match the filter from a collection.

        db.collection.deleteMany()

        filter	<document> Specifies deletion criteria using query operators.
        options <document>
            writeConcern <document>
            collation <document>

        Returns: A document containing:
            A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled
            deletedCount containing the number of deleted documents",
    "delete-one": "https://docs.mongodb.com/manual/reference/method/db.collection.deleteOne

        Removes a single document from a collection.

        db.collection.deleteOne(filter, options)

        filter <document> Specifies deletion criteria using query operators.
        options <document>
            writeConcern <document>
            collation <document>

        Returns:	A document containing:
            A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled
            deletedCount containing the number of deleted documents",
    "distinct": "https://docs.mongodb.com/manual/reference/method/db.collection.distinct

        Finds the distinct values for a specified field across a single collection or view and returns the results in an array.

        db.collection.distinct(field, query, options)

        field <string> The field for which to return distinct values.
        query <document> A query that specifies the documents from which to retrieve the distinct values.
        options	<document>
            collation <document>

        Returns: The results in an array.",
   "estimated-document-count": "https://docs.mongodb.com/manual/reference/method/db.collection.estimatedDocumentCount

        Returns the count of all documents in a collection or view.

        db.collection.estimatedDocumentCount( <options> )

        options	<document>
            maxTimeMS <integer> Optional. The maximum amount of time to allow the count to run.

        Returns: count as an integer",
    "find": "https://docs.mongodb.com/manual/reference/method/db.collection.find

        Selects documents in a collection or view.

        db.collection.find(query, projection)

        query <document> Optional. Specifies selection filter using query operators. To return all documents in a collection, omit this parameter or pass an empty document ({}).
        projection <document> Optional. Specifies the fields to return in the documents that match the query filter. To return all fields in the matching documents, omit this parameter.

        Returns: A cursor to the documents that match the query criteria.",
    "find-and-modify": "https://docs.mongodb.com/manual/reference/method/db.collection.findAndModify

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

        Returns: For remove operations, if the query matches a document, findAndModify() returns the removed document. If the query does not match a document to remove, findAndModify() returns null.",
    "find-one": "https://docs.mongodb.com/manual/reference/method/db.collection.findOne

        Selects documents in a collection or view.

        db.collection.findOne(query, projection)

        query <document> Optional. Specifies selection filter using query operators. To return all documents in a collection, omit this parameter or pass an empty document ({}).
        projection <document> Optional. Specifies the fields to return in the documents that match the query filter. To return all fields in the matching documents, omit this parameter.

        Returns: A cursor to the documents that match the query criteria.",
    "find-one-and-delete": "https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndDelete

        Deletes a single document based on the filter and sort criteria, returning the deleted document.

        db.collection.findOneAndDelete(filter, options)

        filter <document> The selection criteria for the update.
        options <document>
            projection <document>
            sort <document>
            maxTimeMS <number>
            collation <document>

        Returns: Returns the deleted document.",
    "find-one-and-replace": "https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndReplace

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

        Returns: Returns either the original document or, if returnNewDocument: true, the replacement document.",
    "find-one-and-update": "https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndUpdate

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

        Returns: Returns either the original document or, if returnNewDocument: true, the updated document.",
    "insert": "https://docs.mongodb.com/manual/reference/method/db.collection.insert

        Inserts a document or documents into a collection.

        db.collection.insert(document, options)

        document <document or array> A document or array of documents to insert into the collection.
        options <document>
            writeConcern: <document>
            ordered: <boolean>",
    "insert-many": "https://docs.mongodb.com/manual/reference/method/db.collection.insertMany

        Inserts multiple documents into a collection.

        db.collection.insertMany(documents, options)

        documents <document> An array of documents to insert into the collection.
        options <document>
            writeConcern <document>
            ordered <boolean>

        Returns: A document containing:
            A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled
            An array of _id for each successfully inserted documents",
    "insert-one": "https://docs.mongodb.com/manual/reference/method/db.collection.insertOne

        Inserts a document into a collection.

        db.collection.insertOne(document, options)

        document <document> A document to insert into the collection.
        options <document>
            writeConcern <document>

        Returns: A document containing:
            A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled.
            A field insertedId with the _id value of the inserted document.",
    "is-capped": "https://docs.mongodb.com/manual/reference/method/db.collection.isCapped

        db.collection.isCapped()

        Returns true if the collection is a capped collection, otherwise returns false.",
    "remove": "https://docs.mongodb.com/manual/reference/method/db.collection.remove

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

        Returns: The status of the operation.",
    "save": "https://docs.mongodb.com/manual/reference/method/db.collection.save

        Updates an existing document or inserts a new document, depending on its document parameter.

        db.collection.save(document, options)

        document <document> A document to save to the collection.
        options <document>
            writeConcern <document>

        Returns: A WriteResult object that contains the status of the operation.
        Changed in version 2.6: The save() returns an object that contains the status of the operation.",
    "replace-one": "https://docs.mongodb.com/manual/reference/method/db.collection.replaceOne

        Replaces a single document within the collection based on the filter.

        db.collection.replaceOne(filter, replacement, options)

        filter <document> The selection criteria for the update.
        replacement	<document> The replacement document.
        options <document>
            upsert <boolean>
            writeConcern <document>
            collation <document>
            hint <document|string>",
    "update": "https://docs.mongodb.com/manual/reference/method/db.collection.update

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
             hint  <document|string>        // Available starting in MongoDB 4.2",
    "update-many": "https://docs.mongodb.com/manual/reference/method/db.collection.updateMany

        Updates all documents that match the specified filter for a collection.

        db.collection.updateMany(filter, update, options)

        filter <document> The selection criteria for the update.
        update <document> The modifications to apply.
        options <document>
            upsert <boolean>
            writeConcern <document>
            collation <document>
            arrayFilters [ <filterdocument1>, ... ]
            hint  <document|string>        // Available starting in MongoDB 4.2.1",
    "update-one": "https://docs.mongodb.com/manual/reference/method/db.collection.updateOne

        Updates a single document within the collection based on the filter.

        db.collection.updateOne(filter, update, options)

        filter <document> The selection criteria for the update.
        update <document> The modifications to apply.
        options <document>
            upsert <boolean>
            writeConcern <document>
            collation <document>
            arrayFilters [ <filterdocument1>, ... ]
            hint  <document|string>        // Available starting in MongoDB 4.2.1"
  }
},
```
