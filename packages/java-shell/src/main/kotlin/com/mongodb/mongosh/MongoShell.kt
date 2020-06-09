package com.mongodb.mongosh

import com.mongodb.client.MongoClient
import com.mongodb.mongosh.result.MongoShellResult
import java.io.Closeable

private val USE_COMMAND = Regex("use\\s+\"?([^\"]*)\"?")
private val SHOW_COMMAND = Regex("show\\s+\"?([^\"]*)\"?")

class MongoShell(client: MongoClient) : Closeable {
    private val context = MongoShellContext(client)

    fun eval(script: String): MongoShellResult<*> {
        val s = script.trim()
        if (s == "help" || s == "help()") {
            val help = requireNotNull(context["help"], { "Context should contain 'help' function" })
            return context.extract(help.execute())
        }
        val res = USE_COMMAND.matchEntire(s)
        if (res != null) {
            val use = requireNotNull(context["use"], { "Context should contain 'use' function" })
            return context.extract(use.execute(res.groups[1]!!.value))
        }
        val showRes = SHOW_COMMAND.matchEntire(s)
        if (showRes != null) {
            val show = requireNotNull(context["show"], { "Context should contain 'show' function" })
            return context.extract(show.execute(showRes.groups[1]!!.value))
        }
        return context.extract(context.eval(s, "user_script"))
    }

    override fun close() = context.close()
}
