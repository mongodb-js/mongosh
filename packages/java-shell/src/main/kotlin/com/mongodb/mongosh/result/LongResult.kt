package com.mongodb.mongosh.result

class LongResult(override val value: Long) : MongoShellResult<Long> {
    override fun toReplString(): String = value.toString()

    override fun equals(other: Any?): Boolean = this === other || other is LongResult && value == other.value
    override fun hashCode(): Int = value.hashCode()
}