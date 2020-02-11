package com.mongodb.mongosh

import com.mongodb.ConnectionString
import com.mongodb.MongoClientSettings
import com.mongodb.client.MongoClients
import com.mongodb.mongosh.result.DatabaseResult
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

fun doTest(testName: String, shell: MongoShell, testDataPath: String, testResultClass: Boolean = false, db: String? = null) {
    val test: String = File("$testDataPath/$testName.js").readText()
    var before: String? = null
    val commands = mutableListOf<String>()
    var clear: String? = null
    read(test, listOf(
            SectionHandler("before") { before = it },
            SectionHandler("command") { commands.add(it) },
            SectionHandler("clear") { clear = it }
    ))

    assertFalse("No command found", commands.isEmpty())

    withDb(shell, db) {
        before?.let { shell.eval(it) }
        try {
            val sb = StringBuilder()
            commands.forEach { cmd ->
                if (sb.isNotEmpty()) sb.append("\n")
                try {
                    val result = shell.eval(cmd).get()
                    if (testResultClass) sb.append(result.javaClass.simpleName).append(": ")
                    sb.append(result.toReplString())
                } catch (e: Exception) {
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

private fun withDb(shell: MongoShell, name: String?, block: () -> Unit) {
    val oldDb = if (name != null) (shell.eval("db").get() as DatabaseResult).value.name() else null
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

private val HEADER_PATTERN = Pattern.compile("//\\s*(.*)")

class SectionHandler(val sectionName: String, val valueConsumer: (String) -> Unit)

private fun read(text: String, handlers: List<SectionHandler>) {
    var currentHandler: SectionHandler? = null
    val currentSection = StringBuilder()
    text.split("\n").forEach { line ->
        val matcher = HEADER_PATTERN.matcher(line.trim())
        if (matcher.matches()) {
            currentHandler?.valueConsumer?.invoke(currentSection.toString())
            currentSection.setLength(0)
            val headerName = matcher.group(1)
            currentHandler = handlers.find { it.sectionName == headerName }
        } else {
            if (currentSection.isNotEmpty()) currentSection.append("\n")
            currentSection.append(line)
        }
    }
    currentHandler?.valueConsumer?.invoke(currentSection.toString())
}

