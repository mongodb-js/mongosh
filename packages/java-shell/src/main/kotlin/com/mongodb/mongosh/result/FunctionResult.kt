package com.mongodb.mongosh.result

class FunctionResult : MongoShellResult<String> {
    override val value: String
        get() = "js function"
}
