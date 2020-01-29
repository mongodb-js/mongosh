package com.mongodb.mongosh.result

class ObjectResult(val value: Map<String, MongoShellResult>) : MongoShellResult() {
    override fun toReplString(): String = value.toLiteral()
}