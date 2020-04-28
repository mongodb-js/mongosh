package com.mongodb.mongosh.service

import com.mongodb.client.MongoDatabase
import com.mongodb.mongosh.result.WriteCommandException
import java.util.concurrent.TimeUnit

internal fun <E : Throwable, T> convert(o: T,
                                        converters: Map<String, (T, Any?) -> Promise<E, T>>,
                                        defaultConverter: (T, String, Any?) -> Promise<E, T>,
                                        map: Map<*, *>): Promise<E, T> {
    var accumulator = o
    for ((key, value) in map.entries) {
        if (key !is String) continue
        val converter = converters[key]
        val res = if (converter != null) converter(accumulator, value) else defaultConverter(accumulator, key, value)
        when (res) {
            is Resolved -> accumulator = res.value
            is Rejected -> return res
        }
    }
    return Resolved(accumulator)
}

internal val dbConverters: Map<String, (MongoDatabase, Any?) -> Promise<WriteCommandException, MongoDatabase>> = mapOf(
        "writeConcern" to { db, value ->
            if (value is Map<*, *>) {
                convert(db, writeConcernConverters, writeConcernDefaultConverter, value)
            } else Rejected(WriteCommandException("invalid parameter: expected an object (writeConcern)", "FailedToParse"))
        }
)

internal val writeConcernConverters: Map<String, (MongoDatabase, Any?) -> Promise<WriteCommandException, MongoDatabase>> = mapOf(
        "w" to { db, value ->
            when (value) {
                is Number -> Resolved(db.withWriteConcern(db.writeConcern.withW(value.toInt())))
                is String -> Resolved(db.withWriteConcern(db.writeConcern.withW(value)))
                else -> Rejected(WriteCommandException("w has to be a number or a string", "FailedToParse"))
            }
        },
        "j" to { db, value ->
            when (value) {
                is Boolean -> Resolved(db.withWriteConcern(db.writeConcern.withJournal(value)))
                is Number -> Resolved(db.withWriteConcern(db.writeConcern.withJournal(value != 0)))
                else -> Rejected(WriteCommandException("j must be numeric or a boolean value", "FailedToParse"))
            }
        },
        "wtimeout" to { db, value ->
            when (value) {
                is Number -> Resolved(db.withWriteConcern(db.writeConcern.withWTimeout(value.toLong(), TimeUnit.MILLISECONDS)))
                else -> Resolved(db.withWriteConcern(db.writeConcern.withWTimeout(0, TimeUnit.MILLISECONDS)))
            }
        }
)

internal val writeConcernDefaultConverter: (MongoDatabase, String, Any?) -> Promise<WriteCommandException, MongoDatabase> = { _, key, _ ->
    Rejected(WriteCommandException("unrecognized write concern field: $key", "FailedToParse"))
}
