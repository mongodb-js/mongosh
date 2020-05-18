package com.mongodb.mongosh.service

import com.mongodb.client.MongoClient
import com.mongodb.client.MongoDatabase
import com.mongodb.client.model.*
import com.mongodb.client.result.UpdateResult
import com.mongodb.mongosh.MongoShellContext
import com.mongodb.mongosh.result.ArrayResult
import com.mongodb.mongosh.result.CommandException
import com.mongodb.mongosh.result.DeleteResult
import com.mongodb.mongosh.result.DocumentResult
import org.bson.Document
import org.graalvm.polyglot.HostAccess
import org.graalvm.polyglot.Value
import java.io.Closeable

@Suppress("NAME_SHADOWING")
internal class JavaServiceProvider(private val client: MongoClient, private val context: MongoShellContext) : Closeable, ReadableServiceProvider, WritableServiceProvider {

    @HostAccess.Export
    override fun runCommand(database: String, spec: Value): Value = promise {
        getDatabase(database, null).map { db ->
            if (spec.isString) {
                context.toJs(db.runCommand(Document(spec.asString(), 1)))
            } else {
                context.toJs(db.runCommand(toDocument(spec, "spec")))
            }
        }
    }

    @HostAccess.Export
    override fun insertOne(database: String, collection: String, document: Value?, options: Value?, dbOptions: Value?): Value = promise {
        val document = toDocument(document, "document")
        val dbOptions = toDocument(dbOptions, "dbOptions")
        getDatabase(database, dbOptions).map { db ->
            db.getCollection(collection).insertOne(document)
            context.toJs(mapOf(
                    "result" to mapOf("ok" to true),
                    "insertedId" to "UNKNOWN"))
        }
    }

    @HostAccess.Export
    override fun replaceOne(database: String, collection: String, filter: Value, replacement: Value, options: Value?, dbOptions: Value?): Value = promise {
        val filter = toDocument(filter, "filter")
        val replacement = toDocument(replacement, "replacement")
        val options = toDocument(options, "options")
        val dbOptions = toDocument(dbOptions, "dbOptions")
        getDatabase(database, dbOptions).flatMap { db ->
            convert(ReplaceOptions(), replaceOptionsConverters, replaceOptionsDefaultConverters, options).map { options ->
                val res = db.getCollection(collection).replaceOne(filter, replacement, options)
                context.toJs(mapOf(
                        "result" to mapOf("ok" to res.wasAcknowledged()),
                        "matchedCount" to res.matchedCount,
                        "modifiedCount" to res.modifiedCount,
                        "upsertedCount" to if (res.upsertedId == null) 0 else 1,
                        "upsertedId" to res.upsertedId
                ))
            }
        }
    }

    @HostAccess.Export
    override fun updateMany(database: String, collection: String, filter: Value, update: Value, options: Value?, dbOptions: Value?): Value = promise<Any?> {
        val filter = toDocument(filter, "filter")
        val options = toDocument(options, "options")
        getDatabase(database, null).flatMap { db ->
            convert(UpdateOptions(), updateConverters, updateDefaultConverter, options).flatMap { updateOptions ->
                when {
                    update.hasArrayElements() -> {
                        val updatePipeline = toList(update, "update")
                        if (updatePipeline == null || updatePipeline.any { it !is Document }) Left<UpdateResult>(IllegalArgumentException("updatePipeline must be a list of objects"))
                        else Right(db.getCollection(collection).updateMany(filter, updatePipeline.filterIsInstance<Document>(), updateOptions))
                    }
                    update.hasMembers() -> Right(db.getCollection(collection).updateMany(filter, toDocument(update, "update"), updateOptions))
                    else -> Left<UpdateResult>(IllegalArgumentException("updatePipeline must be a list or object"))
                }.map { res ->
                    context.toJs(mapOf("result" to mapOf("ok" to res.wasAcknowledged()),
                            "matchedCount" to res.matchedCount,
                            "modifiedCount" to res.modifiedCount,
                            "upsertedCount" to if (res.upsertedId == null) 0 else 1,
                            "upsertedId" to res.upsertedId))
                }
            }
        }
    }

    @HostAccess.Export
    override fun findAndModify(database: String, collection: String, filter: Value?, sort: Value?, update: Value?, options: Value?, dbOptions: Value?) {
        throw NotImplementedError()
    }

