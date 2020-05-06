package com.mongodb.mongosh.result

abstract class CursorResult<T : Cursor>(val cursor: T) : MongoShellResult()