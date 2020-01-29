package com.mongodb.mongosh.result

import org.bson.Document

class DocumentResult(val value: Document) : MongoShellResult() {
    override fun toReplString(): String = value.toLiteral()
}
