package com.mongodb.mongosh.result

import com.mongodb.client.result.UpdateResult

class MongoShellUpdateResult(val res: UpdateResult) : MongoShellResult() {
    override fun toReplString(): String = res.toString()
}