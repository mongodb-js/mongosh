package com.mongodb.mongosh.result

class LongResult(val value: Long) : MongoShellResult() {
    override fun toReplString(): String = value.toString()

    override fun equals(other: Any?): Boolean = this === other || other is LongResult && value == other.value
    override fun hashCode(): Int = value.hashCode()
}