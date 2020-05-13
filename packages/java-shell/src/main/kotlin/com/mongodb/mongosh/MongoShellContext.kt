package com.mongodb.mongosh

import com.mongodb.DBRef
import com.mongodb.client.MongoClient
import com.mongodb.client.result.UpdateResult
import com.mongodb.mongosh.result.*
import com.mongodb.mongosh.service.Either
import com.mongodb.mongosh.service.JavaServiceProvider
import com.mongodb.mongosh.service.Left
import com.mongodb.mongosh.service.Right
import org.bson.BsonValue
import org.bson.Document
import org.bson.json.JsonReader
import org.bson.types.*
import org.graalvm.polyglot.Context
import org.graalvm.polyglot.Source
import org.graalvm.polyglot.Value
import org.graalvm.polyglot.proxy.ProxyExecutable
import org.graalvm.polyglot.proxy.ProxyObject
import org.graalvm.polyglot.proxy.ProxyObject.fromMap
import org.intellij.lang.annotations.Language
import java.io.Closeable
import java.time.LocalDateTime
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeFormatterBuilder
import java.time.temporal.ChronoField
import java.time.temporal.TemporalAccessor
import java.time.temporal.TemporalField
import java.time.temporal.UnsupportedTemporalTypeException
import java.util.*
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
    private val bsonTypes: BsonTypes

    /** Java functions don't have js methods such as apply, bind, call etc.
     * So we need to create a real js function that wraps Java code */
    private val functionProducer = eval("(fun) => function inner() { return fun(...arguments); }")

    init {
        eval(MongoShell::class.java.getResource("/js/all-standalone.js").readText())
        val context = ctx.getBindings("js")
        val global = context["_global"]!!
        context.removeMember("_global")
        val mapper = global["Mapper"]!!.newInstance(serviceProvider)
        val shellBson = global["ShellBson"]!!
        initContext(context, mapper, shellBson)
        mapper.putMember("context", context)
        databaseClass = global["Database"]!!
        collectionClass = global["Collection"]!!
        cursorClass = global["Cursor"]!!
        aggregationCursorClass = global["AggregationCursor"]!!
        insertOneResultClass = global["InsertOneResult"]!!
        commandResultClass = global["CommandResult"]!!
        updateResultClass = global["UpdateResult"]!!
        deleteResultClass = global["DeleteResult"]!!
        bulkWriteResultClass = global["BulkWriteResult"]!!
        bsonTypes = BsonTypes(
                eval("new MaxKey().constructor"),
                eval("new MinKey().constructor"),
                eval("new ObjectId().constructor"),
                eval("new NumberDecimal().constructor"),
                eval("new Timestamp().constructor"),
                eval("new Code().constructor"),
                eval("new DBRef('').constructor"),
                eval("new Symbol('').constructor"),
                eval("new NumberLong().constructor"),
                eval("new BinData(0, '').constructor"),
                eval("new HexData(0, '').constructor"))
    }

    private fun initContext(context: Value, mapper: Value, shellBson: Value) {
        context.putMember("use", mapper["use"]!!.invokeMember("bind", mapper))
        context.putMember("show", mapper["show"]!!.invokeMember("bind", mapper))
        context.putMember("it", mapper["it"]!!.invokeMember("bind", mapper))
        context.putMember("db", mapper["databases"]!!["test"]!!)
        eval("(a, b) => Object.assign(a, b);").execute(context, shellBson)
        context.removeMember("Date")
        context.putMember("Date", eval("(dateHelper) => function inner() { return dateHelper(new.target !== undefined, ...arguments) }")
                .execute(ProxyExecutable { args -> dateHelper(args[0].asBoolean(), args.drop(1)) }))
        context.putMember("ISODate", functionProducer.execute(ProxyExecutable { args -> dateHelper(true, args.toList()) }))
        context["Date"]!!.putMember("now", ProxyExecutable { System.currentTimeMillis() })
    }

    private fun dateHelper(createObject: Boolean, args: List<Value>): Any {
        val date = when {
            args.isEmpty() -> Date(System.currentTimeMillis())
            args.size == 1 -> {
                when (val v = extract(args[0]).value) {
                    is String -> parseDate(v)
                    is Number -> Date(v.toLong())
                    else -> throw IllegalArgumentException("Expected number of string. Got: ${args[0]} ($v)")
                }
            }
            else -> {
                if (args.any { !it.fitsInInt() }) throw IllegalArgumentException("Expected list of numbers. Got: ${args}")
                else {
                    val localDateTime = LocalDateTime.of(args[0].asInt(), args.getOrNull(1)?.asInt() ?: 1,
                            args.getOrNull(2)?.asInt() ?: 1, args.getOrNull(3)?.asInt() ?: 0,
                            args.getOrNull(4)?.asInt() ?: 0, args.getOrNull(5)?.asInt() ?: 0,
                            args.getOrNull(6)?.asInt() ?: 0)
                    Date(localDateTime.atZone(ZoneOffset.UTC).toInstant().toEpochMilli())
                }
            }
        }
        return if (createObject) date else DATE_FORMATTER.format(date.toInstant().atZone(ZoneOffset.UTC).toLocalDateTime())
    }

    private fun parseDate(str: String): Date {
        val accessor = DATE_FORMATTER.parse(str)
        val localDateTime = LocalDateTime.of(
                accessor.safeGet(ChronoField.YEAR) ?: 0,
                accessor.safeGet(ChronoField.MONTH_OF_YEAR) ?: 1,
                accessor.safeGet(ChronoField.DAY_OF_MONTH) ?: 1,
                accessor.safeGet(ChronoField.HOUR_OF_DAY) ?: 0,
                accessor.safeGet(ChronoField.MINUTE_OF_HOUR) ?: 0,
                accessor.safeGet(ChronoField.SECOND_OF_MINUTE) ?: 0,
                accessor.safeGet(ChronoField.NANO_OF_SECOND) ?: 0)
        return Date(localDateTime.atZone(ZoneOffset.UTC).toInstant().toEpochMilli())
    }

    private fun TemporalAccessor.safeGet(field: TemporalField): Int? {
        try {
            return this[field]
        } catch (ignored: UnsupportedTemporalTypeException) {
        }
        return null
    }

    operator fun get(value: String): Value? {
        return ctx.getBindings("js")[value]
    }

    internal operator fun Value.get(identifier: String): Value? {
        return getMember(identifier)
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
            v.instanceOf(insertOneResultClass) -> InsertOneResult(v["acknowleged"]!!.asBoolean(), v["insertedId"]!!.asString())
            v.instanceOf(commandResultClass) -> CommandResult(v["type"]!!.asString(), extract(v["value"]!!).value)
            v.instanceOf(deleteResultClass) -> DeleteResult(v["acknowleged"]!!.asBoolean(), v["deletedCount"]!!.asLong())
            v.instanceOf(bulkWriteResultClass) -> BulkWriteResult(
                    v["acknowledged"]!!.asBoolean(),
                    v["insertedCount"]!!.asLong(),
                    v["matchedCount"]!!.asLong(),
                    v["modifiedCount"]!!.asLong(),
                    v["deletedCount"]!!.asLong(),
                    v["upsertedCount"]!!.asLong(),
                    (extract(v["upsertedIds"]!!) as ArrayResult).value)
            v.instanceOf(updateResultClass) -> {
                val res = if (v["acknowleged"]!!.asBoolean()) {
                    val insertedId = v["insertedId"]
                    UpdateResult.acknowledged(
                            v["matchedCount"]!!.asLong(),
                            v["modifiedCount"]!!.asLong(),
                            if (insertedId == null || insertedId.isNull) null else insertedId.asHostObject<BsonValue>()
                    )
                } else UpdateResult.unacknowledged()
                MongoShellUpdateResult(res)
            }
            v.instanceOf("RegExp") -> {
                val pattern = v["source"]!!.asString()
                val flags1 = v["flags"]!!.asString()
                var f = 0
                if (flags1.contains('m')) f = f.or(Pattern.MULTILINE)
                if (flags1.contains('i')) f = f.or(Pattern.CASE_INSENSITIVE)
                PatternResult(Pattern.compile(pattern, f))
            }
            v.instanceOf(bsonTypes.maxKey) -> MaxKeyResult()
            v.instanceOf(bsonTypes.minKey) -> MinKeyResult()
            v.instanceOf(bsonTypes.objectId) -> ObjectIdResult(JsonReader(v.invokeMember("toExtendedJSON").toString()).readObjectId())
            v.instanceOf(bsonTypes.numberDecimal) -> Decimal128Result(JsonReader(v.invokeMember("toExtendedJSON").toString()).readDecimal128())
            v.instanceOf(bsonTypes.symbol) -> SymbolResult(Symbol(JsonReader(v.invokeMember("toExtendedJSON").toString()).readSymbol()))
            v.instanceOf(bsonTypes.timestamp) -> {
                val timestamp = JsonReader(extract(v.invokeMember("toExtendedJSON")).value.toLiteral()).readTimestamp()
                BSONTimestampResult(BSONTimestamp(timestamp.time, timestamp.inc))
            }
            v.instanceOf(bsonTypes.code) -> {
                val scope = extract(v["scope"]!!).value as? Document
                val code = v["code"]!!.asString()
                if (scope == null) CodeResult(Code(code))
                else CodeWithScopeResult(CodeWithScope(code, scope))
            }
            v.instanceOf(bsonTypes.dbRef) -> {
                val databaseName = v["db"]?.let { if (it.isNull) null else it }?.asString()
                val collectionName = v["collection"]!!.asString()
                val value = extract(v["oid"]!!).value
                DBRefResult(DBRef(databaseName, collectionName, value))
            }
            v.instanceOf(bsonTypes.numberLong) -> LongResult(JsonReader(v.invokeMember("toExtendedJSON").toString()).readInt64())
            v.instanceOf(bsonTypes.binData) -> {
                val binary = JsonReader(v.invokeMember("toExtendedJSON").toString()).readBinaryData()
                BinaryResult(Binary(binary.type, binary.data))
            }
            v.instanceOf(bsonTypes.hexData) -> {
                val binary = JsonReader(v.invokeMember("toExtendedJSON").toString()).readBinaryData()
                BinaryResult(Binary(binary.type, binary.data))
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
            v.isHostObject && v.asHostObject<Any?>() is UUID -> UUIDResult(v.asHostObject())
            v.isHostObject && v.asHostObject<Any?>() is Date -> DateResult(v.asHostObject())
            v.hasArrayElements() -> ArrayResult((0 until v.arraySize).map { extract(v.getArrayElement(it)).value })
            v.canExecute() -> FunctionResult
            v.hasMembers() -> DocumentResult(Document(v.memberKeys.associateWith { key -> extract(v[key]!!).value })) // todo: handle recursion
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

    private fun Value.instanceOf(clazz: Value?): Boolean {
        return clazz != null && eval("(o, clazz) => o instanceof clazz").execute(this, clazz).asBoolean()
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

private data class BsonTypes(
        val maxKey: Value,
        val minKey: Value,
        val objectId: Value,
        val numberDecimal: Value,
        val timestamp: Value,
        val code: Value,
        val dbRef: Value,
        val symbol: Value,
        val numberLong: Value,
        val binData: Value,
        val hexData: Value)

/**
 * yyyy-MM-dd['T'HH:mm:ss.SSS['Z']]
 */
private val DATE_FORMATTER = DateTimeFormatterBuilder()
        .parseCaseInsensitive()
        .append(DateTimeFormatter.ISO_LOCAL_DATE)
        .optionalStart()
        .appendLiteral('T')
        .append(DateTimeFormatter.ISO_LOCAL_TIME)
        .optionalStart()
        .appendLiteral('Z')
        .optionalEnd()
        .optionalEnd()
        .toFormatter()