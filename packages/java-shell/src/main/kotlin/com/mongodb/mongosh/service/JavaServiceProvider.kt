package com.mongodb.mongosh.service

import com.mongodb.client.MongoClient
import com.mongodb.client.MongoDatabase
import com.mongodb.client.model.CountOptions
import com.mongodb.client.model.EstimatedDocumentCountOptions
import com.mongodb.client.model.FindOneAndReplaceOptions
import com.mongodb.client.model.ReplaceOptions
import com.mongodb.mongosh.MongoShellContext
import com.mongodb.mongosh.result.ArrayResult
import com.mongodb.mongosh.result.CommandException
import com.mongodb.mongosh.result.DeleteResult
import com.mongodb.mongosh.result.DocumentResult
import org.bson.Document
import org.graalvm.polyglot.HostAccess
import org.graalvm.polyglot.Value
import org.graalvm.polyglot.proxy.ProxyObject
import java.io.Closeable

@Suppress("NAME_SHADOWING")
internal class JavaServiceProvider(private val client: MongoClient, private val context: MongoShellContext) : Closeable, ReadableServiceProvider, WritableServiceProvider {

    @HostAccess.Export
    override fun runCommand(database: String, spec: Value): Value = promise {
        val spec = check(spec, "spec")
        getDatabase(database, null).map { db -> db.runCommand(toDocument(context, spec)) }
    }

    @HostAccess.Export
    override fun insertOne(database: String, collection: String, document: Value?, options: Value?, dbOptions: Value?): Value = promise {
        val document = check(document, "document")
        val dbOptions = check(dbOptions, "dbOptions")
        getDatabase(database, dbOptions).map { db ->
            db.getCollection(collection).insertOne(toDocument(context, document))
            context.toJs(mapOf(
                    "result" to mapOf("ok" to true),
                    "insertedId" to "UNKNOWN"))
        }
    }

    private fun toList(map: Value?): List<Document> {
        return if (map == null || map.isNull) listOf()
        else (context.extract(map) as ArrayResult).value.filterIsInstance<Document>()
    }

