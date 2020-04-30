package com.mongodb.mongosh.service

import com.mongodb.client.AggregateIterable
import com.mongodb.mongosh.MongoShellContext
import org.bson.Document

internal class AggregateCursor(iterable: AggregateIterable<Document>, context: MongoShellContext) : Cursor<AggregateIterable<Document>>(iterable, context)
