package com.mongodb.mongosh.result

import org.graalvm.polyglot.Value

class MongoShellCollection internal constructor(private val db: Value) {
    fun asPrintable(): String = db.getMember("asPrintable").execute().asString()
    fun name(): String = asPrintable()
    override fun toString(): String = asPrintable()
}
