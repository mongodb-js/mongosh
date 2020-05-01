package com.mongodb.mongosh

import com.mongodb.ConnectionString
import com.mongodb.MongoClientSettings
import com.mongodb.client.MongoClients
import com.mongodb.mongosh.result.*
import org.junit.Assert.*
import java.io.File
import java.io.IOException
import java.util.regex.Pattern

private const val pathToUri = "src/test/resources/URI.txt"
internal const val DB = "admin"

fun createMongoRepl(): MongoShell {
    val uri = File(pathToUri).readText()
    if (uri.isBlank()) {
        fail("Specify MongoDB connection URI in $pathToUri")
    }

    val settings = MongoClientSettings.builder()
            .applyConnectionString(ConnectionString(uri))
            .build()

    return MongoShell(MongoClients.create(settings))
}

fun getTestNames(testDataPath: String): List<String> {
    return File(testDataPath).listFiles()!!
            .filter { it.name.endsWith(".js") }
            .map { it.name.substring(0, it.name.length - ".js".length) }
}

fun doTest(testName: String, shell: MongoShell, testDataPath: String, db: String? = null) {
    val test: String = File("$testDataPath/$testName.js").readText()
    var before: String? = null
    val commands = mutableListOf<Command>()
    var clear: String? = null
    read(test, listOf(
            SectionHandler("before") { value, _ -> before = value },
            SectionHandler("command") { value, properties ->
                val options = CompareOptions(properties["checkResultClass"] == "true", properties["getArrayItem"]?.toInt(), properties["extractProperty"])
                commands.add(Command(value, options))
            },
            SectionHandler("clear") { value, _ -> clear = value }
    ))

    assertFalse("No command found", commands.isEmpty())

    withDb(shell, db) {
        before?.let { shell.eval(it) }
        try {
            val sb = StringBuilder()
            commands.forEach { cmd ->
                if (sb.isNotEmpty()) sb.append("\n")
                try {
                    val result = shell.eval(cmd.command)
                    sb.append(getExpectedValue(result, cmd.options))
                } catch (e: Throwable) {
                    System.err.println("IGNORED:")
                    e.printStackTrace()
                    sb.append(e.javaClass.name).append(": ").append(e.message)
                }
            }
            compare(testDataPath, testName, sb.toString())
        } finally {
            clear?.let { shell.eval(it) }
        }
    }
}

private fun getExpectedValue(result: MongoShellResult, options: CompareOptions): String {
    var result = result
    if (result is CommandResult) result = result.value
    val sb = StringBuilder()
    if (options.checkResultClass) sb.append(result.javaClass.simpleName).append(": ")
    if (options.arrayItem != null) {
        assertTrue("To extract array item result must be an instance of ${ArrayResult::class.java}. Actual: ${result.javaClass}", result is ArrayResult)
        result = (result as ArrayResult).value[options.arrayItem]
    }
    if (options.extractProperty != null) {
        assertTrue("To extract property result must be an instance of ${DocumentResult::class.java} or ${ObjectResult::class.java}. Actual: ${result.javaClass}",
                result is DocumentResult || result is ObjectResult)
        val value = when (result) {
            is DocumentResult -> result.value[options.extractProperty]
            is ObjectResult -> result.value[options.extractProperty]
            else -> throw AssertionError()
        }
        assertNotNull("Result does not contain property ${options.extractProperty}. Result: ${result.toReplString()}", value)
        sb.append((value as? MongoShellResult)?.toReplString() ?: value.toString())
    } else {
        sb.append(result.toReplString())
    }
    return sb.toString()
}

private class Command(val command: String, val options: CompareOptions)
private class CompareOptions(val checkResultClass: Boolean, val arrayItem: Int?, val extractProperty: String?)

private fun withDb(shell: MongoShell, name: String?, block: () -> Unit) {
    val oldDb = if (name != null) (shell.eval("db") as DatabaseResult).value.name() else null
    if (name != null) shell.eval("use $name")

    block()

    if (oldDb != null) shell.eval("use $oldDb")
}

@Throws(IOException::class)
private fun compare(testDataPath: String, name: String, actual: String) {
    val expectedFile = File("$testDataPath/$name.expected.txt")
    val normalized = replaceId(actual).trim()
    if (!expectedFile.exists()) {
        assertTrue(expectedFile.createNewFile())
        expectedFile.writeText(normalized)
        fail("Created output file $expectedFile")
    } else {
        assertEquals(expectedFile.readText().trim(), normalized)
    }
}

private val MONGO_ID_PATTERN = Pattern.compile("[0-9a-f]{24}")

private fun replaceId(value: String): String {
    return MONGO_ID_PATTERN.matcher(value).replaceAll("<ObjectID>")
}

private val HEADER_PATTERN = Pattern.compile("//\\s*(?<name>\\S+)(?<properties>(\\s+\\S+)+)?")

class SectionHandler(val sectionName: String, val valueConsumer: (String, Map<String, String>) -> Unit)

private fun read(text: String, handlers: List<SectionHandler>) {
    var currentHandler: SectionHandler? = null
    var currentProperties = mapOf<String, String>()
    val currentSection = StringBuilder()
    text.split("\n").forEach { line ->
        val matcher = HEADER_PATTERN.matcher(line.trim())
        if (matcher.matches()) {
            currentHandler?.valueConsumer?.invoke(currentSection.toString(), currentProperties)
            currentSection.setLength(0)
            val headerName = matcher.group("name")
            currentHandler = handlers.find { it.sectionName == headerName }
            val props = matcher.group("properties")
            currentProperties = props?.trim()?.split(Pattern.compile("\\s+"))
                    ?.associate { property ->
                        val eq = property.indexOf('=')

                        if (eq == -1) property to "true"
                        else property.substring(0, eq) to property.substring(eq + 1)
                    }
                    ?: mapOf()
        } else {
            if (currentSection.isNotEmpty()) currentSection.append("\n")
            currentSection.append(line)
        }
    }
    currentHandler?.valueConsumer?.invoke(currentSection.toString(), currentProperties)
}

