package com.mongodb.mongosh.result

import org.graalvm.polyglot.Value

class MongoShellCollection internal constructor(private val db: Value) {
    fun _asPrintable(): String = db.getMember("_asPrintable").execute().asString()
    fun _name(): String = _asPrintable()
    override fun toString(): String = _asPrintable()
}
