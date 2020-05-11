package com.mongodb.mongosh.result

import com.mongodb.client.result.UpdateResult
import org.bson.Document
import java.util.regex.Pattern


sealed class MongoShellResult<T> {
    abstract val value: T
    open fun toReplString(): String = value.toLiteral()
}

class DocumentResult(override val value: Document) : MongoShellResult<Document>()

class BooleanResult(override val value: Boolean) : MongoShellResult<Boolean>() {
    override fun equals(other: Any?): Boolean = this === other || other is BooleanResult && value == other.value
    override fun hashCode(): Int = value.hashCode()
}

class DoubleResult(override val value: Double) : MongoShellResult<Double>() {
    override fun equals(other: Any?): Boolean = this === other || other is DoubleResult && value == other.value
    override fun hashCode(): Int = value.hashCode()
}

class FloatResult(override val value: Float) : MongoShellResult<Float>() {
    override fun toReplString(): String = value.toString()

    override fun equals(other: Any?): Boolean = this === other || other is FloatResult && value == other.value
    override fun hashCode(): Int = value.hashCode()
}

object FunctionResult : MongoShellResult<String>() {
    override val value: String
        get() = "js function"
}

class IntResult(override val value: Int) : MongoShellResult<Int>() {
    override fun equals(other: Any?): Boolean = this === other || other is IntResult && value == other.value
    override fun hashCode(): Int = value.hashCode()
}

class LongResult(override val value: Long) : MongoShellResult<Long>() {
    override fun equals(other: Any?): Boolean = this === other || other is LongResult && value == other.value
    override fun hashCode(): Int = value.hashCode()
}

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
    override fun equals(other: Any?): Boolean = this === other || other is StringResult && value == other.value
    override fun hashCode(): Int = value.hashCode()
}

class ArrayResult(override val value: List<Any?>) : MongoShellResult<List<Any?>>()

class PatternResult(override val value: Pattern) : MongoShellResult<Pattern>() {
    override fun equals(other: Any?): Boolean = this === other || other is PatternResult && value == other.value
    override fun hashCode(): Int = value.hashCode()
}

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


