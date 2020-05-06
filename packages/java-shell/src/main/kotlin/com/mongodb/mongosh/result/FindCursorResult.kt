package com.mongodb.mongosh.result

import com.mongodb.mongosh.MongoShellContext
import org.bson.Document
import org.graalvm.polyglot.Value

class FindCursorResult internal constructor(cursor: FindCursor) : CursorResult<FindCursor>(cursor) {
    override fun toReplString(): String = cursor.toReplString()
}

class FindCursor internal constructor(private val cursor: Value, private val context: MongoShellContext) : Cursor {
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

    override fun toReplString(): String {
        return context.extract(cursor.invokeMember("toReplString")).toReplString()
    }
}