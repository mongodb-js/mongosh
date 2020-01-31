package com.mongodb.mongosh.result


class IntResult(val value: Int) : MongoShellResult() {
    override fun toReplString(): String = value.toString()

    override fun equals(other: Any?): Boolean = this === other || other is IntResult && value == other.value
    override fun hashCode(): Int = value.hashCode()
}
