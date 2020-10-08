package com.mongodb.mongosh.service

import com.mongodb.*
import com.mongodb.client.AggregateIterable
import com.mongodb.client.FindIterable
import com.mongodb.client.MongoDatabase
import com.mongodb.client.MongoIterable
import com.mongodb.mongosh.MongoShellContext
import org.bson.Document
import org.graalvm.polyglot.Value

internal open class MongoIterableHelper<T : MongoIterable<out Any?>>(val iterable: T, protected val context: MongoShellContext) {
    fun map(function: Value): MongoIterableHelper<*> {
        return helper(iterable.map { v ->
            context.extract(function.execute(context.toJs(v))).value
        }, context)
    }

    fun itcount(): Int {
        return iterable.count()
    }

    fun toArray(): List<Any?> = iterable.toList()

    open fun batchSize(v: Int): Unit = throw NotImplementedError("batchSize is not supported")
    open fun limit(v: Int): Unit = throw NotImplementedError("limit is not supported")
    open fun max(v: Document): Unit = throw NotImplementedError("max is not supported")
    open fun min(v: Document): Unit = throw NotImplementedError("min is not supported")
    open fun projection(v: Document): Unit = throw NotImplementedError("projection is not supported")
    open fun skip(v: Int): Unit = throw NotImplementedError("skip is not supported")
    open fun comment(v: String): Unit = throw NotImplementedError("comment is not supported")
    open fun hint(v: String): Unit = throw NotImplementedError("hint is not supported")
    open fun hint(v: Document): Unit = throw NotImplementedError("hint is not supported")
    open fun collation(v: Document): Unit = throw NotImplementedError("collation is not supported")
    open fun allowPartialResults(): Unit = throw NotImplementedError("allowPartialResults is not supported")
    open fun count(): Int = throw NotImplementedError("count is not supported")
    open fun maxTimeMS(v: Long): Unit = throw NotImplementedError("maxTimeMS is not supported")
    open fun noCursorTimeout(): Unit = throw NotImplementedError("noCursorTimeout is not supported")
    open fun oplogReplay(): Unit = throw NotImplementedError("oplogReplay is not supported")
    open fun returnKey(v: Boolean): Unit = throw NotImplementedError("returnKey is not supported")
    open fun sort(spec: Document): Unit = throw NotImplementedError("sort is not supported")
    open fun tailable(): Unit = throw NotImplementedError("tailable is not supported")
    open fun explain(verbosity: String?): Any? = throw NotImplementedError("explain is not supported")
    open fun readPrev(v: String, tags: List<TagSet>?): MongoIterableHelper<*> = throw NotImplementedError("readPrev is not supported")
}

internal data class AggregateCreateOptions(val db: MongoDatabase,
                                           val collection: String?,
                                           val pipeline: List<Document>,
                                           val options: Document)

internal class AggregateIterableHelper(iterable: AggregateIterable<out Any?>,
                                       context: MongoShellContext,
                                       private val createOptions: AggregateCreateOptions?)
    : MongoIterableHelper<AggregateIterable<out Any?>>(iterable, context) {

    override fun explain(verbosity: String?): Any? {
        check(createOptions != null) { "createOptions were not saved" }
        val explain = Document()
        explain["aggregate"] = createOptions.collection ?: 1
        explain["pipeline"] = createOptions.pipeline
        explain["explain"] = true
        explain.putAll(createOptions.options)
        return createOptions.db.runCommand(explain)
    }

    override fun readPrev(v: String, tags: List<TagSet>?): AggregateIterableHelper {
        check(createOptions != null) { "createOptions were not saved" }
        val newDb = if (tags == null) createOptions.db.withReadPreference(ReadPreference.valueOf(v))
        else createOptions.db.withReadPreference(ReadPreference.valueOf(v, tags))
        val newCreateOptions = createOptions.copy(db = newDb)
        val newIterable = aggregate(newCreateOptions)
        return AggregateIterableHelper(newIterable, context, newCreateOptions)
    }

    private fun set(key: String, value: Any?) {
        val options = createOptions?.options ?: Document()
        options[key] = value
        convert(iterable, aggregateConverters, aggregateDefaultConverter, options, key)
    }

    override fun batchSize(v: Int) = set("batchSize", v)
    override fun maxTimeMS(v: Long) = set("maxTimeMS", v)
    override fun comment(v: String) = set("comment", v)
    override fun hint(v: Document) = set("hint", v)
    override fun collation(v: Document) = set("collation", v)
}

