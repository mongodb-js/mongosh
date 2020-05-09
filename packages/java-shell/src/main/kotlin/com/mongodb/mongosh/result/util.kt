package com.mongodb.mongosh.result

import org.apache.commons.text.StringEscapeUtils


internal fun MongoShellResult<*>.toLiteral(): String {
    return when (this) {
        is StringResult -> this.value.quote()
        else -> this.toReplString()
    }
}

internal fun String.quote(): String {
    return "\"" + StringEscapeUtils.escapeJava(this) + "\""
}

internal fun Any?.toLiteral(): String = when (this) {
    null -> "null"
    is Map<*, *> -> this.toLiteral()
    is Collection<*> -> this.toLiteral()
    is String -> this.quote()
    else -> toString()
}

internal fun Collection<*>.toLiteral(): String = when {
    isEmpty() -> "[ ]"
    else -> joinToString(prefix = "[ ", postfix = " ]") { it.toLiteral() }
}

internal fun Map<*, *>.toLiteral(): String = when {
    isEmpty() -> "{ }"
    else -> entries.joinToString(prefix = "{ ", postfix = " }") { (key, v) ->
        val value = v.toLiteral()
        "${key.toString().quote()}: $value"
    }
}
