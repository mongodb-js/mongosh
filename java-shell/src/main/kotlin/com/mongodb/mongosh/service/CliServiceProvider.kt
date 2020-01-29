package com.mongodb.mongosh.service

import com.mongodb.client.MongoClient
import com.mongodb.mongosh.result.DeleteResult
import org.bson.Document
import org.graalvm.polyglot.HostAccess
import org.graalvm.polyglot.proxy.ProxyObject.fromMap
import java.io.Closeable

internal class CliServiceProvider(private val client: MongoClient) : Closeable {

    @HostAccess.Export
    fun runCommand(database: String, spec: String): Any {
        return client.getDatabase(database).runCommand(Document(spec, null))
    }

    @HostAccess.Export
    fun runCommand(database: String, spec: Map<*, *>): Any {
        throw UnsupportedOperationException()
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
        return Cursor(iterable)
    }

    @HostAccess.Export
    fun remove(db: String, coll: String, query: Map<*, *>?, options: Map<*, *>?, dbOptions: Map<*, *>?): Any {
        val result = client.getDatabase(db).getCollection(coll).deleteMany(toBson(query))
        return DeleteResult(result.wasAcknowledged(), result.deletedCount)
    }

    override fun close() = client.close()

    private fun toBson(options: Map<*, *>?): Document {
        val doc = Document()
        options?.entries?.forEach { (key, value) ->
            if (key !is String) return@forEach
            doc[key] = if (value is Map<*, *>) toBson(value) else value
        }
        return doc
    }
}
