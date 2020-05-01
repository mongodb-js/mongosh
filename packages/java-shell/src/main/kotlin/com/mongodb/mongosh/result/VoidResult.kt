package com.mongodb.mongosh.result

class VoidResult : MongoShellResult() {
    override fun toReplString(): String = ""
}