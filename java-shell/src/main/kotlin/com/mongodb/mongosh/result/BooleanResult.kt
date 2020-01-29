package com.mongodb.mongosh.result


class BooleanResult(val value: Boolean) : MongoShellResult() {
    override fun toReplString(): String = value.toString()

    override fun equals(other: Any?): Boolean = this === other || other is BooleanResult && value == other.value
    override fun hashCode(): Int = value.hashCode()
}
