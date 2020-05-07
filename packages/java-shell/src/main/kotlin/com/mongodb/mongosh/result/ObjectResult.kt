package com.mongodb.mongosh.result

class ObjectResult(override val value: Map<String, MongoShellResult<*>>) : MongoShellResult<Map<String, MongoShellResult<*>>> {
    override fun toReplString(): String = value.toLiteral()
}