internal fun find(createOptions: FindCreateOptions): FindIterable<Document> {
    val coll = createOptions.collection
    val db = createOptions.db
    val find = createOptions.find
    val iterable = db.getCollection(coll).find(find)
    convert(iterable, findConverters, findDefaultConverter, createOptions.options).getOrThrow()
    return iterable
}

internal fun aggregate(createOptions: AggregateCreateOptions): AggregateIterable<Document> {
    val coll = createOptions.collection
    val db = createOptions.db
    val pipeline = createOptions.pipeline
    val iterable = if (coll == null) db.aggregate(pipeline)
    else db.getCollection(coll).aggregate(pipeline)

    convert(iterable, aggregateConverters, aggregateDefaultConverter, createOptions.options).getOrThrow()
    return iterable
}

internal data class FindCreateOptions(val db: MongoDatabase,
                                      val collection: String,
                                      val find: Document,
                                      val options: Document)

internal class FindIterableHelper(iterable: FindIterable<out Any?>,
                                  context: MongoShellContext,
                                  private val createOptions: FindCreateOptions?)
    : MongoIterableHelper<FindIterable<out Any?>>(iterable, context) {

    override fun readPrev(v: String, tags: List<TagSet>?): FindIterableHelper {
        check(createOptions != null) { "createOptions were not saved" }
        val newDb = if (tags == null) createOptions.db.withReadPreference(ReadPreference.valueOf(v))
        else createOptions.db.withReadPreference(ReadPreference.valueOf(v, tags))
        val newCreateOptions = createOptions.copy(db = newDb)
        val newIterable = find(newCreateOptions)
        return FindIterableHelper(newIterable, context, newCreateOptions)
    }

    private fun set(key: String, value: Any?) {
        val options = createOptions?.options ?: Document()
        options[key] = value
        convert(iterable, findConverters, findDefaultConverter, options, key)
    }

    override fun batchSize(v: Int) = set("batchSize", v)
    override fun allowPartialResults() = set("allowPartialResults", true)
    override fun oplogReplay() = set("oplogReplay", true)
    override fun noCursorTimeout() = set("noCursorTimeout", true)
    override fun maxTimeMS(v: Long) = set("maxTimeMS", v)
    override fun projection(v: Document) = set("projection", v)
    override fun limit(v: Int) = set("limit", v)
    override fun max(v: Document) = set("max", v)
    override fun min(v: Document) = set("min", v)
    override fun skip(v: Int) = set("skip", v)
    override fun comment(v: String) = set("comment", v)
    override fun hint(v: Document) = set("hint", v)
    override fun hint(v: String) = set("hint", v)
    override fun collation(v: Document) = set("collation", v)
    override fun returnKey(v: Boolean) = set("returnKey", v)
    override fun sort(spec: Document) = set("sort", spec)
    override fun tailable() = set("tailable", CursorType.Tailable.toString())

    override fun explain(verbosity: String?): Any? {
        set("explain", true)
        return iterable.first()
    }
}

internal fun helper(iterable: MongoIterable<out Any?>, context: MongoShellContext): MongoIterableHelper<*> {
    return when (iterable) {
        is FindIterable -> FindIterableHelper(iterable, context, null)
        is AggregateIterable -> AggregateIterableHelper(iterable, context, null)
        else -> MongoIterableHelper(iterable, context)
    }
}