package com.mongodb.mongosh.result

class DeleteResult(val acknowleged: Boolean, val deletedCount: Long) : MongoShellResult() {
    fun toMap(): Map<String, Any> = mapOf("acknowleged" to acknowleged, "deletedCount" to deletedCount)
    override fun toReplString(): String = toMap().toLiteral()
}