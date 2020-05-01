package com.mongodb.mongosh.service

import com.mongodb.client.MongoClient
import com.mongodb.client.MongoDatabase
import com.mongodb.client.model.CountOptions
import com.mongodb.client.model.EstimatedDocumentCountOptions
import com.mongodb.mongosh.MongoShellContext
import com.mongodb.mongosh.result.CommandException
import com.mongodb.mongosh.result.DeleteResult
import org.bson.Document
import org.graalvm.polyglot.HostAccess
import org.graalvm.polyglot.Value
import java.io.Closeable

internal class CliServiceProvider(private val client: MongoClient, private val context: MongoShellContext) : Closeable, ReadableServiceProvider {

    @HostAccess.Export
    fun runCommand(database: String, spec: Map<*, *>?): Value = promise {
        runCommandInner(database, spec)
    }

    private fun runCommandInner(database: String, spec: Map<*, *>?): Either<Document> {
        return getDatabase(database, null).map { db -> db.runCommand(toBson(spec)) }
    }

    @HostAccess.Export
    fun insertOne(database: String, coll: String, doc: Map<*, *>?, options: Map<*, *>?, dbOptions: Map<*, *>?): Value = promise {
        getDatabase(database, dbOptions).map { db ->
            db.getCollection(coll).insertOne(toBson(doc))
            context.toJs(mapOf(
                    "result" to mapOf("ok" to true),
                    "insertedId" to "UNKNOWN"))
        }
    }

    private fun getDatabase(database: String, dbOptions: Map<*, *>?): Either<MongoDatabase> {
        val db = client.getDatabase(database)
        return if (dbOptions == null) Right(db) else convert(db, dbConverters, dbDefaultConverter, dbOptions)
    }

    @HostAccess.Export
    fun deleteMany(database: String, coll: String, filter: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value = promise {
        getDatabase(database, dbOptions).map { db ->
            val result = db.getCollection(coll).deleteMany(toBson(filter))
            context.toJs(mapOf(
                    "result" to mapOf("ok" to result.wasAcknowledged()),
                    "deletedCount" to result.deletedCount))
        }
    }

    @HostAccess.Export
    fun insertMany(database: String, coll: String, docs: List<*>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value = promise {
        getDatabase(database, dbOptions).map { db ->
            db.getCollection(coll).insertMany(docs.map { toBson(it as Map<*, *>?) })
            context.toJs(mapOf(
                    "result" to mapOf("ok" to true),
                    "insertedId" to emptyList<String>()))
        }
    }

    @HostAccess.Export
    override fun aggregate(database: String, collection: String, pipeline: List<Map<*, *>>, options: Map<*, *>?, dbOptions: Map<*, *>?): AggregateCursor {
        val db = getDatabase(database, dbOptions).getOrThrow()
        val iterable = db.getCollection(collection).aggregate(pipeline.map { toBson(it) })
        if (options != null) convert(iterable, aggregateConverters, aggregateDefaultConverter, options).getOrThrow()
        return AggregateCursor(iterable, context)
    }

    @HostAccess.Export
    override fun aggregateDb(database: String, pipeline: List<Map<*, *>>, options: Map<*, *>?, dbOptions: Map<*, *>?): AggregateCursor {
        TODO("not implemented")
    }

    @HostAccess.Export
    override fun count(database: String, collection: String, query: Map<*, *>?, options: Map<*, *>?, dbOptions: Map<*, *>?): Value = promise {
        getDatabase(database, dbOptions).flatMap { db ->
            convert(CountOptions(), countOptionsConverters, countOptionsDefaultConverter, options).map { countOptions ->
                db.getCollection(collection).count(toBson(query), countOptions)
            }
        }
    }

    @HostAccess.Export
    override fun countDocuments(database: String, collection: String, filter: Map<*, *>?, options: Map<*, *>?): Value = promise {
        getDatabase(database, null).flatMap { db ->
            convert(CountOptions(), countOptionsConverters, countOptionsDefaultConverter, options).map { countOptions ->
                db.getCollection(collection).countDocuments(toBson(filter), countOptions)
            }
        }
    }

    @HostAccess.Export
    override fun distinct(database: String, collection: String, fieldName: String, filter: Map<*, *>?, options: Map<*, *>?): Value = promise<Any?> {
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun estimatedDocumentCount(database: String, collection: String, options: Map<*, *>?): Value = promise<Any?> {
        getDatabase(database, null).flatMap { db ->
            convert(EstimatedDocumentCountOptions(), estimatedCountOptionsConverters, estimatedCountOptionsDefaultConverter, options).map { countOptions ->
                db.getCollection(collection).estimatedDocumentCount(countOptions)
            }
        }
    }

    @HostAccess.Export
    override fun find(database: String, collection: String, filter: Map<*, *>?, options: Map<*, *>?): FindCursor {
        val coll = client.getDatabase(database).getCollection(collection)
        val iterable = if (filter == null) coll.find() else coll.find(toBson(filter))
        if (options != null && options["projection"] is Map<*, *>) {
            iterable.projection(toBson(options["projection"] as Map<*, *>))
        }
        return FindCursor(iterable, context)
    }

    @HostAccess.Export
    override fun getServerVersion(): Value = promise {
        runCommandInner("admin", Document("buildInfo", 1)).map { doc -> doc["version"] }
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
    override fun listCollections(database: String, filter: Map<*, *>?, options: Map<*, *>?): Value = promise {
        getDatabase(database, null).map { db ->
            val list = db.listCollections()
            if (filter != null) list.filter(toBson(filter))
            context.toJs(list)
        }
    }

    @HostAccess.Export
    override fun stats(database: String, collection: String, options: Map<*, *>?): Value = promise<Any?> {
        getDatabase(database, null).map { db ->
            db.runCommand(Document("collStats", collection))
        }
    }

    @HostAccess.Export
    fun remove(database: String, coll: String, query: Map<*, *>?, options: Map<*, *>?, dbOptions: Map<*, *>?): Value {
        val promise = getDatabase(database, dbOptions).map { db ->
            val result = db.getCollection(coll).deleteMany(toBson(query))
            DeleteResult(result.wasAcknowledged(), result.deletedCount)
        }
        return context.toJsPromise(promise)
    }

    override fun close() = client.close()

    private fun <T> promise(block: () -> Either<T>): Value {
        return context.toJsPromise(block())
    }
}

private fun toBson(options: Map<*, *>?): Document {
    val doc = Document()
    options?.entries?.forEach { (key, value) ->
        if (key !is String) return@forEach
        doc[key] = if (value is Map<*, *>) toBson(value) else value
    }
    return doc
}
