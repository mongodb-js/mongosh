package com.mongodb.mongosh.result


abstract class MongoShellResult {
    abstract fun toReplString(): String
    override fun toString() = "${javaClass.simpleName}(${toReplString()})"
}

