package com.mongodb.mongosh.service

import com.mongodb.client.FindIterable
import com.mongodb.client.MongoCursor
import com.mongodb.mongosh.MongoShellContext
import org.bson.Document
import org.graalvm.polyglot.HostAccess
import org.graalvm.polyglot.Value
import org.graalvm.polyglot.proxy.ProxyExecutable

internal class Cursor(private val findIterable: FindIterable<Document>, private val context: MongoShellContext) {
    private val iterator: MongoCursor<Document> = findIterable.iterator()
    private var closed = false
    /** Java functions don't have js methods such as apply, bind, call etc.
     * So we need to create a real js function that wraps Java code */
    private val functionProducer = context.eval("(fun) => function inner() { return fun(this, ...arguments); }")

    @JvmField
    @HostAccess.Export
    val limit = jsFun<Cursor> { args ->
        if (args.isEmpty() || !args[0].fitsInInt()) {
            throw IllegalArgumentException("Expected one argument of type int. Got: $args")
        }
        Cursor(this.findIterable.limit(args[0].asInt()), context)
    }

    @JvmField
    @HostAccess.Export
    val hasNext = jsFun<Cursor> {
        this.iterator.hasNext()
    }

    @JvmField
    @HostAccess.Export
    val next = jsFun<Cursor> {
        this.iterator.next()
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
        this.iterator.close()
    }

    @JvmField
    @HostAccess.Export
    val readPref = jsFun<Cursor> {
        throw UnsupportedOperationException("readPref is not supported")
    }

    @JvmField
    @HostAccess.Export
    val batchSize = jsFun<Cursor> { args ->
        if (args.isEmpty() || !args[0].fitsInInt()) {
            throw IllegalArgumentException("Expected one argument of type int. Got: $args")
        }
        Cursor(this.findIterable.batchSize(args[0].asInt()), context)
    }

    private fun <T> jsFun(block: T.(List<Value>) -> Any?): Any {
        return functionProducer.execute(ProxyExecutable { args ->
            val that = args[0].asHostObject<T>()
            that.block(args.drop(1))
        })
    }
}
