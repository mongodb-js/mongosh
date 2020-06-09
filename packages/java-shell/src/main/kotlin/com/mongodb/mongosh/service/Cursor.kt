package com.mongodb.mongosh.service

import com.mongodb.client.MongoCursor
import com.mongodb.client.model.Collation
import com.mongodb.mongosh.MongoShellContext
import com.mongodb.mongosh.result.DocumentResult
import org.bson.Document
import org.graalvm.polyglot.HostAccess
import org.graalvm.polyglot.Value

internal class Cursor(private var helper: MongoIterableHelper<*>, private val context: MongoShellContext) {
    private var iterator: MongoCursor<out Any?>? = null
    private var closed = false

    private fun getOrCreateIterator(): MongoCursor<out Any?> {
        var it = iterator
        if (it == null) {
            it = helper.iterable.iterator()
            iterator = it
        }
        return it
    }

    @HostAccess.Export
    fun map(func: Value): Cursor {
        checkQueryNotExecuted()
        if (!func.canExecute()) {
            throw IllegalArgumentException("Expected one argument of type function. Got: $func")
        }
        helper = helper.map(func)
        return this
    }

    @HostAccess.Export
    fun limit(v: Int): Cursor {
        checkQueryNotExecuted()
        helper.limit(v)
        return this
    }

    @HostAccess.Export
    fun skip(v: Int): Cursor {
        checkQueryNotExecuted()
        helper.skip(v)
        return this
    }

    @HostAccess.Export
    fun max(v: Value): Cursor {
        checkQueryNotExecuted()
        if (!v.hasMembers()) {
            throw IllegalArgumentException("Expected one argument of type object. Got: $v")
        }
        helper.max(toDocument(context, v))
        return this
    }

    @HostAccess.Export
    fun hasNext(): Boolean = getOrCreateIterator().hasNext()

    @HostAccess.Export
    fun next(): Any? = getOrCreateIterator().next()

    @HostAccess.Export
    fun isClosed(): Boolean = closed

    @HostAccess.Export
    fun close(v: Value) {
        closed = true
        getOrCreateIterator().close()
    }

    @HostAccess.Export
    fun readPref(v: Value): Cursor {
        throw NotImplementedError("readPref is not supported")
    }

    @HostAccess.Export
    fun explain(v: Value): Cursor {
        throw NotImplementedError("explain is not supported")
    }

    @HostAccess.Export
    fun batchSize(v: Int): Cursor {
        checkQueryNotExecuted()
        helper.batchSize(v)
        return this
    }

    @HostAccess.Export
    fun comment(v: String): Cursor {
        checkQueryNotExecuted()
        helper.comment(v)
        return this
    }

    @HostAccess.Export
    fun hint(v: Value): Cursor {
        checkQueryNotExecuted()
        if (!(v.hasMembers() || v.isString)) {
            throw IllegalArgumentException("Expected one argument of type string or object. Got: $v")
        }
        if (v.isString) {
            helper.hint(v.asString())
        } else if (v.hasMembers()) {
            helper.hint(toDocument(context, v))
        }
        return this
    }


    @HostAccess.Export
    fun collation(v: Value): Cursor {
        checkQueryNotExecuted()
        if (!v.hasMembers()) {
            throw IllegalArgumentException("Expected one argument of type object. Got: $v")
        }
        val collation = convert(Collation.builder(), collationConverters, collationDefaultConverter, toDocument(context, v))
                .getOrThrow()
                .build()
        helper.collation(collation)
        return this
    }

    private fun checkQueryNotExecuted() {
        check(iterator == null) { "query already executed" }
    }

    private fun toDocument(context: MongoShellContext, map: Value?): Document {
        return if (map == null || map.isNull) Document()
        else (context.extract(map) as DocumentResult).value
    }
}
