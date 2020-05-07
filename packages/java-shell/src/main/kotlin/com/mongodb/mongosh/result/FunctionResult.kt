package com.mongodb.mongosh.result

class FunctionResult : MongoShellResult<String> {
    override fun toReplString() = value
    override val value: String
        get() = "js function"
}
