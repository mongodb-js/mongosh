package com.mongodb.mongosh.result

class DeleteResult(val acknowleged: Boolean, val deletedCount: Long) : MongoShellResult<Map<String, Any>> {
    override val value: Map<String, Any>
        get() = mapOf("acknowleged" to acknowleged, "deletedCount" to deletedCount)
    override fun toReplString(): String = value.toLiteral()
}