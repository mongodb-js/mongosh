package com.mongodb.mongosh

import com.mongodb.client.MongoClient
import com.mongodb.mongosh.result.ArrayResult
import com.mongodb.mongosh.result.MongoShellResult
import org.graalvm.polyglot.Engine
import org.intellij.lang.annotations.Language

class MongoShell(client: MongoClient? = null, engine: Engine? = null) {
    private val context = MongoShellContext(engine)
    private val wrapper = ValueWrapper(context)
    private val converter = MongoShellConverter(context, wrapper)
    private val evaluator = MongoShellEvaluator(client, context, converter, wrapper)
    private val consoleLog = ConsoleLogSupport(context, converter)

    fun setClient(client: MongoClient): Unit = evaluator.setClient(client)

    fun eval(@Language("js") script: String): MongoShellResult<*> {
        val printedValues = mutableListOf<List<Any?>>()
        val result = consoleLog.withConsoleLogEnabled(printedValues) {
            converter.unwrapPromise(evaluator.eval(script, "user_script"))
        }
        return if (printedValues.isNotEmpty()) {
            // [{"0": <value>, "1": <value>, ...}, {"0": <value>}, ...]
            ArrayResult(printedValues.map { args ->
                var idx = 0
                args.associateBy { (idx++).toString() }
            })
        } else {
            val printable = result.getMember("printable")
            val type = result.getMember("type").asString()
            converter.toJava(printable, type)
        }
    }

    fun close() = evaluator.close()
}
