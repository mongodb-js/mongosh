package com.mongodb.mongosh.service

import org.graalvm.polyglot.Value

internal interface WritableServiceProvider {
    fun runCommand(database: String, spec: Map<*, *>): Value
    fun dropDatabase(database: String, writeConcern: Map<*, *>?, dbOptions: Map<*, *>?): Value
    fun bulkWrite(database: String, collection: String, requests: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value
    fun deleteMany(database: String, collection: String, filter: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value
    fun deleteOne(database: String, collection: String, filter: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value
    fun findOneAndDelete(database: String, collection: String, filter: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value
    fun findOneAndReplace(database: String, collection: String, filter: Map<*, *>, replacement: Map<*, *>, options: Map<*, *>?): Value
    fun findOneAndUpdate(database: String, collection: String, filter: Map<*, *>, update: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value
    fun insertMany(database: String, collection: String, docs: List<*>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value
    fun insertOne(database: String, collection: String, doc: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value
    fun replaceOne(database: String, collection: String, filter: Map<*, *>, replacement: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value
    fun updateMany(database: String, collection: String, filter: Map<*, *>, update: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value
    fun findAndModify(database: String, collection: String, query: Map<*, *>, sort: List<*>, update: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?)
    fun findAndModify(database: String, collection: String, query: Map<*, *>, sort: Map<*, *>, update: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?)
    fun updateOne(database: String, collection: String, filter: Map<*, *>, update: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value
    fun save(database: String, collection: String, doc: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value
    fun remove(database: String, collection: String, query: Map<*, *>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value
    fun convertToCapped(database: String, collection: String, size: Number, options: Map<*, *>?): Value
    fun createIndexes(database: String, collection: String, indexSpecs: List<*>, options: Map<*, *>?, dbOptions: Map<*, *>?): Value
    fun dropIndexes(database: String, collection: String, indexes: String, commandOptions: Map<*, *>?, dbOptions: Map<*, *>?): Value
    fun dropIndexes(database: String, collection: String, indexes: List<*>, commandOptions: Map<*, *>?, dbOptions: Map<*, *>?): Value
    fun dropIndexes(database: String, collection: String, indexes: Map<*, *>, commandOptions: Map<*, *>?, dbOptions: Map<*, *>?): Value
    fun reIndex(database: String, collection: String, options: Map<*, *>?, dbOptions: Map<*, *>?): Value
    fun dropCollection(database: String, collection: String, dbOptions: Map<*, *>?): Value
    fun renameCollection(database: String, oldName: String, newName: String, options: Map<*, *>?, dbOptions: Map<*, *>?): Value
}