    @HostAccess.Export
    override fun replaceOne(database: String, collection: String, filter: Value, replacement: Value, options: Value?, dbOptions: Value?): Value = promise {
        val filter = check(filter, "filter")
        val replacement = check(replacement, "replacement")
        val options = check(options, "options")
        val dbOptions = check(dbOptions, "dbOptions")
        getDatabase(database, dbOptions).flatMap { db ->
            convert(context, ReplaceOptions(), replaceOptionsConverters, replaceOptionsDefaultConverters, options).map { options ->
                val res = db.getCollection(collection).replaceOne(toDocument(context, filter), toDocument(context, replacement), options)
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
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun findAndModify(database: String, collection: String, filter: Value?, sort: Value?, update: Value?, options: Value?, dbOptions: Value?) {
        throw NotImplementedError()
    }

    @HostAccess.Export
    override fun updateOne(database: String, collection: String, filter: Value, update: Value, options: Value?, dbOptions: Value?): Value = promise<Any?> {
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun save(database: String, collection: String, document: Value, options: Value?, dbOptions: Value?): Value = promise<Any?> {
        Left(NotImplementedError())
    }

    @HostAccess.Export
    private fun getDatabase(database: String, dbOptions: Value?): Either<MongoDatabase> {
        val db = client.getDatabase(database)
        return if (dbOptions == null) Right(db) else convert(context, db, dbConverters, dbDefaultConverter, dbOptions)
    }

    @HostAccess.Export
    override fun dropDatabase(database: String, writeConcern: Value?, dbOptions: Value?): Value = promise<Any?> {
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun bulkWrite(database: String, collection: String, requests: Value, options: Value?, dbOptions: Value?): Value = promise<Any?> {
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun deleteMany(database: String, collection: String, filter: Value, options: Value?, dbOptions: Value?): Value = promise {
        val filter = check(filter, "filter")
        val dbOptions = check(dbOptions, "dbOptions")
        getDatabase(database, dbOptions).map { db ->
            val result = db.getCollection(collection).deleteMany(toDocument(context, filter))
            context.toJs(mapOf(
                    "result" to mapOf("ok" to result.wasAcknowledged()),
                    "deletedCount" to result.deletedCount))
        }
    }

    @HostAccess.Export
    override fun deleteOne(database: String, collection: String, filter: Value, options: Value?, dbOptions: Value?): Value = promise<Any?> {
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun findOneAndDelete(database: String, collection: String, filter: Value, options: Value?, dbOptions: Value?): Value = promise<Any?> {
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun findOneAndReplace(database: String, collection: String, filter: Value, replacement: Value, options: Value?): Value = promise {
        val filter = check(filter, "filter")
        val replacement = check(replacement, "replacement")
        val options = check(options, "options")
        getDatabase(database, null).flatMap { db ->
            convert(context, FindOneAndReplaceOptions(), findOneAndReplaceOptionsConverters, findOneAndReplaceOptionsDefaultConverters, options)
                    .map { options ->
                        val res = db.getCollection(collection).findOneAndReplace(toDocument(context, filter), toDocument(context, replacement), options)
                        ProxyObject.fromMap(mapOf("value" to res))
                    }
        }
    }

    @HostAccess.Export
    override fun findOneAndUpdate(database: String, collection: String, filter: Value, update: Value, options: Value?, dbOptions: Value?): Value = promise<Any?> {
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun insertMany(database: String, collection: String, docs: Value?, options: Value?, dbOptions: Value?): Value = promise {
        val dbOptions = check(dbOptions, "dbOptions")
        getDatabase(database, dbOptions).map { db ->
            db.getCollection(collection).insertMany(toList(docs))
            context.toJs(mapOf(
                    "result" to mapOf("ok" to true),
                    "insertedId" to emptyList<String>()))
        }
    }

    @HostAccess.Export
    override fun aggregate(database: String, collection: String, pipeline: List<Value>, options: Value?, dbOptions: Value?): AggregateCursor {
        val options = check(options, "options")
        val dbOptions = check(dbOptions, "dbOptions")
        val db = getDatabase(database, dbOptions).getOrThrow()
        val iterable = db.getCollection(collection).aggregate(pipeline.map { toDocument(context, it) })
        if (options != null) convert(context, iterable, aggregateConverters, aggregateDefaultConverter, options).getOrThrow()
        return AggregateCursor(iterable, context)
    }

    @HostAccess.Export
    override fun aggregateDb(database: String, pipeline: List<Value>, options: Value?, dbOptions: Value?): AggregateCursor {
        val options = check(options, "options")
        val dbOptions = check(dbOptions, "dbOptions")
        val db = getDatabase(database, dbOptions).getOrThrow()
        val iterable = db.aggregate(pipeline.map { toDocument(context, it) })
        if (options != null) convert(context, iterable, aggregateConverters, aggregateDefaultConverter, options).getOrThrow()
        return AggregateCursor(iterable, context)
    }

    @HostAccess.Export
    override fun count(database: String, collection: String, query: Value?, options: Value?, dbOptions: Value?): Value = promise {
        val query = check(query, "query")
        val options = check(options, "options")
        val dbOptions = check(dbOptions, "dbOptions")
        getDatabase(database, dbOptions).flatMap { db ->
            convert(context, CountOptions(), countOptionsConverters, countOptionsDefaultConverter, options).map { countOptions ->
                @Suppress("DEPRECATION")
                db.getCollection(collection).count(toDocument(context, query), countOptions)
            }
        }
    }

    @HostAccess.Export
    override fun countDocuments(database: String, collection: String, filter: Value?, options: Value?): Value = promise {
        val filter = check(filter, "filter")
        val options = check(options, "options")
        getDatabase(database, null).flatMap { db ->
            convert(context, CountOptions(), countOptionsConverters, countOptionsDefaultConverter, options).map { countOptions ->
                db.getCollection(collection).countDocuments(toDocument(context, filter), countOptions)
            }
        }
    }

    @HostAccess.Export
    override fun distinct(database: String, collection: String, fieldName: String, filter: Value?, options: Value?): Value = promise<Any?> {
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun estimatedDocumentCount(database: String, collection: String, options: Value?): Value = promise<Any?> {
        val options = check(options, "options")
        getDatabase(database, null).flatMap { db ->
            convert(context, EstimatedDocumentCountOptions(), estimatedCountOptionsConverters, estimatedCountOptionsDefaultConverter, options).map { countOptions ->
                db.getCollection(collection).estimatedDocumentCount(countOptions)
            }
        }
    }

    @HostAccess.Export
    override fun find(database: String, collection: String, filter: Value?, options: Value?): FindCursor {
        val filter = check(filter, "filter")
        val options = check(options, "options")
        val coll = client.getDatabase(database).getCollection(collection)
        val iterable = if (filter == null) coll.find() else coll.find(toDocument(context, filter))
        val projection = options?.getMember("projection")
        if (projection != null) iterable.projection(toDocument(context, projection))
        return FindCursor(iterable, context)
    }

    private fun check(value: Value?, fieldName: String): Value? {
        if (value == null || value.isNull) return null
        if (!value.hasMembers()) {
            throw IllegalArgumentException("$fieldName should be a map: $value")
        }
        return value
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
        val filter = check(filter, "filter")
        getDatabase(database, null).map { db ->
            val list = db.listCollections()
            if (filter != null) list.filter(toDocument(context, filter))
            context.toJs(list)
        }
    }

    @HostAccess.Export
    override fun stats(database: String, collection: String, options: Value?): Value = promise<Any?> {
        getDatabase(database, null).map { db ->
            db.runCommand(Document("collStats", collection))
        }
    }

    @HostAccess.Export
    override fun remove(database: String, collection: String, query: Value, options: Value?, dbOptions: Value?): Value {
        val query = check(query, "query")
        val dbOptions = check(dbOptions, "dbOptions")
        val promise = getDatabase(database, dbOptions).map { db ->
            val result = db.getCollection(collection).deleteMany(toDocument(context, query))
            DeleteResult(result.wasAcknowledged(), result.deletedCount)
        }
        return context.toJsPromise(promise)
    }

    @HostAccess.Export
    override fun convertToCapped(database: String, collection: String, size: Number, options: Value?): Value = promise<Any?> {
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun createIndexes(database: String, collection: String, indexSpecs: Value?, options: Value?, dbOptions: Value?): Value = promise<Any?> {
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun dropIndexes(database: String, collection: String, indexes: String, commandOptions: Value?, dbOptions: Value?): Value = promise<Any?> {
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun dropIndexes(database: String, collection: String, indexes: Value?, commandOptions: Value?, dbOptions: Value?): Value = promise<Any?> {
        Left(NotImplementedError())
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
