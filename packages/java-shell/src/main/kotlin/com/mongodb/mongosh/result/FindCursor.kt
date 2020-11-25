package com.mongodb.mongosh.result

import com.mongodb.mongosh.MongoShellContext
import org.graalvm.polyglot.Value

class FindCursor<out T> internal constructor(cursor: Value?, context: MongoShellContext?) : Cursor<T>(cursor, context) {
    fun batchSize(size: Int) {
        val (cursor, _) = checkClosed()
        cursor.invokeMember("batchSize", size)
    }
}