    @HostAccess.Export
    override fun updateOne(database: String, collection: String, filter: Value, update: Value, options: Value?): Value {
        return updateOne(database, collection, filter, update, options, null)
    }

    @HostAccess.Export
    override fun updateOne(database: String, collection: String, filter: Value, update: Value, options: Value?, dbOptions: Value?): Value = promise<Any?> {
        val filter = toDocument(filter, "filter")
        val options = toDocument(options, "options")
        val dbOptions = toDocument(dbOptions, "dbOptions")
        getDatabase(database, dbOptions).flatMap { db ->
            convert(UpdateOptions(), updateConverters, updateDefaultConverter, options).map { updateOptions ->
                val coll = db.getCollection(collection)
                val res = if (update.hasArrayElements()) {
                    val pipeline = toList(update, "update")?.map { it as Document }
                    coll.updateOne(filter, pipeline, updateOptions)
                } else coll.updateOne(filter, toDocument(update, "update"), updateOptions)
                context.toJs(mapOf("result" to mapOf("ok" to res.wasAcknowledged()),
                        "matchedCount" to res.matchedCount,
                        "modifiedCount" to res.modifiedCount,
                        "upsertedCount" to if (res.upsertedId == null) 0 else 1,
                        "upsertedId" to res.upsertedId
                ))
            }
        }
    }

    @HostAccess.Export
    override fun save(database: String, collection: String, document: Value, options: Value?, dbOptions: Value?): Value = promise<Any?> {
        Left(NotImplementedError())
    }

    @HostAccess.Export
    private fun getDatabase(database: String, dbOptions: Document?): Either<MongoDatabase> {
        val db = client.getDatabase(database)
        return if (dbOptions == null) Right(db) else convert(db, dbConverters, dbDefaultConverter, dbOptions)
    }

