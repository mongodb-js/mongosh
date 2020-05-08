package com.mongodb.mongosh.result


interface MongoShellResult<T> {
    val value: T
    fun toReplString(): String = value.toLiteral()
}

