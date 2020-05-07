package com.mongodb.mongosh.result

class ArrayResult(override val value: Array<MongoShellResult<*>>) : MongoShellResult<Array<MongoShellResult<*>>> {
    override fun toReplString(): String = when {
        value.isEmpty() -> "[ ]"
        else -> value.joinToString(prefix = "[ ", postfix = " ]") { it.toLiteral() }
    }
}