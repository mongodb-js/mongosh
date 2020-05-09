package com.mongodb.mongosh

import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized

@RunWith(Parameterized::class)
class CursorTest(private val testName: String) : ShellTestCase() {
    companion object {
        private const val TEST_DATA_PATH = "src/test/resources/cursor"

        @JvmStatic
        @Parameterized.Parameters(name = "{0}")
        fun fileNames(): Collection<*> {
            return getTestNames(TEST_DATA_PATH).map { arrayOf(it) }
        }
    }

    @Test
    fun test() {
        withShell { shell ->
            doTest(testName, shell, TEST_DATA_PATH, db = DB)
        }
    }
}
