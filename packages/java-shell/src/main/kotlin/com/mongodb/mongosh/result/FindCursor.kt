package com.mongodb.mongosh.result

import com.mongodb.mongosh.MongoShellContext
import org.bson.Document
import org.graalvm.polyglot.Value

class FindCursor<out T> internal constructor(private val cursor: Value, private val context: MongoShellContext) : Cursor<T> {
    override fun hasNext(): Boolean {
        return cursor.invokeMember("hasNext").asBoolean()
    }

    override fun next(): T {
        if (!hasNext()) throw NoSuchElementException()
        return context.extract(cursor.invokeMember("next")).value as T
    }

    fun batchSize(size: Int) {
        cursor.invokeMember("batchSize", size)
    }

    override fun toReplString(): String {
        return context.extract(cursor.invokeMember("toReplString")).toReplString()
    }
}