package com.mongodb.mongosh

import com.mongodb.client.MongoClient
import com.mongodb.mongosh.result.MongoShellResult

class MongoShell(client: MongoClient) {
    private val context = MongoShellContext(client)

    fun eval(script: String): MongoShellResult<*> {
        val result = context.unwrapPromise(context.eval(script, "user_script"))
        val value = result.getMember("value")
        val type = result.getMember("type")
        return context.extract(value, if (type.isString) type.asString() else null)
    }

    fun close() = context.close()
}
