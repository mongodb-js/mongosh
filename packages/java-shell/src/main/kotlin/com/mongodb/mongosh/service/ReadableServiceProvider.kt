package com.mongodb.mongosh.service

import org.graalvm.polyglot.Value

internal interface ReadableServiceProvider {
    fun aggregate(database: String, collection: String, pipeline: List<Map<*, *>>, options: Map<*, *>?, dbOptions: Map<*, *>?): Cursor
    fun aggregateDb(database: String, pipeline: List<Map<*, *>>, options: Map<*, *>?, dbOptions: Map<*, *>?): Cursor
    fun count(db: String, coll: String, query: Map<*, *>?, options: Map<*, *>?, dbOptions: Map<*, *>?): Value
    fun countDocuments(database: String, collection: String, filter: Map<*, *>?, options: Map<*, *>?): Value
    fun distinct(database: String, collection: String, fieldName: String, filter: Map<*, *>?, options: Map<*, *>?, dbOptions: Map<*, *>?): Value
    fun estimatedDocumentCount(database: String, collection: String, options: Map<*, *>?): Value
    fun find(database: String, collection: String, filter: Map<*, *>?, options: Map<*, *>?): Cursor
    fun getServerVersion(): Value
    fun listDatabases(database: String): Value
    fun isCapped(database: String, collection: String): Value
    fun getIndexes(database: String, collection: String, dbOptions: Map<*, *>?): Value
    fun listCollections(database: String, filter: Map<*, *>?, options: Map<*, *>?): Value
    fun stats(database: String, collection: String, options: Map<*, *>?, dbOptions: Map<*, *>?): Value
}