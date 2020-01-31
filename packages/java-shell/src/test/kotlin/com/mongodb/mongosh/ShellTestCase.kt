package com.mongodb.mongosh

import org.junit.After
import org.junit.Assert
import org.junit.Before


abstract class ShellTestCase {
    var mongoShell: MongoShell? = null

    @Before
    fun setup() {
        mongoShell = createMongoRepl()
    }

    @After
    fun teardown() {
        mongoShell?.close()
    }

    protected fun withShell(block: (MongoShell) -> Unit) {
        Assert.assertNotNull("MongoRepl was not initialized", mongoShell)
        mongoShell?.let { block(it) }
    }
}
