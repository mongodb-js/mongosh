package com.mongodb.mongosh.result

import org.apache.commons.text.StringEscapeUtils


internal fun MongoShellResult.toLiteral(): String {
    return when (this) {
        is StringResult -> this.value.quote()
        else -> this.toReplString()
    }
}

internal fun String.quote(): String {
    return "\"" + StringEscapeUtils.escapeJava(this) + "\""
}

internal fun Map<*, *>.toLiteral(): String = when {
    isEmpty() -> "{ }"
    else -> entries.joinToString(prefix = "{ ", postfix = " }") { (key, v) ->
        val value = when (v) {
            is MongoShellResult -> v.toLiteral()
            is String -> v.quote()
            is Map<*, *> -> v.toLiteral()
            else -> v.toString()
        }
        "${key.toString().quote()}: $value"
    }
}
