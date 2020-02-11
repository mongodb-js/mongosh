package com.mongodb.mongosh

import com.mongodb.client.MongoClient
import com.mongodb.mongosh.result.MongoShellResult
import java.io.Closeable
import java.util.concurrent.CompletableFuture

private val USE_COMMAND = Regex("use\\s+\"?([^\"]*)\"?")

class MongoShell(client: MongoClient) : Closeable {
    private val context = MongoShellContext(client)

    fun eval(script: String): CompletableFuture<out MongoShellResult> {
        val s = script.trim()
        if (s == "help" || s == "help()") {
            val help = requireNotNull(context["help"], { "Context should contain 'help' function" })
            return CompletableFuture.completedFuture(context.extract(help.execute()))
        }
        context.updateContext()
        val res = USE_COMMAND.matchEntire(s)
        if (res != null) {
            val use = requireNotNull(context["use"], { "Context should contain 'use' function" })
            return CompletableFuture.completedFuture(context.extract(use.execute(res.groups[1]!!.value)))
        }
        return context.toCompletableFuture(context.eval(s))
    }

    override fun close() = context.close()
}
