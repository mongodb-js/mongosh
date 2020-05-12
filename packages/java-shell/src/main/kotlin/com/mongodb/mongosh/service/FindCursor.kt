package com.mongodb.mongosh.service

import com.mongodb.client.FindIterable
import com.mongodb.client.model.Collation
import com.mongodb.mongosh.MongoShellContext
import org.bson.Document
import org.graalvm.polyglot.HostAccess


internal class FindCursor(findIterable: FindIterable<Document>, context: MongoShellContext) : Cursor<FindIterable<Document>>(findIterable, context) {
    @JvmField
    @HostAccess.Export
    val max = jsFun<FindCursor> { args ->
        checkQueryNotExecuted()
        if (args.isEmpty() || !args[0].hasMembers()) {
            throw IllegalArgumentException("Expected one argument of type object. Got: $args")
        }
        iterable.max(toDocument(context, args[0]))
        this
    }

    @JvmField
    @HostAccess.Export
    val comment = jsFun<FindCursor> { args ->
        checkQueryNotExecuted()
        if (args.isEmpty() || !args[0].isString) {
            throw IllegalArgumentException("Expected one argument of type string. Got: $args")
        }
        iterable.comment(args[0].asString())
        this
    }

    @JvmField
    @HostAccess.Export
    val hint = jsFun<FindCursor> { args ->
        checkQueryNotExecuted()
        if (args.isEmpty() || !(args[0].hasMembers() || args[0].isString)) {
            throw IllegalArgumentException("Expected one argument of type string or object. Got: $args")
        }
        val value = args[0]
        if (value.isString) {
            iterable.hintString(value.asString())
        } else if (value.hasMembers()) {
            iterable.hint(toDocument(context, value))
        }
        this
    }

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
    val skip = jsFun<FindCursor> { args ->
        checkQueryNotExecuted()
        if (args.isEmpty() || !args[0].fitsInInt()) {
            throw IllegalArgumentException("Expected one argument of type int. Got: $args")
        }
        iterable.skip(args[0].asInt())
        this
    }

    @JvmField
    @HostAccess.Export
    val collation = jsFun<FindCursor> { args ->
        checkQueryNotExecuted()
        if (args.isEmpty() || !args[0].hasMembers()) {
            throw IllegalArgumentException("Expected one argument of type object. Got: $args")
        }
        val collation = convert(Collation.builder(), collationConverters, collationDefaultConverter, toDocument(context, args[0]))
                .getOrThrow()
                .build()
        iterable.collation(collation)
        this
    }
}
