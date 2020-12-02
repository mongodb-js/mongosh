package com.mongodb.mongosh.result

import com.mongodb.DBRef
import com.mongodb.util.JSONSerializers
import org.apache.commons.text.StringEscapeUtils
import org.bson.BsonUndefined
import org.bson.types.*
import java.util.*


internal fun String.quote(): String {
    return "\"" + StringEscapeUtils.escapeJava(this) + "\""
}

internal fun Any?.toLiteral(): String = when (this) {
    null -> "null"
    is Map<*, *> -> this.toLiteral()
    is Collection<*> -> this.toLiteral()
    is String -> this.quote()
    is BsonUndefined -> "undefined"
    is DBRef,
    is BSONTimestamp,
    is Decimal128,
    is Code,
    is Binary,
    is Date,
    is CodeWithScope,
    is MinKey,
    is MaxKey -> {
        val sb = StringBuilder()
        JSONSerializers.getStrict().serialize(this, sb)
        sb.toString()
    }
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
