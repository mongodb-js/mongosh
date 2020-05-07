package com.mongodb.mongosh.result


class StringResult(override val value: String) : MongoShellResult<String> {
    override fun toReplString(): String = value
    override fun equals(other: Any?): Boolean = this === other || other is StringResult && value == other.value
    override fun hashCode(): Int = value.hashCode()
}
