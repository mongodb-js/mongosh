package com.mongodb.mongosh.result

class CommandResult(val type: String, val response: MongoShellResult<*>) : MongoShellResult<Map<String, Any>> {
    override val value: Map<String, Any>
        get() = mapOf("type" to type, "value" to response)
}