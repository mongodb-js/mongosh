package com.mongodb.mongosh.result

import com.mongodb.client.result.UpdateResult

class MongoShellUpdateResult(override val value: UpdateResult) : MongoShellResult<UpdateResult> {
    override fun toReplString(): String = value.toString()
}