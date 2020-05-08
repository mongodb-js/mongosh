package com.mongodb.mongosh.result


class IntResult(override val value: Int) : MongoShellResult<Int> {
    override fun equals(other: Any?): Boolean = this === other || other is IntResult && value == other.value
    override fun hashCode(): Int = value.hashCode()
}
