package com.mongodb.mongosh.service

import com.mongodb.client.MongoCursor
import com.mongodb.client.model.Collation
import com.mongodb.mongosh.MongoShellContext
import com.mongodb.mongosh.result.DocumentResult
import org.bson.Document
import org.graalvm.polyglot.HostAccess
import org.graalvm.polyglot.Value

internal class Cursor(private var helper: MongoIterableHelper<*>, private val context: MongoShellContext) : ServiceProviderCursor {
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
    override fun addCursorFlag(flag: Value, v: Boolean): Cursor {
        throw NotImplementedError("setting cursor flags are not supported")
    }

    @HostAccess.Export
    override fun addOption(option: Int): Cursor {
        throw NotImplementedError("addOption is not supported")
    }

    @HostAccess.Export
    override fun allowPartialResults(): Cursor {
        checkQueryNotExecuted()
        helper.allowPartialResults()
        return this
    }

    @HostAccess.Export
    override fun batchSize(v: Int): Cursor {
        checkQueryNotExecuted()
        helper.batchSize(v)
        return this
    }

    override fun bufferedCount(): Int {
        throw NotImplementedError("bufferedCount is not supported")
    }

    @HostAccess.Export
    override fun close() {
        closed = true
        getOrCreateIterator().close()
    }

    @HostAccess.Export
    override fun close(options: Value) = close()

    override fun clone(): Cursor {
        checkQueryNotExecuted()
        throw NotImplementedError("clone is not supported")
    }

    @HostAccess.Export
    override fun isClosed(): Boolean = closed

    @HostAccess.Export
    override fun collation(v: Value): Cursor {
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

    @HostAccess.Export
    override fun comment(v: String): Cursor {
        checkQueryNotExecuted()
        helper.comment(v)
        return this
    }

    @HostAccess.Export
    override fun count(): Int {
        checkQueryNotExecuted()
        return helper.count()
    }

    @HostAccess.Export
    override fun forEach(func: Value) {
        throw NotImplementedError("forEach is not supported")
    }

    @HostAccess.Export
    override fun hasNext(): Boolean = getOrCreateIterator().hasNext()

    @HostAccess.Export
    override fun hint(v: Value): Cursor {
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
    override fun isExhausted(): Boolean {
        return isClosed() && !hasNext()
    }

    @HostAccess.Export
    override fun itcount(): Int {
        throw NotImplementedError("itcount is not supported")
    }

    @HostAccess.Export
    override fun limit(v: Int): Cursor {
        checkQueryNotExecuted()
        helper.limit(v)
        return this
    }

    @HostAccess.Export
    override fun map(func: Value): Cursor {
        checkQueryNotExecuted()
        if (!func.canExecute()) {
            throw IllegalArgumentException("Expected one argument of type function. Got: $func")
        }
        helper = helper.map(func)
        return this
    }

    @HostAccess.Export
    override fun max(v: Value): Cursor {
        checkQueryNotExecuted()
        if (!v.hasMembers()) {
            throw IllegalArgumentException("Expected one argument of type object. Got: $v")
        }
        helper.max(toDocument(context, v))
        return this
    }

    @HostAccess.Export
    override fun maxTimeMS(value: Int): ServiceProviderCursor {
        throw NotImplementedError("maxTimeMS is not supported")
    }

    override fun maxAwaitTimeMS(value: Int): ServiceProviderCursor {
        throw NotImplementedError("maxAwaitTimeMS is not supported")
    }

    @HostAccess.Export
    override fun min(indexBounds: Value): ServiceProviderCursor {
        throw NotImplementedError("min is not supported")
    }

    @HostAccess.Export
    override fun next(): Any? = getOrCreateIterator().next()

    @HostAccess.Export
    override fun oplogReplay(): ServiceProviderCursor {
        throw NotImplementedError("oplogReplay is not supported")
    }

    @HostAccess.Export
    override fun project(v: Value): ServiceProviderCursor {
        throw NotImplementedError("projection is not supported")
    }

    @HostAccess.Export
    override fun returnKey(v: Boolean): ServiceProviderCursor {
        throw NotImplementedError("returnKey is not supported")
    }

    @HostAccess.Export
    override fun setReadPreference(v: Value): Cursor {
        throw NotImplementedError("setReadPreference is not supported")
    }

    override fun showRecordId(v: Boolean): ServiceProviderCursor {
        throw NotImplementedError("showRecordId is not supported")
    }

    @HostAccess.Export
    override fun size(): Value {
        throw NotImplementedError("size is not supported")
    }

    @HostAccess.Export
    override fun skip(v: Int): Cursor {
        checkQueryNotExecuted()
        helper.skip(v)
        return this
    }

    @HostAccess.Export
    override fun sort(spec: Value): Cursor {
        throw NotImplementedError("sort is not supported")
    }

    @HostAccess.Export
    override fun tailable(): Cursor {
        throw NotImplementedError("tailable is not supported")
    }

    @HostAccess.Export
    override fun toArray(): Value {
        throw NotImplementedError("toArray is not supported")
    }

    @HostAccess.Export
    override fun explain(verbosity: String) {
        throw NotImplementedError("explain is not supported")
    }

    private fun checkQueryNotExecuted() {
        check(iterator == null) { "query already executed" }
    }

    private fun toDocument(context: MongoShellContext, map: Value?): Document {
        return if (map == null || map.isNull) Document()
        else (context.extract(map) as DocumentResult).value
    }
}
