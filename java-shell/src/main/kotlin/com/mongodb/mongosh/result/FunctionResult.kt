package com.mongodb.mongosh.result

class FunctionResult : MongoShellResult() {
    override fun toReplString() = "js function"
}
