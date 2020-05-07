package com.mongodb.mongosh.result

class VoidResult : MongoShellResult<Unit> {
    override fun toReplString(): String = ""
    override val value: Unit
        get() = Unit
}