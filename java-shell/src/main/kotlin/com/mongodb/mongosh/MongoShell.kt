package com.mongodb.mongosh

import com.mongodb.client.MongoClient
import java.io.Closeable
import java.util.concurrent.CompletableFuture
import com.mongodb.mongosh.result.MongoShellResult

class MongoShell(client: MongoClient) : Closeable {
    private val context = MongoShellContext(client)

    fun eval(script: String): CompletableFuture<out MongoShellResult> {
        if (script == "help") {
            return CompletableFuture.completedFuture(context.extract(context.shellApi.invokeMember("help")))
        }
        context.updateContext()
        val res = USE_COMMAND.matchEntire(script)
        if (res != null) {
            return CompletableFuture.completedFuture(context.extract(context.shellApi.getMember("use").execute(res.groups[1]!!.value)))
        }
        val s = if (script.trim() == "help()") "help" else script
        return context.toCompletableFuture(context.eval(s))
    }

    companion object {
        private val USE_COMMAND = Regex("use\\s+\"?([^\"]*)\"?")
    }

    override fun close() = context.close()
}
