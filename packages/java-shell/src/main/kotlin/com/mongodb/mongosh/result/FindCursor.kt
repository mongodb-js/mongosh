package com.mongodb.mongosh.result

import com.mongodb.mongosh.MongoShellEvaluator
import org.graalvm.polyglot.Value

class FindCursor<out T> internal constructor(cursor: Value?, evaluator: MongoShellEvaluator?) : Cursor<T>(cursor, evaluator) {
    fun batchSize(size: Int) {
        val (cursor, _) = checkClosed()
        cursor.invokeMember("batchSize", size)
    }
}
