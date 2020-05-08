package com.mongodb.mongosh.result

import org.graalvm.polyglot.Value

class DatabaseResult internal constructor(override val value: Database) : MongoShellResult<Database> {
    override fun toReplString() = value.toReplString()

    override fun toString(): String {
        return "${javaClass.simpleName}(${value.toReplString().quote()})"
    }
}

class Database internal constructor(private val db: Value) {
    fun toReplString(): String = db.getMember("toReplString").execute().asString()
    fun name(): String = toReplString()
}