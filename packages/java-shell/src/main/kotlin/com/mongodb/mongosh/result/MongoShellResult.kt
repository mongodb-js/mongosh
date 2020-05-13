package com.mongodb.mongosh.result

import com.mongodb.DBRef
import com.mongodb.client.result.UpdateResult
import org.bson.Document
import org.bson.types.*
import java.util.*
import java.util.regex.Pattern


sealed class MongoShellResult<T> {
    abstract val value: T
    open fun toReplString(): String = value.toLiteral()
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as MongoShellResult<*>
        return value == other.value
    }

    override fun hashCode(): Int {
        return value?.hashCode() ?: 0
    }
}

class DocumentResult(override val value: Document) : MongoShellResult<Document>()

class ObjectIdResult(override val value: ObjectId) : MongoShellResult<ObjectId>()

class Decimal128Result(override val value: Decimal128) : MongoShellResult<Decimal128>()

class SymbolResult(override val value: Symbol) : MongoShellResult<Symbol>()

class MaxKeyResult : MongoShellResult<MaxKey>() {
    override val value = MaxKey()
}

class MinKeyResult : MongoShellResult<MinKey>() {
    override val value = MinKey()
}

class DBRefResult(override val value: DBRef) : MongoShellResult<DBRef>()

class BSONTimestampResult(override val value: BSONTimestamp) : MongoShellResult<BSONTimestamp>()

class CodeResult(override val value: Code) : MongoShellResult<Code>()

class CodeWithScopeResult(override val value: CodeWithScope) : MongoShellResult<CodeWithScope>()

class BinaryResult(override val value: Binary) : MongoShellResult<Binary>()

class UUIDResult(override val value: UUID) : MongoShellResult<UUID>()

class DateResult(override val value: Date) : MongoShellResult<Date>()

class BooleanResult(override val value: Boolean) : MongoShellResult<Boolean>()

class DoubleResult(override val value: Double) : MongoShellResult<Double>()

class FloatResult(override val value: Float) : MongoShellResult<Float>()

object FunctionResult : MongoShellResult<String>() {
    override val value: String
        get() = "js function"
}

class IntResult(override val value: Int) : MongoShellResult<Int>()

class LongResult(override val value: Long) : MongoShellResult<Long>()

object NullResult : MongoShellResult<Any?>() {
    override val value: Any?
        get() = null
}

object VoidResult : MongoShellResult<Unit>() {
    override fun toReplString(): String = ""
    override val value: Unit
        get() = Unit
}

class StringResult(override val value: String) : MongoShellResult<String>() {
    override fun toReplString(): String = value
}

class ArrayResult(override val value: List<Any?>) : MongoShellResult<List<Any?>>()

class PatternResult(override val value: Pattern) : MongoShellResult<Pattern>()

class MongoShellUpdateResult(override val value: UpdateResult) : MongoShellResult<UpdateResult>()

class InsertOneResult(val acknowleged: Boolean, val insertedId: String) : MongoShellResult<Map<String, Any>>() {
    override val value: Map<String, Any>
        get() = mapOf("acknowleged" to acknowleged, "insertedId" to insertedId)
}

class CollectionResult internal constructor(override val value: MongoShellCollection) : MongoShellResult<MongoShellCollection>() {
    override fun toReplString() = value.toReplString()
}

class DatabaseResult internal constructor(override val value: MongoShellDatabase) : MongoShellResult<MongoShellDatabase>() {
    override fun toReplString() = value.toReplString()

    override fun toString(): String {
        return "${javaClass.simpleName}(${value.toReplString().quote()})"
    }
}

class DeleteResult(val acknowleged: Boolean, val deletedCount: Long) : MongoShellResult<Map<String, Any>>() {
    override val value: Map<String, Any>
        get() = mapOf("acknowleged" to acknowleged, "deletedCount" to deletedCount)
}

class BulkWriteResult(val acknowledged: Boolean,
                      val insertedCount: Long,
                      val matchedCount: Long,
                      val modifiedCount: Long,
                      val deletedCount: Long,
                      val upsertedCount: Long,
                      val upsertedIds: List<Any?>) : MongoShellResult<Map<String, Any>>() {
    override val value: Map<String, Any>
        get() = mapOf("acknowledged" to acknowledged,
                "insertedCount" to insertedCount,
                "matchedCount" to matchedCount,
                "modifiedCount" to modifiedCount,
                "deletedCount" to deletedCount,
                "upsertedCount" to upsertedCount,
                "upsertedIds" to upsertedIds)
}

class CommandResult(val type: String, val response: Any?) : MongoShellResult<Map<String, Any?>>() {
    override val value: Map<String, Any?>
        get() = Document("type", type).append("value", response)
}

abstract class CursorResult<T : Cursor>(override val value: T) : MongoShellResult<T>()
class FindCursorResult internal constructor(cursor: FindCursor) : CursorResult<FindCursor>(cursor) {
    override fun toReplString(): String = value.toReplString()
}

class AggregationCursorResult internal constructor(cursor: AggregationCursor) : CursorResult<AggregationCursor>(cursor) {
    override fun toReplString(): String = value.toReplString()
}


