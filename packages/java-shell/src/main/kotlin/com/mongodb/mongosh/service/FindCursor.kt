package com.mongodb.mongosh.service

import com.mongodb.client.FindIterable
import com.mongodb.mongosh.MongoShellContext
import org.bson.Document
import org.graalvm.polyglot.HostAccess


internal class FindCursor(findIterable: FindIterable<Document>, context: MongoShellContext) : Cursor<FindIterable<Document>>(findIterable, context) {
    @JvmField
    @HostAccess.Export
    val limit = jsFun<FindCursor> { args ->
        checkQueryNotExecuted()
        if (args.isEmpty() || !args[0].fitsInInt()) {
            throw IllegalArgumentException("Expected one argument of type int. Got: $args")
        }
        iterable.limit(args[0].asInt())
        this
    }
}
