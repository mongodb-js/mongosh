package com.mongodb.mongosh.result

interface Cursor<out T> : Iterator<T> {
    fun _asPrintable(): String
}
