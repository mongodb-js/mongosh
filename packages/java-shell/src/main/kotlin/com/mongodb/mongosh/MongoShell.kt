package com.mongodb.mongosh

import com.mongodb.client.MongoClient
import com.mongodb.mongosh.result.MongoShellResult
import org.intellij.lang.annotations.Language

class MongoShell(client: MongoClient) {
    private val context = MongoShellContext(client)

    fun eval(@Language("js") script: String): MongoShellResult<*> {
        val result = context.unwrapPromise(context.eval(script, "user_script"))
        val value = result.getMember("rawValue")
        return context.extract(null, value)
    }

    fun close() = context.close()
}
