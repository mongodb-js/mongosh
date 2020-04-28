package com.mongodb.mongosh.result

class CommandResult(val type: String, val value: MongoShellResult) : MongoShellResult() {
    override fun toReplString(): String = value.toReplString()
}