package com.mongodb.mongosh.service

import com.mongodb.client.MongoClient
import com.mongodb.mongosh.MongoShellContext
import com.mongodb.mongosh.result.DeleteResult
import org.bson.Document
import org.graalvm.polyglot.HostAccess
import org.graalvm.polyglot.proxy.ProxyObject.fromMap
import java.io.Closeable

internal class CliServiceProvider(private val client: MongoClient, private val context: MongoShellContext) : Closeable {

    @HostAccess.Export
    fun runCommand(database: String, spec: Map<*, *>?): Any {
        return runCommand(database, spec, null)
    }

    @HostAccess.Export
    fun runCommand(database: String, spec: Map<*, *>?, options: Map<*, *>?): Any {
        return runCommand(database, spec, options, null)
    }

    @HostAccess.Export
    fun runCommand(database: String, spec: Map<*, *>?, options: Map<*, *>?, dbOptions: Map<*, *>?): Any {
        return client.getDatabase(database).runCommand(toBson(spec))
    }

    @HostAccess.Export
    fun insertOne(database: String, coll: String, doc: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?): Any {
        client.getDatabase(database).getCollection(coll).insertOne(toBson(doc))
        return fromMap(mapOf(
                "result" to fromMap(mapOf("ok" to true)),
                "insertedId" to "UNKNOWN"))
    }

    @HostAccess.Export
    fun deleteMany(database: String, coll: String, filter: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?): Any {
        val result = client.getDatabase(database).getCollection(coll).deleteMany(toBson(filter))
        return fromMap(mapOf(
                "result" to fromMap(mapOf("ok" to result.wasAcknowledged())),
                "deletedCount" to result.deletedCount))
    }

    @HostAccess.Export
    fun insertMany(database: String, coll: String, docs: List<*>, options: Map<*, *>?, dbOptions: Map<*, *>?): Any {
        client.getDatabase(database).getCollection(coll).insertMany(docs.map { toBson(it as Map<*, *>?) })
        return fromMap(mapOf(
                "result" to fromMap(mapOf("ok" to true)),
                "insertedId" to emptyList<String>()))
    }

    @HostAccess.Export
    fun find(db: String, coll: String, query: Map<*, *>?, options: Map<*, *>?): Cursor {
        val collection = client.getDatabase(db).getCollection(coll)
        val iterable = if (query == null) collection.find() else collection.find(toBson(query))
        return Cursor(iterable, context)
    }

    @HostAccess.Export
    fun remove(db: String, coll: String, query: Map<*, *>?, options: Map<*, *>?, dbOptions: Map<*, *>?): Any {
        val result = client.getDatabase(db).getCollection(coll).deleteMany(toBson(query))
        return DeleteResult(result.wasAcknowledged(), result.deletedCount)
    }

    override fun close() = client.close()
}

private fun map() = emptyMap<String, Any>()

private fun toBson(options: Map<*, *>?): Document {
    val doc = Document()
    options?.entries?.forEach { (key, value) ->
        if (key !is String) return@forEach
        doc[key] = if (value is Map<*, *>) toBson(value) else value
    }
    return doc
}
