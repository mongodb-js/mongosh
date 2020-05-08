package com.mongodb.mongosh.result

import org.bson.Document

class DocumentResult(override val value: Document) : MongoShellResult<Document>
