package com.mongodb.mongosh

import com.mongodb.client.MongoClient
import com.mongodb.mongosh.result.MongoShellResult
import java.io.Closeable

class MongoShell(client: MongoClient) : Closeable {
    private val context = MongoShellContext(client)

    fun eval(script: String): MongoShellResult<*> {
        val result = context.unwrapPromise(context.eval(script, "user_script"))
        val value = result.getMember("value")
        val type = result.getMember("type")
        return context.extract(value, if (type.isString) type.asString() else null)
    }

    override fun close() = context.close()
}
