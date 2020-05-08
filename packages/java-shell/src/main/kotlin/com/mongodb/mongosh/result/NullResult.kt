package com.mongodb.mongosh.result


object NullResult : MongoShellResult<Any?> {
    override val value: Any?
        get() = null
}
