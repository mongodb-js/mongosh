package com.mongodb.mongosh.result

abstract class CursorResult<T : Cursor>(override val value: T) : MongoShellResult<T>