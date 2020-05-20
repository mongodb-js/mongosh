package com.mongodb.mongosh.result

import org.graalvm.polyglot.Value

class MongoShellCollection internal constructor(private val db: Value) {
    fun toReplString(): String = db.getMember("toReplString").execute().asString()
    fun name(): String = toReplString()
    override fun toString(): String = toReplString()
}
