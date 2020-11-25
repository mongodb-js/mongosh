package com.mongodb.mongosh

import com.mongodb.client.MongoClient
import com.mongodb.mongosh.result.ArrayResult
import com.mongodb.mongosh.result.MongoShellResult
import org.intellij.lang.annotations.Language

class MongoShell(client: MongoClient) {
    private val evaluator = MongoShellEvaluator(client)

    fun eval(@Language("js") script: String): MongoShellResult<*> {
        val printedValues = mutableListOf<List<Any?>>()
        val result = evaluator.withConsoleLogEnabled(printedValues) {
            evaluator.unwrapPromise(evaluator.eval(script, "user_script"))
        }
        return if (printedValues.isNotEmpty()) {
            // [{"0": <value>, "1": <value>, ...}, {"0": <value>}, ...]
            ArrayResult(printedValues.map { args ->
                var idx = 0
                args.associateBy { (idx++).toString() }
            })
        } else {
            val printable = result.getMember("printable")
            val type = result.getMember("type").toString()
            evaluator.extract(printable, type)
        }
    }

    fun close() = evaluator.close()
}
