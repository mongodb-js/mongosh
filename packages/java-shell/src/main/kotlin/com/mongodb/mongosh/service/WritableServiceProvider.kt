package com.mongodb.mongosh.service

import org.graalvm.polyglot.Value

internal interface WritableServiceProvider {
    fun runCommand(database: String, spec: Value): Value
    fun dropDatabase(database: String, writeConcern: Value?, dbOptions: Value?): Value
    fun bulkWrite(database: String, collection: String, requests: Value, options: Value?, dbOptions: Value?): Value
    fun deleteMany(database: String, collection: String, filter: Value, options: Value?, dbOptions: Value?): Value
    fun deleteOne(database: String, collection: String, filter: Value, options: Value?, dbOptions: Value?): Value
    fun findOneAndDelete(database: String, collection: String, filter: Value, options: Value?): Value
    fun findOneAndReplace(database: String, collection: String, filter: Value, replacement: Value, options: Value?): Value
    fun findOneAndUpdate(database: String, collection: String, filter: Value, update: Value, options: Value?): Value
    fun insertMany(database: String, collection: String, docs: Value?, options: Value?, dbOptions: Value?): Value
    fun insertOne(database: String, collection: String, document: Value?, options: Value?, dbOptions: Value?): Value
    fun replaceOne(database: String, collection: String, filter: Value, replacement: Value, options: Value?, dbOptions: Value?): Value
    fun updateMany(database: String, collection: String, filter: Value, update: Value, options: Value?, dbOptions: Value?): Value
    fun findAndModify(database: String, collection: String, filter: Value?, sort: Value?, update: Value?, options: Value?, dbOptions: Value?)
    fun updateOne(database: String, collection: String, filter: Value, update: Value, options: Value?): Value
    fun updateOne(database: String, collection: String, filter: Value, update: Value, options: Value?, dbOptions: Value?): Value
    fun save(database: String, collection: String, document: Value, options: Value?, dbOptions: Value?): Value
    fun remove(database: String, collection: String, query: Value, options: Value?, dbOptions: Value?): Value
    fun convertToCapped(database: String, collection: String, size: Number, options: Value?): Value
    fun createIndexes(database: String, collection: String, indexSpecs: Value?): Value
    fun dropIndexes(database: String, collection: String, indexes: Value?): Value
    fun reIndex(database: String, collection: String, options: Value?, dbOptions: Value?): Value
    fun dropCollection(database: String, collection: String): Value
    fun renameCollection(database: String, oldName: String, newName: String, options: Value?, dbOptions: Value?): Value
}