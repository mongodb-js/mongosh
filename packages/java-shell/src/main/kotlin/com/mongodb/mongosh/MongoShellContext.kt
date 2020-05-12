package com.mongodb.mongosh

import com.mongodb.client.MongoClient
import com.mongodb.client.result.UpdateResult
import com.mongodb.mongosh.result.*
import com.mongodb.mongosh.result.MongoShellCollection
import com.mongodb.mongosh.service.Either
import com.mongodb.mongosh.service.JavaServiceProvider
import com.mongodb.mongosh.service.Left
import com.mongodb.mongosh.service.Right
import org.bson.BsonValue
import org.bson.Document
import org.bson.types.ObjectId
import org.graalvm.polyglot.Context
import org.graalvm.polyglot.Source
import org.graalvm.polyglot.Value
import org.graalvm.polyglot.proxy.ProxyExecutable
import org.graalvm.polyglot.proxy.ProxyObject
import org.graalvm.polyglot.proxy.ProxyObject.fromMap
import org.intellij.lang.annotations.Language
import java.io.Closeable
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ExecutionException
import java.util.concurrent.TimeUnit
import java.util.regex.Pattern

internal class MongoShellContext(client: MongoClient) : Closeable {
    private val ctx: Context = Context.create()
    private val serviceProvider = JavaServiceProvider(client, this)
    private val databaseClass: Value
    private val collectionClass: Value
    private val cursorClass: Value
    private val aggregationCursorClass: Value
    private val insertOneResultClass: Value
    private val commandResultClass: Value
    private val updateResultClass: Value
    private val deleteResultClass: Value
    private val bulkWriteResultClass: Value

    init {
        eval(MongoShell::class.java.getResource("/js/all-standalone.js").readText())
        val context = ctx.getBindings("js")
        val global = context.getMember("_global")
        context.removeMember("_global")
        val mapper = global.getMember("Mapper").newInstance(serviceProvider)
        initContext(context, mapper)
        mapper.putMember("context", context)
        databaseClass = global.getMember("Database")
        collectionClass = global.getMember("Collection")
        cursorClass = global.getMember("Cursor")
        aggregationCursorClass = global.getMember("AggregationCursor")
        insertOneResultClass = global.getMember("InsertOneResult")
        commandResultClass = global.getMember("CommandResult")
        updateResultClass = global.getMember("UpdateResult")
        deleteResultClass = global.getMember("DeleteResult")
        bulkWriteResultClass = global.getMember("BulkWriteResult")
    }

    private fun initContext(context: Value, mapper: Value) {
        context.putMember("use", mapper.getMember("use").invokeMember("bind", mapper))
        context.putMember("show", mapper.getMember("show").invokeMember("bind", mapper))
        context.putMember("it", mapper.getMember("it").invokeMember("bind", mapper))
        context.putMember("db", mapper.getMember("databases").getMember("test"))
    }

    operator fun get(value: String): Value? {
        return ctx.getBindings("js").getMember(value)
    }

