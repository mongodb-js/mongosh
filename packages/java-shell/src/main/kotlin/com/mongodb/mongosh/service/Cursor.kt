package com.mongodb.mongosh.service

import com.mongodb.client.MongoCursor
import com.mongodb.client.model.Collation
import com.mongodb.mongosh.MongoShellContext
import com.mongodb.mongosh.result.DocumentResult
import org.bson.Document
import org.graalvm.polyglot.HostAccess
import org.graalvm.polyglot.Value
import org.graalvm.polyglot.proxy.ProxyExecutable

internal class Cursor(private var helper: MongoIterableHelper<*>, private val context: MongoShellContext) {
    private var iterator: MongoCursor<out Any?>? = null
    private var closed = false

    /** Java functions don't have js methods such as apply, bind, call etc.
     * So we need to create a real js function that wraps Java code */
    private val functionProducer = context.eval("(fun) => function inner() { return fun(this, ...arguments); }")

    private fun getOrCreateIterator(): MongoCursor<out Any?> {
        var it = iterator
        if (it == null) {
            it = helper.iterable.iterator()
            iterator = it
        }
        return it
    }

    @JvmField
    @HostAccess.Export
    val map = jsFun<Cursor> { args ->
        checkQueryNotExecuted()
        if (args.isEmpty() || !args[0].canExecute()) {
            throw IllegalArgumentException("Expected one argument of type function. Got: $args")
        }
        helper = helper.map(args[0])
        this
    }

    @JvmField
    @HostAccess.Export
    val limit = jsFun<Cursor> { args ->
        checkQueryNotExecuted()
        if (args.isEmpty() || !args[0].fitsInInt()) {
            throw IllegalArgumentException("Expected one argument of type int. Got: $args")
        }
        helper.limit(args[0].asInt())
        this
    }

    @JvmField
    @HostAccess.Export
    val skip = jsFun<Cursor> { args ->
        checkQueryNotExecuted()
        if (args.isEmpty() || !args[0].fitsInInt()) {
            throw IllegalArgumentException("Expected one argument of type int. Got: $args")
        }
        helper.skip(args[0].asInt())
        this
    }

    @JvmField
    @HostAccess.Export
    val max = jsFun<Cursor> { args ->
        checkQueryNotExecuted()
        if (args.isEmpty() || !args[0].hasMembers()) {
            throw IllegalArgumentException("Expected one argument of type object. Got: $args")
        }
        helper.max(toDocument(context, args[0]))
        this
    }

    @JvmField
    @HostAccess.Export
    val hasNext = jsFun<Cursor> {
        getOrCreateIterator().hasNext()
    }

    @JvmField
    @HostAccess.Export
    val next = jsFun<Cursor> {
        getOrCreateIterator().next()
    }

    @JvmField
    @HostAccess.Export
    val isClosed = jsFun<Cursor> {
        closed
    }

    @JvmField
    @HostAccess.Export
    val close = jsFun<Cursor> {
        closed = true
        getOrCreateIterator().close()
    }

    @JvmField
    @HostAccess.Export
    val readPref = jsFun<Cursor> {
        throw NotImplementedError("readPref is not supported")
    }

    @JvmField
    @HostAccess.Export
    val explain = jsFun<Cursor> {
        throw NotImplementedError("explain is not supported")
    }

    @JvmField
    @HostAccess.Export
    val batchSize = jsFun<Cursor> { args ->
        checkQueryNotExecuted()
        if (args.isEmpty() || !args[0].fitsInInt()) {
            throw IllegalArgumentException("Expected one argument of type int. Got: $args")
        }
        helper.batchSize(args[0].asInt())
        this
    }

    @JvmField
    @HostAccess.Export
    val comment = jsFun<Cursor> { args ->
        checkQueryNotExecuted()
        if (args.isEmpty() || !args[0].isString) {
            throw IllegalArgumentException("Expected one argument of type string. Got: $args")
        }
        helper.comment(args[0].asString())
        this
    }

    @JvmField
    @HostAccess.Export
    val hint = jsFun<Cursor> { args ->
        checkQueryNotExecuted()
        if (args.isEmpty() || !(args[0].hasMembers() || args[0].isString)) {
            throw IllegalArgumentException("Expected one argument of type string or object. Got: $args")
        }
        val value = args[0]
        if (value.isString) {
            helper.hint(value.asString())
        } else if (value.hasMembers()) {
            helper.hint(toDocument(context, value))
        }
        this
    }


    @JvmField
    @HostAccess.Export
    val collation = jsFun<Cursor> { args ->
        checkQueryNotExecuted()
        if (args.isEmpty() || !args[0].hasMembers()) {
            throw IllegalArgumentException("Expected one argument of type object. Got: $args")
        }
        val collation = convert(Collation.builder(), collationConverters, collationDefaultConverter, toDocument(context, args[0]))
                .getOrThrow()
                .build()
        helper.collation(collation)
        this
    }

    private fun checkQueryNotExecuted() {
        check(iterator == null) { "query already executed" }
    }

    private fun <T> jsFun(block: T.(List<Value>) -> Any?): Value {
        return functionProducer.execute(ProxyExecutable { args ->
            val that = args[0].asHostObject<T>()
            that.block(args.drop(1))
        })
    }

    protected fun toDocument(context: MongoShellContext, map: Value?): Document {
        return if (map == null || map.isNull) Document()
        else (context.extract(map) as DocumentResult).value
    }
}
