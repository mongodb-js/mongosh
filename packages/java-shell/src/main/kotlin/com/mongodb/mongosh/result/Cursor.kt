package com.mongodb.mongosh.result

import com.mongodb.mongosh.MongoShellEvaluator
import org.graalvm.polyglot.Value

open class Cursor<out T> internal constructor(protected var cursor: Value?, private var evaluator: MongoShellEvaluator?) : Iterator<T> {
    fun _asPrintable(): String {
        val (cursor, evaluator) = checkClosed()
        return evaluator.extract(evaluator.toShellResult(cursor).getMember("printable"))._asPrintable()
    }

    override fun hasNext(): Boolean {
        val (cursor, _) = checkClosed()
        return cursor.invokeMember("hasNext").asBoolean()
    }

    override fun next(): T {
        val (cursor, evaluator) = checkClosed()
        if (!hasNext()) throw NoSuchElementException()
        return evaluator.extract(cursor.invokeMember("next")).value as T
    }

    fun close() {
        val (c, _) = checkClosed()
        c.invokeMember("close")
        cursor = null
        evaluator = null
    }

    internal fun checkClosed(): Pair<Value, MongoShellEvaluator> {
        val cursor = this.cursor
        val evaluator = this.evaluator
        if (cursor == null || evaluator == null) throw IllegalStateException("Cursor has already been closed")
        return cursor to evaluator
    }
}
