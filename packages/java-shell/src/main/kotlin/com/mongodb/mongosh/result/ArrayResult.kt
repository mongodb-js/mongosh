package com.mongodb.mongosh.result

class ArrayResult(val value: Array<MongoShellResult>) : MongoShellResult() {
    override fun toReplString(): String = when {
        value.isEmpty() -> "[ ]"
        else -> value.joinToString(prefix = "[ ", postfix = " ]") { it.toLiteral() }
    }
}