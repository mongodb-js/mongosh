package com.mongodb.mongosh.result


class StringResult(val value: String) : MongoShellResult() {
    override fun toReplString(): String = value

    override fun toString(): String {
        return "${javaClass.simpleName}(${value.quote()})"
    }

    override fun equals(other: Any?): Boolean = this === other || other is StringResult && value == other.value
    override fun hashCode(): Int = value.hashCode()
}
