package com.mongodb.mongosh.service

import com.mongodb.client.MongoCursor
import com.mongodb.client.MongoIterable
import com.mongodb.mongosh.MongoShellContext
import com.mongodb.mongosh.result.DocumentResult
import org.bson.Document
import org.graalvm.polyglot.HostAccess
import org.graalvm.polyglot.Value
import org.graalvm.polyglot.proxy.ProxyExecutable

internal abstract class Cursor<T : MongoIterable<Document>>(protected val iterable: T, protected val context: MongoShellContext) {
    private var iterator: MongoCursor<Document>? = null
    private var closed = false
    /** Java functions don't have js methods such as apply, bind, call etc.
     * So we need to create a real js function that wraps Java code */
    private val functionProducer = context.eval("(fun) => function inner() { return fun(this, ...arguments); }")

    private fun getOrCreateIterator(): MongoCursor<Document> {
        var it = iterator
        if (it == null) {
            it = iterable.iterator()
            iterator = it
        }
        return it
    }

    @JvmField
    @HostAccess.Export
    val map = jsFun<Cursor<T>> {
        checkQueryNotExecuted()
        throw NotImplementedError("map is not supported")
    }

    @JvmField
    @HostAccess.Export
    val hasNext = jsFun<Cursor<T>> {
        getOrCreateIterator().hasNext()
    }

    @JvmField
    @HostAccess.Export
    val next = jsFun<Cursor<T>> {
        getOrCreateIterator().next()
    }

    @JvmField
    @HostAccess.Export
    val isClosed = jsFun<Cursor<T>> {
        closed
    }

    @JvmField
    @HostAccess.Export
    val close = jsFun<Cursor<T>> {
        closed = true
        getOrCreateIterator().close()
    }

    @JvmField
    @HostAccess.Export
    val readPref = jsFun<Cursor<T>> {
        throw NotImplementedError("readPref is not supported")
    }

    @JvmField
    @HostAccess.Export
    val explain = jsFun<Cursor<T>> {
        throw NotImplementedError("explain is not supported")
    }

    @JvmField
    @HostAccess.Export
    val batchSize = jsFun<Cursor<T>> { args ->
        checkQueryNotExecuted()
        if (args.isEmpty() || !args[0].fitsInInt()) {
            throw IllegalArgumentException("Expected one argument of type int. Got: $args")
        }
        iterable.batchSize(args[0].asInt())
        this
    }

    protected fun checkQueryNotExecuted() {
        check(iterator == null) { "query already executed" }
    }

    protected fun <T> jsFun(block: T.(List<Value>) -> Any?): Value {
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
