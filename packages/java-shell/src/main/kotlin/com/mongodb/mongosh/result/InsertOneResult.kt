package com.mongodb.mongosh.result

class InsertOneResult(val acknowleged: Boolean, val insertedId: String) : MongoShellResult() {
    fun toMap(): Map<String, Any> = mapOf("acknowleged" to acknowleged, "insertedId" to insertedId)
    override fun toReplString(): String = toMap().toLiteral()
}