package com.mongodb.mongosh.service

import com.mongodb.ReadConcern
import com.mongodb.ReadConcernLevel
import com.mongodb.ReadPreference
import com.mongodb.client.MongoDatabase
import com.mongodb.mongosh.result.WriteCommandException
import java.util.concurrent.TimeUnit

internal fun <T> convert(o: T,
                         converters: Map<String, (T, Any?) -> Promise<T>>,
                         defaultConverter: (T, String, Any?) -> Promise<T>,
                         map: Map<*, *>): Promise<T> {
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

internal val dbConverters: Map<String, (MongoDatabase, Any?) -> Promise<MongoDatabase>> = mapOf(
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
        },
        "readConcern" to { db, value ->
            if (value is Map<*, *>) convert(db, readConcernConverters, readConcernDefaultConverter, value)
            else Rejected(WriteCommandException("invalid parameter: expected an object (readConcern)", "FailedToParse"))
        },
        "readPreference" to { db, value ->
            if (value is Map<*, *>) convert(db, readPreferenceConverters, readPreferenceDefaultConverter, value)
            else Rejected(WriteCommandException("invalid parameter: expected an object (readPreference)", "FailedToParse"))
        }
)

internal val dbDefaultConverter: (MongoDatabase, String, Any?) -> Promise<MongoDatabase> = { _, key, _ ->
    Rejected(WriteCommandException("unrecognized write concern field: $key", "FailedToParse"))
}

internal val readConcernConverters: Map<String, (MongoDatabase, Any?) -> Promise<MongoDatabase>> = mapOf(
        "level" to { db, value ->
            when (value) {
                is String -> Resolved(db.withReadConcern(ReadConcern(ReadConcernLevel.fromString(value))))
                else -> Rejected(WriteCommandException("level has to be a string", "FailedToParse"))
            }
        }
)

internal val readConcernDefaultConverter: (MongoDatabase, String, Any?) -> Promise<MongoDatabase> = { _, key, _ ->
    Rejected(WriteCommandException("unrecognized read concern field: $key", "FailedToParse"))
}

internal val readPreferenceConverters: Map<String, (MongoDatabase, Any?) -> Promise<MongoDatabase>> = mapOf(
        "mode" to { db, value ->
            when (value) {
                is String -> {
                    val pref = when (value) {
                        "primary" -> ReadPreference.primary()
                        "primaryPreferred" -> ReadPreference.primaryPreferred()
                        "secondary" -> ReadPreference.secondary()
                        "secondaryPreferred" -> ReadPreference.secondaryPreferred()
                        "nearest" -> ReadPreference.nearest()
                        else -> null
                    }
                    if (pref == null) Rejected(IllegalArgumentException("Unknown read preference mode: $value"))
                    else Resolved(db.withReadPreference(pref))
                }
                else -> Rejected(WriteCommandException("mode has to be a string", "FailedToParse"))
            }
        }
)

internal val readPreferenceDefaultConverter: (MongoDatabase, String, Any?) -> Promise<MongoDatabase> = { _, key, _ ->
    Rejected(WriteCommandException("unrecognized read preference field: $key", "FailedToParse"))
}
