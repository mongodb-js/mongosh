package com.mongodb.mongosh.result

import org.graalvm.polyglot.Value

class MongoShellDatabase internal constructor(private val db: Value) {
    fun asPrintable(): String = db.getMember("asPrintable").execute().asString()
    fun name(): String = asPrintable()
}