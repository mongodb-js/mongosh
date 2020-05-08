package com.mongodb.mongosh.result


class BooleanResult(override val value: Boolean) : MongoShellResult<Boolean> {
    override fun equals(other: Any?): Boolean = this === other || other is BooleanResult && value == other.value
    override fun hashCode(): Int = value.hashCode()
}
