package com.mongodb.mongosh.result

class DoubleResult(val value: Double) : MongoShellResult() {
    override fun toReplString(): String = value.toString()

    override fun equals(other: Any?): Boolean = this === other || other is DoubleResult && value == other.value
    override fun hashCode(): Int = value.hashCode()
}