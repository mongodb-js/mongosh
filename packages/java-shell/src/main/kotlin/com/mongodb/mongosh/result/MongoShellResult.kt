package com.mongodb.mongosh.result


interface MongoShellResult<T> {
    abstract val value: T
    abstract fun toReplString(): String
}

