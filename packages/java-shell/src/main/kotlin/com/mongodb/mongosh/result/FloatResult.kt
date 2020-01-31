package com.mongodb.mongosh.result

class FloatResult(val value: Float) : MongoShellResult() {
    override fun toReplString(): String = value.toString()

    override fun equals(other: Any?): Boolean = this === other || other is FloatResult && value == other.value
    override fun hashCode(): Int = value.hashCode()
}