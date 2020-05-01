package com.mongodb.mongosh.service

import com.mongodb.client.MongoClient
import com.mongodb.client.MongoDatabase
import com.mongodb.client.model.CountOptions
import com.mongodb.client.model.EstimatedDocumentCountOptions
import com.mongodb.client.model.FindOneAndReplaceOptions
import com.mongodb.client.model.ReplaceOptions
import com.mongodb.mongosh.MongoShellContext
import com.mongodb.mongosh.result.CommandException
import com.mongodb.mongosh.result.DeleteResult
import org.bson.Document
import org.graalvm.polyglot.HostAccess
import org.graalvm.polyglot.Value
import org.graalvm.polyglot.proxy.ProxyObject
import java.io.Closeable

internal class JavaServiceProvider(private val client: MongoClient, private val context: MongoShellContext) : Closeable, ReadableServiceProvider, WritableServiceProvider {

    @HostAccess.Export
    override fun runCommand(database: String, spec: Map<*, *>): Value = promise {
        runCommandInner(database, spec)
    }

    private fun runCommandInner(database: String, spec: Map<*, *>?): Either<Document> {
        return getDatabase(database, null).map { db -> db.runCommand(toBson(spec)) }
    }

    @HostAccess.Export
    override fun insertOne(database: String, collection: String, doc: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value = promise {
        getDatabase(database, dbOptions).map { db ->
            db.getCollection(collection).insertOne(toBson(doc))
            context.toJs(mapOf(
                    "result" to mapOf("ok" to true),
                    "insertedId" to "UNKNOWN"))
        }
    }

    @HostAccess.Export
    override fun replaceOne(database: String, collection: String, filter: Map<*, *>, replacement: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value = promise<Any?> {
        getDatabase(database, dbOptions).flatMap { db ->
            convert(ReplaceOptions(), replaceOptionsConverters, replaceOptionsDefaultConverters, options).map { options ->
                val res = db.getCollection(collection).replaceOne(toBson(filter), toBson(replacement), options)
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
    override fun updateMany(database: String, collection: String, filter: Map<*, *>, update: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value = promise<Any?> {
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun findAndModify(database: String, collection: String, query: Map<*, *>, sort: List<*>, update: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?) {
        throw NotImplementedError()
    }

    @HostAccess.Export
    override fun findAndModify(database: String, collection: String, query: Map<*, *>, sort: Map<*, *>, update: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?) {
        throw NotImplementedError()
    }

    @HostAccess.Export
    override fun updateOne(database: String, collection: String, filter: Map<*, *>, update: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value = promise<Any?> { 
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun save(database: String, collection: String, doc: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value = promise<Any?> { 
        Left(NotImplementedError())
    }

    @HostAccess.Export
    private fun getDatabase(database: String, dbOptions: Map<*, *>?): Either<MongoDatabase> {
        val db = client.getDatabase(database)
        return if (dbOptions == null) Right(db) else convert(db, dbConverters, dbDefaultConverter, dbOptions)
    }

    @HostAccess.Export
    override fun dropDatabase(database: String, writeConcern: Map<*, *>?, dbOptions: Map<*, *>?): Value = promise<Any?> { 
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun bulkWrite(database: String, collection: String, requests: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value = promise<Any?> { 
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun deleteMany(database: String, collection: String, filter: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value = promise {
        getDatabase(database, dbOptions).map { db ->
            val result = db.getCollection(collection).deleteMany(toBson(filter))
            context.toJs(mapOf(
                    "result" to mapOf("ok" to result.wasAcknowledged()),
                    "deletedCount" to result.deletedCount))
        }
    }

    @HostAccess.Export
    override fun deleteOne(database: String, collection: String, filter: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value = promise<Any?> { 
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun findOneAndDelete(database: String, collection: String, filter: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value = promise<Any?> { 
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun findOneAndReplace(database: String, collection: String, filter: Map<*, *>, replacement: Map<*, *>, options: Map<*, *>?): Value = promise {
        getDatabase(database, null).flatMap { db ->
            convert(FindOneAndReplaceOptions(), findOneAndReplaceOptionsConverters, findOneAndReplaceOptionsDefaultConverters, options).map { options ->
                val res = db.getCollection(collection).findOneAndReplace(toBson(filter), toBson(replacement), options)
                ProxyObject.fromMap(mapOf("value" to res))
            }
        }
    }

    @HostAccess.Export
    override fun findOneAndUpdate(database: String, collection: String, filter: Map<*, *>, update: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value = promise<Any?> { 
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun insertMany(database: String, collection: String, docs: List<*>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value = promise {
        getDatabase(database, dbOptions).map { db ->
            db.getCollection(collection).insertMany(docs.map { toBson(it as Map<*, *>?) })
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
        val db = getDatabase(database, dbOptions).getOrThrow()
        val iterable = db.aggregate(pipeline.map { toBson(it) })
        if (options != null) convert(iterable, aggregateConverters, aggregateDefaultConverter, options).getOrThrow()
        return AggregateCursor(iterable, context)
    }

    @HostAccess.Export
    override fun count(database: String, collection: String, query: Map<*, *>?, options: Map<*, *>?, dbOptions: Map<*, *>?): Value = promise {
        getDatabase(database, dbOptions).flatMap { db ->
            convert(CountOptions(), countOptionsConverters, countOptionsDefaultConverter, options).map { countOptions ->
                @Suppress("DEPRECATION")
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
    override fun remove(database: String, collection: String, query: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value {
        val promise = getDatabase(database, dbOptions).map { db ->
            val result = db.getCollection(collection).deleteMany(toBson(query))
            DeleteResult(result.wasAcknowledged(), result.deletedCount)
        }
        return context.toJsPromise(promise)
    }

    @HostAccess.Export
    override fun convertToCapped(database: String, collection: String, size: Number, options: Map<*, *>?): Value = promise<Any?> { 
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun createIndexes(database: String, collection: String, indexSpecs: List<*>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value = promise<Any?> { 
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun dropIndexes(database: String, collection: String, indexes: String, commandOptions: Map<*, *>?, dbOptions: Map<*, *>?): Value = promise<Any?> { 
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun dropIndexes(database: String, collection: String, indexes: List<*>, commandOptions: Map<*, *>?, dbOptions: Map<*, *>?): Value = promise<Any?> { 
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun dropIndexes(database: String, collection: String, indexes: Map<*, *>, commandOptions: Map<*, *>?, dbOptions: Map<*, *>?): Value = promise<Any?> { 
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun reIndex(database: String, collection: String, options: Map<*, *>?, dbOptions: Map<*, *>?): Value = promise<Any?> { 
        Left(NotImplementedError())
    }

    @HostAccess.Export
    override fun dropCollection(database: String, collection: String): Value = promise {
        getDatabase(database, null).map { db ->
            db.getCollection(collection).drop()
        }
    }

    @HostAccess.Export
    override fun renameCollection(database: String, oldName: String, newName: String, options: Map<*, *>?, dbOptions: Map<*, *>?): Value = promise<Any?> { 
        Left(NotImplementedError())
    }

    override fun close() = client.close()

    private fun <T> promise(block: () -> Either<T>): Value {
        return context.toJsPromise(block())
    }
}
