package com.mongodb.mongosh.service

import com.mongodb.client.FindIterable
import com.mongodb.client.MongoIterable
import com.mongodb.client.model.Collation
import com.mongodb.mongosh.MongoShellContext
import org.bson.Document
import org.graalvm.polyglot.Value

internal open class MongoIterableHelper<T : MongoIterable<out Any?>>(val iterable: T, private val context: MongoShellContext) {
    fun batchSize(v: Int) {
        iterable.batchSize(v)
    }

    fun map(function: Value): MongoIterableHelper<*> {
        return helper(iterable.map { v ->
            context.extract(function.execute(context.toJs(v))).value
        }, context)
    }

    open fun limit(v: Int) {
        throw NotImplementedError("limit is not supported")
    }

    open fun max(v: Document) {
        throw NotImplementedError("max is not supported")
    }

    open fun skip(v: Int) {
        throw NotImplementedError("skip is not supported")
    }

    open fun comment(v: String) {
        throw NotImplementedError("comment is not supported")
    }

    open fun hint(v: String) {
        throw NotImplementedError("hint is not supported")
    }

    open fun hint(v: Document) {
        throw NotImplementedError("hint is not supported")
    }

    open fun collation(v: Collation) {
        throw NotImplementedError("collation is not supported")
    }
}

internal class FindIterableHelper(iterable: FindIterable<out Any?>, context: MongoShellContext) : MongoIterableHelper<FindIterable<out Any?>>(iterable, context) {
    override fun limit(v: Int) {
        iterable.limit(v)
    }

    override fun max(v: Document) {
        iterable.max(v)
    }

    override fun skip(v: Int) {
        iterable.skip(v)
    }

    override fun comment(v: String) {
        iterable.comment(v)
    }

    override fun hint(v: Document) {
        iterable.hint(v)
    }

    override fun hint(v: String) {
        iterable.hintString(v)
    }

    override fun collation(v: Collation) {
        iterable.collation(v)
    }
}

internal fun helper(iterable: MongoIterable<out Any?>, context: MongoShellContext): MongoIterableHelper<*> {
    return when (iterable) {
        is FindIterable -> FindIterableHelper(iterable, context)
        else -> MongoIterableHelper(iterable, context)
    }
}