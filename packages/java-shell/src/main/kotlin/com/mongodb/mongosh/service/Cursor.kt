package com.mongodb.mongosh.service

import com.mongodb.client.FindIterable
import com.mongodb.client.MongoCursor
import org.bson.Document
import org.graalvm.polyglot.HostAccess

internal class Cursor(private val findIterable: FindIterable<Document>) : Iterable<Document> {
    private val iterator: MongoCursor<Document> = findIterable.iterator()

    @HostAccess.Export
    fun limit(v: Int): Cursor {
        return Cursor(findIterable.limit(v))
    }

    @HostAccess.Export
    fun hasNext(): Boolean {
        return iterator.hasNext()
    }

    @HostAccess.Export
    fun next(): Document {
        return iterator.next()
    }

    @HostAccess.Export
    fun close() {
        iterator.close()
    }

    @HostAccess.Export
    fun readPref(mode: String): Cursor {
        throw UnsupportedOperationException()
    }

    @HostAccess.Export
    fun batchSize(size: Int): Cursor {
        return Cursor(findIterable.batchSize(size))
    }

    override fun iterator(): MongoCursor<Document> {
        return findIterable.iterator()
    }
}
