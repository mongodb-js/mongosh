package com.mongodb.mongosh.result

import com.mongodb.mongosh.MongoShellContext
import org.bson.Document
import org.graalvm.polyglot.Value

class CursorResult internal constructor(val value: Cursor) : MongoShellResult() {
    override fun toReplString(): String = value.toReplString()
}

class Cursor internal constructor(private val cursor: Value, private val context: MongoShellContext) : Iterator<Document> {
    override fun hasNext(): Boolean {
        return cursor.invokeMember("hasNext").asBoolean()
    }

    override fun next(): Document {
        if (!hasNext()) throw NoSuchElementException()
        return cursor.invokeMember("next").asHostObject()
    }

    fun batchSize(size: Int) {
        cursor.invokeMember("batchSize", size)
    }

    fun toReplString(): String {
        return context.extract(cursor.invokeMember("toReplString")).toReplString()
    }
}