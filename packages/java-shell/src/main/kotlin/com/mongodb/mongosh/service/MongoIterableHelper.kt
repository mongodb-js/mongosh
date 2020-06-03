package com.mongodb.mongosh.service

import com.mongodb.CursorType
import com.mongodb.client.AggregateIterable
import com.mongodb.client.FindIterable
import com.mongodb.client.MongoDatabase
import com.mongodb.client.MongoIterable
import com.mongodb.client.model.Collation
import com.mongodb.mongosh.MongoShellContext
import org.bson.Document
import org.graalvm.polyglot.Value
import java.util.concurrent.TimeUnit

internal open class MongoIterableHelper<T : MongoIterable<out Any?>>(val iterable: T, private val context: MongoShellContext) {
    fun batchSize(v: Int) {
        iterable.batchSize(v)
    }

    fun map(function: Value): MongoIterableHelper<*> {
        return helper(iterable.map { v ->
            context.extract(function.execute(context.toJs(v))).value
        }, context)
    }

    fun itcount(): Int {
        return iterable.count()
    }

    fun toArray(): List<Any?> = iterable.toList()

    open fun limit(v: Int): Unit = throw NotImplementedError("limit is not supported")
    open fun max(v: Document): Unit = throw NotImplementedError("max is not supported")
    open fun min(v: Document): Unit = throw NotImplementedError("min is not supported")
    open fun projection(v: Document): Unit = throw NotImplementedError("projection is not supported")
    open fun skip(v: Int): Unit = throw NotImplementedError("skip is not supported")
    open fun comment(v: String): Unit = throw NotImplementedError("comment is not supported")
    open fun hint(v: String): Unit = throw NotImplementedError("hint is not supported")
    open fun hint(v: Document): Unit = throw NotImplementedError("hint is not supported")
    open fun collation(v: Collation): Unit = throw NotImplementedError("collation is not supported")
    open fun allowPartialResults(): Unit = throw NotImplementedError("allowPartialResults is not supported")
    open fun count(): Int = throw NotImplementedError("count is not supported")
    open fun maxTimeMS(v: Long): Unit = throw NotImplementedError("maxTimeMS is not supported")
    open fun noCursorTimeout(): Unit = throw NotImplementedError("noCursorTimeout is not supported")
    open fun oplogReplay(): Unit = throw NotImplementedError("oplogReplay is not supported")
    open fun returnKey(v: Boolean): Unit = throw NotImplementedError("returnKey is not supported")
    open fun sort(spec: Document): Unit = throw NotImplementedError("sort is not supported")
    open fun tailable(): Unit = throw NotImplementedError("tailable is not supported")
    open fun explain(verbosity: String?): Any? = throw NotImplementedError("explain is not supported")
}

internal class AggregateIterableHelper(iterable: AggregateIterable<out Any?>,
                                       context: MongoShellContext,
                                       private val db: MongoDatabase?,
                                       private val collection: String?,
                                       private val pipeline: List<Document>?,
                                       private val options: Document?)
    : MongoIterableHelper<AggregateIterable<out Any?>>(iterable, context) {
    override fun maxTimeMS(v: Long) {
        iterable.maxTime(v, TimeUnit.MILLISECONDS)
    }

    override fun explain(verbosity: String?): Any? {
        check(db != null) { "db is not set" }
        check(pipeline != null) { "pipeline is not set" }
        val explain = Document()
        explain["aggregate"] = collection ?: 1
        explain["pipeline"] = pipeline
        explain["explain"] = true
        if (options != null) explain.putAll(options)
        return db.runCommand(explain)
    }

    override fun comment(v: String) {
        iterable.comment(v)
    }

    override fun hint(v: Document) {
        iterable.hint(v)
    }

    override fun collation(v: Collation) {
        iterable.collation(v)
    }
}

internal class FindIterableHelper(iterable: FindIterable<out Any?>, context: MongoShellContext) : MongoIterableHelper<FindIterable<out Any?>>(iterable, context) {
    override fun allowPartialResults() {
        iterable.partial(true)
    }

    override fun oplogReplay() {
        iterable.oplogReplay(true)
    }

    override fun noCursorTimeout() {
        iterable.noCursorTimeout(true)
    }

    override fun maxTimeMS(v: Long) {
        iterable.maxTime(v, TimeUnit.MILLISECONDS)
    }

    override fun projection(v: Document) {
        iterable.projection(v)
    }

    override fun limit(v: Int) {
        iterable.limit(v)
    }

    override fun max(v: Document) {
        iterable.max(v)
    }

    override fun min(v: Document) {
        iterable.min(v)
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

    override fun returnKey(v: Boolean) {
        iterable.returnKey(v)
    }

    override fun sort(spec: Document) {
        iterable.sort(spec)
    }

    override fun tailable() {
        iterable.cursorType(CursorType.Tailable)
    }

    override fun explain(verbosity: String?): Any? {
        return iterable.modifiers(Document("\$explain", true)).first()
    }
}

internal fun helper(iterable: MongoIterable<out Any?>, context: MongoShellContext): MongoIterableHelper<*> {
    return when (iterable) {
        is FindIterable -> FindIterableHelper(iterable, context)
        is AggregateIterable -> AggregateIterableHelper(iterable, context, null, null, null, null)
        else -> MongoIterableHelper(iterable, context)
    }
}