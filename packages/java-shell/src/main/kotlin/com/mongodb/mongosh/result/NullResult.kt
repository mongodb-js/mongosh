package com.mongodb.mongosh.result


object NullResult : MongoShellResult<Any?> {
    override fun toReplString() = "null"
    override val value: Any?
        get() = null
}
