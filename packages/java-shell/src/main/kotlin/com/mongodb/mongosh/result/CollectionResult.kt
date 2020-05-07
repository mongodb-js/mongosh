package com.mongodb.mongosh.result

import org.graalvm.polyglot.Value

class CollectionResult internal constructor(override val value: Collection) : MongoShellResult<Collection> {
    override fun toReplString() = value.toReplString()
}

class Collection internal constructor(private val db: Value) {
    fun toReplString(): String = db.getMember("toReplString").execute().asString()
    fun name(): String = toReplString()
}
