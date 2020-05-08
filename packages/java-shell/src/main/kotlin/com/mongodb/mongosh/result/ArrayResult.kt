package com.mongodb.mongosh.result

class ArrayResult(override val value: Array<Any?>) : MongoShellResult<Array<Any?>>