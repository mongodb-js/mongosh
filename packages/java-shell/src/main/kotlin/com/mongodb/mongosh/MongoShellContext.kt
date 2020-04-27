package com.mongodb.mongosh

import com.mongodb.client.MongoClient
import com.mongodb.mongosh.result.*
import com.mongodb.mongosh.result.Collection
import com.mongodb.mongosh.service.CliServiceProvider
import org.bson.Document
import org.graalvm.polyglot.Context
import org.graalvm.polyglot.Source
import org.graalvm.polyglot.Value
import org.graalvm.polyglot.proxy.ProxyExecutable
import org.intellij.lang.annotations.Language
import java.io.Closeable
import java.util.concurrent.CompletableFuture

internal class MongoShellContext(client: MongoClient) : Closeable {
    private val ctx: Context = Context.create()
    private val cliServiceProvider = CliServiceProvider(client, this)
    private val databaseClass: Value
    private val collectionClass: Value
    private val cursorClass: Value
    private val insertOneResultClass: Value
    private val deleteResultClass: Value

    init {
        eval(MongoShell::class.java.getResource("/js/all-standalone.js").readText())
        val context = ctx.getBindings("js")
        val global = context.getMember("_global")
        context.removeMember("_global")
        val mapper = global.getMember("Mapper").newInstance(cliServiceProvider)
        initContext(context, mapper)
        mapper.putMember("context", context)
        databaseClass = global.getMember("Database")
        collectionClass = global.getMember("Collection")
        cursorClass = global.getMember("Cursor")
        insertOneResultClass = global.getMember("InsertOneResult")
        deleteResultClass = global.getMember("DeleteResult")
    }

    private fun initContext(context: Value, mapper: Value) {
        context.putMember("use", mapper.getMember("use").invokeMember("bind", mapper))
        context.putMember("show", mapper.getMember("show").invokeMember("bind", mapper))
        context.putMember("it", mapper.getMember("it").invokeMember("bind", mapper))
        context.putMember("db", mapper.getMember("databases").getMember("test"))
    }

    internal operator fun get(value: String): Value? {
        return ctx.getBindings("js").getMember(value)
    }

    internal fun toCompletableFuture(v: Value): CompletableFuture<out MongoShellResult> {
        return if (!v.isPromise()) CompletableFuture.completedFuture(extract(v))
        else CompletableFuture<MongoShellResult>().also { future ->
            v.invokeMember("then", ProxyExecutable { args ->
                future.complete(extract(args[0]))
            }).invokeMember("catch", ProxyExecutable { args ->
                future.completeExceptionally(Exception(args[0].toString()))
            })
        }
    }

    internal fun extract(v: Value): MongoShellResult {
        return when {
            v.instanceOf(databaseClass) -> DatabaseResult(Database(v))
            v.instanceOf(collectionClass) -> CollectionResult(Collection(v))
            v.instanceOf(cursorClass) -> CursorResult(Cursor(v, this))
            v.instanceOf(insertOneResultClass) -> InsertOneResult(v.getMember("acknowleged").asBoolean(), v.getMember("insertedId").asString())
            v.instanceOf(deleteResultClass) -> DeleteResult(v.getMember("acknowleged").asBoolean(), v.getMember("deletedCount").asLong())
            v.isString -> StringResult(v.asString())
            v.isBoolean -> BooleanResult(v.asBoolean())
            v.fitsInInt() -> IntResult(v.asInt())
            v.fitsInLong() -> LongResult(v.asLong())
            v.fitsInFloat() -> FloatResult(v.asFloat())
            v.fitsInDouble() -> DoubleResult(v.asDouble())
            v.isNull -> NullResult
            v.isHostObject && v.asHostObject<Any?>() is Document -> DocumentResult(v.asHostObject())
            v.hasArrayElements() -> ArrayResult(Array(v.arraySize.toInt()) { extract(v.getArrayElement(it.toLong())) })
            v.canExecute() -> FunctionResult()
            v.hasMembers() -> ObjectResult(v.memberKeys.associateWith { key -> extract(v.getMember(key)) })
            else -> throw IllegalArgumentException("unknown result: $v")
        }
    }

    internal fun eval(@Language("js") script: String): Value {
        return ctx.eval(Source.create("js", script))
    }

    override fun close() = cliServiceProvider.close()

    private fun Value.instanceOf(clazz: Value): Boolean {
        return eval("(o, clazz) => o instanceof clazz").execute(this, clazz).asBoolean()
    }

    private fun Value.isPromise(): Boolean = eval("(x) => x instanceof Promise").execute(this).asBoolean()
}
