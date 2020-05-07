package com.mongodb.mongosh.result

import com.mongodb.mongosh.MongoShellContext
import org.bson.Document
import org.graalvm.polyglot.Value

class AggregationCursorResult internal constructor(cursor: AggregationCursor) : CursorResult<AggregationCursor>(cursor) {
    override fun toReplString(): String = value.toReplString()
}

class AggregationCursor internal constructor(private val cursor: Value, private val context: MongoShellContext) : Cursor {
    override fun hasNext(): Boolean {
        return cursor.invokeMember("hasNext").asBoolean()
    }

    override fun next(): Document {
        if (!hasNext()) throw NoSuchElementException()
        return cursor.invokeMember("next").asHostObject()
    }

    override fun toReplString(): String {
        return context.extract(cursor.invokeMember("toReplString")).toReplString()
    }
}