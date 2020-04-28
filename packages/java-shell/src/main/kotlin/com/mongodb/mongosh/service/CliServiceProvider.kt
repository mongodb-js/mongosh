package com.mongodb.mongosh.service

import com.mongodb.client.MongoClient
import com.mongodb.client.MongoDatabase
import com.mongodb.mongosh.MongoShellContext
import com.mongodb.mongosh.result.DeleteResult
import org.bson.Document
import org.graalvm.polyglot.HostAccess
import org.graalvm.polyglot.Value
import org.graalvm.polyglot.proxy.ProxyObject.fromMap
import java.io.Closeable

internal class CliServiceProvider(private val client: MongoClient, private val context: MongoShellContext) : Closeable, ReadableServiceProvider {

    @HostAccess.Export
    fun runCommand(database: String, spec: Map<*, *>?): Value {
        val promise = getDatabase(database, null).then { db -> db.runCommand(toBson(spec)) }
        return context.toJsPromise(promise)
    }

    @HostAccess.Export
    fun insertOne(database: String, coll: String, doc: Map<*, *>?, options: Map<*, *>?, dbOptions: Map<*, *>?): Value {
        val promise = getDatabase(database, dbOptions).then { db ->
            db.getCollection(coll).insertOne(toBson(doc))
            fromMap(mapOf(
                    "result" to fromMap(mapOf("ok" to true)),
                    "insertedId" to "UNKNOWN"))
        }
        return context.toJsPromise(promise)
    }

    private fun getDatabase(database: String, dbOptions: Map<*, *>?): Promise<MongoDatabase> {
        val db = client.getDatabase(database)
        return if (dbOptions == null) Resolved(db) else convert(db, dbConverters, writeConcernDefaultConverter, dbOptions)
    }

    @HostAccess.Export
    fun deleteMany(database: String, coll: String, filter: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value {
        val promise = getDatabase(database, dbOptions).then { db ->
            val result = db.getCollection(coll).deleteMany(toBson(filter))
            fromMap(mapOf(
                    "result" to fromMap(mapOf("ok" to result.wasAcknowledged())),
                    "deletedCount" to result.deletedCount))
        }
        return context.toJsPromise(promise)
    }

    @HostAccess.Export
    fun insertMany(database: String, coll: String, docs: List<*>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value {
        val promise = getDatabase(database, dbOptions).then { db ->
            db.getCollection(coll).insertMany(docs.map { toBson(it as Map<*, *>?) })
            fromMap(mapOf(
                    "result" to fromMap(mapOf("ok" to true)),
                    "insertedId" to emptyList<String>()))
        }
        return context.toJsPromise(promise)
    }

    override fun aggregate(database: String, collection: String, pipeline: List<Map<*, *>>, options: Map<*, *>?, dbOptions: Map<*, *>?): Cursor {
        TODO("not implemented")
    }

    override fun aggregateDb(database: String, pipeline: List<Map<*, *>>, options: Map<*, *>?, dbOptions: Map<*, *>?): Cursor {
        TODO("not implemented")
    }

    override fun count(db: String, coll: String, query: Map<*, *>?, options: Map<*, *>?, dbOptions: Map<*, *>?): Value {
        TODO("not implemented")
    }

    override fun countDocuments(database: String, collection: String, filter: Map<*, *>?, options: Map<*, *>?): Value {
        TODO("not implemented")
    }

    override fun distinct(database: String, collection: String, fieldName: String, filter: Map<*, *>?, options: Map<*, *>?, dbOptions: Map<*, *>?): Value {
        TODO("not implemented")
    }

    override fun estimatedDocumentCount(database: String, collection: String, options: Map<*, *>?): Value {
        TODO("not implemented")
    }

    @HostAccess.Export
    override fun find(database: String, collection: String, filter: Map<*, *>?, options: Map<*, *>?): Cursor {
        val coll = client.getDatabase(database).getCollection(collection)
        val iterable = if (filter == null) coll.find() else coll.find(toBson(filter))
        return Cursor(iterable, context)
    }

    override fun getServerVersion(): Promise<String> {
        TODO("not implemented")
    }

    override fun listDatabases(database: String): Value {
        TODO("not implemented")
    }

    override fun isCapped(database: String, collection: String): Value {
        TODO("not implemented")
    }

    override fun getIndexes(database: String, collection: String, dbOptions: Map<*, *>?): Value {
        TODO("not implemented")
    }

    override fun listCollections(database: String, filter: Map<*, *>?, options: Map<*, *>?, dbOptions: Map<*, *>?): Value {
        TODO("not implemented")
    }

    override fun stats(database: String, collection: String, options: Map<*, *>?, dbOptions: Map<*, *>?): Value {
        TODO("not implemented")
    }

    @HostAccess.Export
    fun remove(database: String, coll: String, query: Map<*, *>?, options: Map<*, *>?, dbOptions: Map<*, *>?): Value {
        val promise = getDatabase(database, dbOptions).then { db ->
            val result = db.getCollection(coll).deleteMany(toBson(query))
            DeleteResult(result.wasAcknowledged(), result.deletedCount)
        }
        return context.toJsPromise(promise)
    }

    override fun close() = client.close()
}

private fun toBson(options: Map<*, *>?): Document {
    val doc = Document()
    options?.entries?.forEach { (key, value) ->
        if (key !is String) return@forEach
        doc[key] = if (value is Map<*, *>) toBson(value) else value
    }
    return doc
}