    fun extract(v: Value): MongoShellResult<*> {
        return when {
            v.instanceOf("Promise") -> {
                try {
                    CompletableFuture<MongoShellResult<*>>().also { future ->
                        v.invokeMember("then", ProxyExecutable { args ->
                            future.complete(extract(args[0]))
                        }).invokeMember("catch", ProxyExecutable { args ->
                            val error = args[0]
                            if (error.isHostObject && error.asHostObject<Any>() is Throwable) {
                                future.completeExceptionally(error.asHostObject<Any>() as Throwable)
                            } else {
                                future.completeExceptionally(Exception(error.toString()))
                            }
                        })
                    }.get(1, TimeUnit.SECONDS)
                } catch (e: ExecutionException) {
                    throw e.cause ?: e
                }
            }
            v.instanceOf(databaseClass) -> DatabaseResult(MongoShellDatabase(v))
            v.instanceOf(collectionClass) -> CollectionResult(MongoShellCollection(v))
            v.instanceOf(cursorClass) -> FindCursorResult(FindCursor(v, this))
            v.instanceOf(aggregationCursorClass) -> AggregationCursorResult(AggregationCursor(v, this))
            v.instanceOf(insertOneResultClass) -> InsertOneResult(v.getMember("acknowleged").asBoolean(), v.getMember("insertedId").asString())
            v.instanceOf(commandResultClass) -> CommandResult(v.getMember("type").asString(), extract(v.getMember("value")).value)
            v.instanceOf(deleteResultClass) -> DeleteResult(v.getMember("acknowleged").asBoolean(), v.getMember("deletedCount").asLong())
            v.instanceOf(bulkWriteResultClass) -> BulkWriteResult(
                    v.getMember("ackowledged").asBoolean(), // typo in mongosh
                    v.getMember("insertedCount").asLong(),
                    v.getMember("matchedCount").asLong(),
                    v.getMember("modifiedCount").asLong(),
                    v.getMember("deletedCount").asLong(),
                    v.getMember("upsertedCount").asLong(),
                    (extract(v.getMember("upsertedIds")) as ArrayResult).value)
            v.instanceOf(updateResultClass) -> {
                val res = if (v.getMember("acknowleged").asBoolean()) {
                    val insertedId = v.getMember("insertedId")
                    UpdateResult.acknowledged(
                            v.getMember("matchedCount").asLong(),
                            v.getMember("modifiedCount").asLong(),
                            if (insertedId == null || insertedId.isNull) null else insertedId.asHostObject<BsonValue>()
                    )
                } else UpdateResult.unacknowledged()
                MongoShellUpdateResult(res)
            }
            v.instanceOf("RegExp") -> {
                val pattern = v.getMember("source").asString()
                val flags1 = v.getMember("flags").asString()
                var f = 0
                if (flags1.contains('m')) f = f.or(Pattern.MULTILINE)
                if (flags1.contains('i')) f = f.or(Pattern.CASE_INSENSITIVE)
                PatternResult(Pattern.compile(pattern, f))
            }
            v.isString -> StringResult(v.asString())
            v.isBoolean -> BooleanResult(v.asBoolean())
            v.fitsInInt() -> IntResult(v.asInt())
            v.fitsInLong() -> LongResult(v.asLong())
            v.fitsInFloat() -> FloatResult(v.asFloat())
            v.fitsInDouble() -> DoubleResult(v.asDouble())
            v.isNull -> NullResult
            v.isHostObject && v.asHostObject<Any?>() is Unit -> VoidResult
            v.isHostObject && v.asHostObject<Any?>() is Document -> DocumentResult(v.asHostObject())
            v.isHostObject && v.asHostObject<Any?>() is ObjectId -> ObjectIdResult(v.asHostObject())
            v.hasArrayElements() -> ArrayResult((0 until v.arraySize).map { extract(v.getArrayElement(it)).value })
            v.canExecute() -> FunctionResult
            v.hasMembers() -> DocumentResult(Document(v.memberKeys.associateWith { key -> extract(v.getMember(key)).value })) // todo: handle recursion
            else -> throw IllegalArgumentException("unknown result: $v")
        }
    }

    fun eval(@Language("js") script: String): Value {
        return ctx.eval(Source.create("js", script))
    }

    fun <T> toJsPromise(promise: Either<T>): Value {
        return when (promise) {
            is Right -> eval("(v) => new Promise(((resolve) => resolve(v)))").execute(promise.value)
            is Left -> eval("(v) => new Promise(((_, reject) => reject(v)))").execute(promise.value)
        }
    }

    override fun close() = serviceProvider.close()

    private fun Value.instanceOf(clazz: Value): Boolean {
        return eval("(o, clazz) => o instanceof clazz").execute(this, clazz).asBoolean()
    }

    private fun Value.instanceOf(@Language("js") clazz: String): Boolean = eval("(x) => x instanceof $clazz").execute(this).asBoolean()

    fun toJs(o: Any?): Any? {
        return when (o) {
            is Iterable<*> -> toJs(o)
            is Map<*, *> -> toJs(o)
            else -> o
        }
    }

    private fun toJs(map: Map<*, *>): ProxyObject {
        val convertedMap: Map<String, Any?> = map.entries.asSequence()
                .filter { (key, _) -> key is String }
                .associate { e -> e.key as String to toJs(e.value) }
        return fromMap(convertedMap)
    }

    private fun toJs(list: Iterable<Any?>): Value {
        val array = eval("[]")
        list.forEachIndexed { index, v ->
            array.setArrayElement(index.toLong(), toJs(v))
        }
        return array
    }
}
