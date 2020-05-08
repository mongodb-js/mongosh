package com.mongodb.mongosh.result

class InsertOneResult(val acknowleged: Boolean, val insertedId: String) : MongoShellResult<Map<String, Any>> {
    override val value: Map<String, Any>
        get() = mapOf("acknowleged" to acknowleged, "insertedId" to insertedId)
}