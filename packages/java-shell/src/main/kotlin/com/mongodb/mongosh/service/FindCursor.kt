package com.mongodb.mongosh.service

import com.mongodb.client.FindIterable
import com.mongodb.client.model.Collation
import com.mongodb.mongosh.MongoShellContext
import org.bson.Document
import org.graalvm.polyglot.HostAccess
import org.graalvm.polyglot.Value


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

    @JvmField
    @HostAccess.Export
    val collation = jsFun<FindCursor> { args ->
        checkQueryNotExecuted()
        if (args.isEmpty() || !args[0].hasMembers()) {
            throw IllegalArgumentException("Expected one argument of type object. Got: $args")
        }
        val collation = convert(context, Collation.builder(), collationConverters, collationDefaultConverter, args[0])
                .getOrThrow()
                .build()
        iterable.collation(collation)
        this
    }
}