    @HostAccess.Export
    override fun dropDatabase(database: String, writeConcern: Value?, dbOptions: Value?): Value = promise<Any?> {
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun bulkWrite(database: String, collection: String, requests: Value, options: Value?, dbOptions: Value?): Value = promise<Any?> {
        val requests = toList(requests, "requests")
        if (requests == null || requests.any { it !is Document }) return@promise Left(IllegalArgumentException("requests must be a list of objects"))
        val options = toDocument(options, "options")
        val dbOptions = toDocument(dbOptions, "dbOptions")
        getDatabase(database, dbOptions).flatMap { db ->
            convert(BulkWriteOptions(), bulkWriteOptionsConverters, bulkWriteOptionsDefaultConverter, options).flatMap { options ->
                val writeModels = requests.map { getWriteModel(it as Document) }
                unwrap(writeModels).map { requests ->
                    val result = db.getCollection(collection).bulkWrite(requests, options)
                    context.toJs(mapOf(
                            "result" to mapOf("ok" to result.wasAcknowledged()),
                            "insertedCount" to result.insertedCount,
                            "insertedIds" to "UNKNOWN",
                            "matchedCount" to result.matchedCount,
                            "modifiedCount" to result.modifiedCount,
                            "deletedCount" to result.deletedCount,
                            "upsertedCount" to result.upserts.size,
                            "upsertedIds" to result.upserts.map { it.id }))
                }
            }
        }
    }

    private fun <T> unwrap(l: List<Either<T>>): Either<List<T>> {
        return Right(l.map {
            when (it) {
                is Left -> return Left(it.value)
                is Right -> it.value
            }
        })
    }

    private fun getWriteModel(model: Document): Either<WriteModel<Document>?> {
        if (model.keys.size != 1) return Left(IllegalArgumentException())
        val key = model.keys.first()
        val innerDoc: Document = model[key] as? Document
                ?: return Left(IllegalArgumentException("Inner object must be an instance of object. $model"))
        return when (key) {
            "insertOne" -> {
                val doc = innerDoc["document"] as? Document
                        ?: return Left(IllegalArgumentException("No property 'document' $innerDoc"))
                Right(InsertOneModel(doc))
            }
            "deleteOne" -> {
                val filter = innerDoc["filter"] as? Document
                        ?: return Left(IllegalArgumentException("No property 'filter' $innerDoc"))
                val collationDoc = innerDoc["collation"] as? Document ?: Document()
                convert(Collation.builder(), collationConverters, collationDefaultConverter, collationDoc).map { collation ->
                    DeleteOneModel<Document>(filter, DeleteOptions().collation(collation.build()))
                }
            }
            else -> Left(IllegalArgumentException("Unknown bulk write operation $model"))
        }
    }

    @HostAccess.Export
    override fun deleteMany(database: String, collection: String, filter: Value, options: Value?, dbOptions: Value?): Value = promise {
        val filter = toDocument(filter, "filter")
        val options = toDocument(options, "options")
        val dbOptions = toDocument(dbOptions, "dbOptions")
        getDatabase(database, dbOptions).flatMap { db ->
            convert(DeleteOptions(), deleteConverters, deleteDefaultConverter, options).map { deleteOptions ->
                val result = db.getCollection(collection).deleteMany(filter, deleteOptions)
                context.toJs(mapOf(
                        "result" to mapOf("ok" to result.wasAcknowledged()),
                        "deletedCount" to result.deletedCount))
            }
        }
    }

    @HostAccess.Export
    override fun deleteOne(database: String, collection: String, filter: Value, options: Value?, dbOptions: Value?): Value = promise<Any?> {
        val filter = toDocument(filter, "filter")
        val options = toDocument(options, "options")
        val dbOptions = toDocument(dbOptions, "dbOptions")
        getDatabase(database, dbOptions).flatMap { db ->
            convert(DeleteOptions(), deleteConverters, deleteDefaultConverter, options).map { deleteOptions ->
                val result = db.getCollection(collection).deleteOne(filter, deleteOptions)
                context.toJs(mapOf(
                        "result" to mapOf("ok" to result.wasAcknowledged()),
                        "deletedCount" to result.deletedCount))
            }
        }
    }

    @HostAccess.Export
    override fun findOneAndDelete(database: String, collection: String, filter: Value, options: Value?): Value = promise<Any?> {
        val filter = toDocument(filter, "filter")
        val options = toDocument(options, "options")
        getDatabase(database, null).flatMap { db ->
            convert(FindOneAndDeleteOptions(), findOneAndDeleteConverters, findOneAndDeleteDefaultConverter, options).map { options ->
                val res = db.getCollection(collection).findOneAndDelete(filter, options)
                context.toJs(mapOf("value" to res))
            }
        }
    }

    @HostAccess.Export
    override fun findOneAndReplace(database: String, collection: String, filter: Value, replacement: Value, options: Value?): Value = promise {
        val filter = toDocument(filter, "filter")
        val replacement = toDocument(replacement, "replacement")
        val options = toDocument(options, "options")
        getDatabase(database, null).flatMap { db ->
            convert(FindOneAndReplaceOptions(), findOneAndReplaceOptionsConverters, findOneAndReplaceOptionsDefaultConverters, options)
                    .map { options ->
                        val res = db.getCollection(collection).findOneAndReplace(filter, replacement, options)
                        context.toJs(mapOf("value" to res))
                    }
        }
    }

    @HostAccess.Export
    override fun findOneAndUpdate(database: String, collection: String, filter: Value, update: Value, options: Value?): Value = promise<Any?> {
        val filter = toDocument(filter, "filter")
        val update = toDocument(update, "update")
        val options = toDocument(options, "options")
        getDatabase(database, null).flatMap { db ->
            convert(FindOneAndUpdateOptions(), findOneAndUpdateConverters, findOneAndUpdateDefaultConverter, options).map { options ->
                val res = db.getCollection(collection).findOneAndUpdate(filter, update, options)
                context.toJs(mapOf("value" to res))
            }
        }

    }

    @HostAccess.Export
    override fun insertMany(database: String, collection: String, docs: Value?, options: Value?, dbOptions: Value?): Value = promise<Any?> {
        val dbOptions = toDocument(dbOptions, "dbOptions")
        val docs = toList(docs, "docs")
        if (docs == null || docs.any { it !is Document }) return@promise Left(IllegalArgumentException("docs must be a list of objects"))
        getDatabase(database, dbOptions).map { db ->
            db.getCollection(collection).insertMany(docs.filterIsInstance<Document>())
            context.toJs(mapOf(
                    "result" to mapOf("ok" to true),
                    "insertedId" to emptyList<String>()))
        }
    }

    @HostAccess.Export
    override fun aggregate(database: String, collection: String, pipeline: Value?, options: Value?, dbOptions: Value?): AggregateCursor {
        val pipeline = toList(pipeline, "pipeline")
        if (pipeline == null || pipeline.any { it !is Document }) throw IllegalArgumentException("pipeline must be a list of objects")
        val options = toDocument(options, "options")
        val dbOptions = toDocument(dbOptions, "dbOptions")
        val db = getDatabase(database, dbOptions).getOrThrow()
        val iterable = db.getCollection(collection).aggregate(pipeline.filterIsInstance<Document>())
        if (options != null) convert(iterable, aggregateConverters, aggregateDefaultConverter, options).getOrThrow()
        return AggregateCursor(iterable, context)
    }

    @HostAccess.Export
    override fun aggregateDb(database: String, pipeline: Value?, options: Value?, dbOptions: Value?): AggregateCursor {
        val pipeline = toList(pipeline, "pipeline")
        if (pipeline == null || pipeline.any { it !is Document }) throw IllegalArgumentException("pipeline must be a list of objects")
        val options = toDocument(options, "options")
        val dbOptions = toDocument(dbOptions, "dbOptions")
        val db = getDatabase(database, dbOptions).getOrThrow()
        val iterable = db.aggregate(pipeline.filterIsInstance<Document>())
        if (options != null) convert(iterable, aggregateConverters, aggregateDefaultConverter, options).getOrThrow()
        return AggregateCursor(iterable, context)
    }

    @HostAccess.Export
    override fun count(database: String, collection: String, query: Value?, options: Value?, dbOptions: Value?): Value = promise {
        val query = toDocument(query, "query")
        val options = toDocument(options, "options")
        val dbOptions = toDocument(dbOptions, "dbOptions")
        getDatabase(database, dbOptions).flatMap { db ->
            convert(CountOptions(), countOptionsConverters, countOptionsDefaultConverter, options).map { countOptions ->
                @Suppress("DEPRECATION")
                db.getCollection(collection).count(query, countOptions)
            }
        }
    }

    @HostAccess.Export
    override fun countDocuments(database: String, collection: String, filter: Value?, options: Value?): Value = promise {
        val filter = toDocument(filter, "filter")
        val options = toDocument(options, "options")
        getDatabase(database, null).flatMap { db ->
            convert(CountOptions(), countOptionsConverters, countOptionsDefaultConverter, options).map { countOptions ->
                db.getCollection(collection).countDocuments(filter, countOptions)
            }
        }
    }

    @HostAccess.Export
    override fun distinct(database: String, collection: String, fieldName: String, filter: Value?, options: Value?): Value = promise<Any?> {
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun estimatedDocumentCount(database: String, collection: String, options: Value?): Value = promise<Any?> {
        val options = toDocument(options, "options")
        getDatabase(database, null).flatMap { db ->
            convert(EstimatedDocumentCountOptions(), estimatedCountOptionsConverters, estimatedCountOptionsDefaultConverter, options).map { countOptions ->
                db.getCollection(collection).estimatedDocumentCount(countOptions)
            }
        }
    }

    @HostAccess.Export
    override fun find(database: String, collection: String, filter: Value?, options: Value?): FindCursor {
        val filter = toDocument(filter, "filter")
        val options = toDocument(options, "options")
        val coll = client.getDatabase(database).getCollection(collection)
        val iterable = if (filter == null) coll.find() else coll.find(filter)
        val projection = options?.get("projection")?.let { it as Document }
        if (projection != null) iterable.projection(projection)
        return FindCursor(iterable, context)
    }

    private fun toDocument(value: Value?, fieldName: String): Document? {
        if (value == null || value.isNull) return null
        if (!value.hasMembers()) {
            throw IllegalArgumentException("$fieldName should be an object: $value")
        }
        return (context.extract(value) as DocumentResult).value
    }

    private fun toList(value: Value?, fieldName: String): List<Any?>? {
        if (value == null || value.isNull) return null
        if (!value.hasArrayElements()) {
            throw IllegalArgumentException("$fieldName should be a list: $value")
        }
        return (context.extract(value) as ArrayResult).value
    }

    @HostAccess.Export
    override fun getServerVersion(): Value = promise {
        getDatabase("admin", null)
                .map { db -> db.runCommand(Document("buildInfo", 1)) }
                .map { doc -> doc["version"] }
    }

    @HostAccess.Export
    override fun listDatabases(database: String): Value = promise {
        Right(context.toJs(mapOf("databases" to client.listDatabases())))
    }

    @HostAccess.Export
    override fun isCapped(database: String, collection: String): Value = promise {
        getDatabase(database, null).flatMap { db ->
            val doc = db.runCommand(Document("collStats", collection))
            if (doc.containsKey("capped") && doc["capped"] is Boolean) Right<Boolean>(doc["capped"] as Boolean)
            else Left<Boolean>(CommandException("Cannot find boolean property 'capped'. Response $doc", ""))
        }
    }

    @HostAccess.Export
    override fun getIndexes(database: String, collection: String): Value = promise {
        getDatabase(database, null).map { db ->
            context.toJs(db.getCollection(collection).listIndexes())
        }
    }

    @HostAccess.Export
    override fun listCollections(database: String, filter: Value?, options: Value?): Value = promise {
        val filter = toDocument(filter, "filter")
        getDatabase(database, null).map { db ->
            val list = db.listCollections()
            if (filter != null) list.filter(filter)
            context.toJs(list)
        }
    }

    @HostAccess.Export
    override fun stats(database: String, collection: String, options: Value?): Value = promise<Any?> {
        getDatabase(database, null).map { db ->
            context.toJs(db.runCommand(Document("collStats", collection)))
        }
    }

    @HostAccess.Export
    override fun remove(database: String, collection: String, query: Value, options: Value?, dbOptions: Value?): Value {
        val query = toDocument(query, "query")
        val dbOptions = toDocument(dbOptions, "dbOptions")
        val promise = getDatabase(database, dbOptions).map { db ->
            val result = db.getCollection(collection).deleteMany(query)
            DeleteResult(result.wasAcknowledged(), result.deletedCount)
        }
        return context.toJsPromise(promise)
    }

    @HostAccess.Export
    override fun convertToCapped(database: String, collection: String, size: Number, options: Value?): Value = promise<Any?> {
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun createIndexes(database: String, collection: String, indexSpecs: Value?): Value = promise<Any?> {
        val indexSpecs = toList(indexSpecs, "indexSpecs") ?: emptyList()
        if (indexSpecs.any { it !is Document }) throw IllegalArgumentException("Index specs must be a list of documents. Got $indexSpecs")
        getDatabase(database, null).flatMap { db ->
            val convertedIndexes = indexSpecs.map { spec ->
                convert(IndexModel(Document()), indexModelConverters, indexModelDefaultConverter, spec as Document)
            }
            val indexes = unwrap(convertedIndexes)
            indexes.map { indexes ->
                context.toJs(db.getCollection(collection).createIndexes(indexes))
            }
        }
    }

    @HostAccess.Export
    override fun dropIndexes(database: String, collection: String, indexes: Value?): Value = promise<Any?> {
        val indexes = if (indexes != null && !indexes.isNull) indexes else throw IllegalArgumentException("Indexes parameter must not be null")
        val indexesList = if (indexes.hasArrayElements()) toList(indexes, "indexes")!!
        else listOf(context.extract(indexes).value)
        getDatabase(database, null).map { db ->
            val coll = db.getCollection(collection)
            indexesList.forEach { index ->
                when (index) {
                    is String -> coll.dropIndex(index)
                    is Document -> coll.dropIndex(index)
                    else -> throw IllegalArgumentException("Unknown index specification $index")
                }
            }

        }
    }

    @HostAccess.Export
    override fun reIndex(database: String, collection: String, options: Value?, dbOptions: Value?): Value = promise<Any?> {
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun dropCollection(database: String, collection: String): Value = promise {
        getDatabase(database, null).map { db ->
            db.getCollection(collection).drop()
        }
    }

    @HostAccess.Export
    override fun renameCollection(database: String, oldName: String, newName: String, options: Value?, dbOptions: Value?): Value = promise<Any?> {
        Left(NotImplementedError())
    }

    override fun close() = client.close()

    private fun <T> promise(block: () -> Either<T>): Value {
        return context.toJsPromise(block())
    }
}
