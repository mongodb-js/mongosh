package com.mongodb.mongosh

/**
 * console.log() and print()
 */
internal class ConsoleLogSupport(context: MongoShellContext, converter: MongoShellConverter) {
    private var printedValues: MutableList<List<Any?>>? = null

    init {
        val print = context.jsFun { args ->
            printedValues?.add(args.map { converter.toJava(it).value })
        }
        // TODO: These should specify an EvaluationListener, not modify
        // the context directly
        context.bindings["print"] = print
        @Suppress("JSPrimitiveTypeWrapperUsage")
        val console = context.eval("new Object()")
        console["log"] = print
        console["warn"] = print
        console["error"] = print
        console["info"] = print
        context.bindings["console"] = console
    }

    fun <T> withConsoleLogEnabled(printedValues: MutableList<List<Any?>>, func: () -> T): T {
        this.printedValues = printedValues
        try {
            return func()
        } finally {
            this.printedValues = null
        }
    }
}
