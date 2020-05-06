package com.mongodb.mongosh.result

import org.bson.Document

interface Cursor : Iterator<Document> {
    fun toReplString(): String
}
