package com.mongodb.mongosh.service

import org.graalvm.polyglot.Value

internal interface ReadableServiceProvider {
    fun aggregate(database: String, collection: String, pipeline: Value?, options: Value?, dbOptions: Value?): Cursor
    fun aggregateDb(database: String, pipeline: Value?, options: Value?, dbOptions: Value?): Cursor
    fun count(database: String, collection: String, query: Value?, options: Value?, dbOptions: Value?): Value
    fun countDocuments(database: String, collection: String, filter: Value?, options: Value?): Value
    fun distinct(database: String, collection: String, fieldName: String, filter: Value?, options: Value?): Value
    fun estimatedDocumentCount(database: String, collection: String, options: Value?): Value
    fun find(database: String, collection: String, filter: Value?, options: Value?): Cursor
    fun getServerVersion(): Value
    fun listDatabases(database: String): Value
    fun isCapped(database: String, collection: String): Value
    fun getIndexes(database: String, collection: String): Value
    fun listCollections(database: String, filter: Value?, options: Value?): Value
    fun stats(database: String, collection: String, options: Value?): Value
}