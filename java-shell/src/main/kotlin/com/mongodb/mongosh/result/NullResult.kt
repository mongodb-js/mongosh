package com.mongodb.mongosh.result


object NullResult : MongoShellResult() {
    override fun toReplString() = "null"
}
