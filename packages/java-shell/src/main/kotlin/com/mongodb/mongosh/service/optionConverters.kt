package com.mongodb.mongosh.service

import com.mongodb.ReadConcern
import com.mongodb.ReadConcernLevel
import com.mongodb.ReadPreference
import com.mongodb.client.AggregateIterable
import com.mongodb.client.MongoDatabase
import com.mongodb.client.model.*
import com.mongodb.mongosh.result.CommandException
import org.bson.Document
import org.graalvm.polyglot.Value
import java.util.concurrent.TimeUnit

internal fun <T> convert(o: T,
                         converters: Map<String, (T, Any?) -> Promise<T>>,
                         defaultConverter: (T, String, Any?) -> Promise<T>,
                         map: Map<*, *>?): Promise<T> {
    if (map == null) return Resolved(o)
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

internal fun <T> convert(o: T,
                         converters: Map<String, (T, Any?) -> Promise<T>>,
                         defaultConverter: (T, String, Any?) -> Promise<T>,
                         map: Value): Promise<T> {
    return convert(o, converters, defaultConverter, unwrap(map) as Map<*, *>)
}

internal val dbConverters: Map<String, (MongoDatabase, Any?) -> Promise<MongoDatabase>> = mapOf(
        "w" to { db, value ->
            when (value) {
                is Number -> Resolved(db.withWriteConcern(db.writeConcern.withW(value.toInt())))
                is String -> Resolved(db.withWriteConcern(db.writeConcern.withW(value)))
                else -> Rejected(CommandException("w has to be a number or a string", "FailedToParse"))
            }
        },
        "j" to { db, value ->
            when (value) {
                is Boolean -> Resolved(db.withWriteConcern(db.writeConcern.withJournal(value)))
                is Number -> Resolved(db.withWriteConcern(db.writeConcern.withJournal(value != 0)))
                else -> Rejected(CommandException("j must be numeric or a boolean value", "FailedToParse"))
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
            else Rejected(CommandException("invalid parameter: expected an object (readConcern)", "FailedToParse"))
        },
        "readPreference" to { db, value ->
            if (value is Map<*, *>) convert(db, readPreferenceConverters, readPreferenceDefaultConverter, value)
            else Rejected(CommandException("invalid parameter: expected an object (readPreference)", "FailedToParse"))
        }
)

internal val dbDefaultConverter = unrecognizedField<MongoDatabase>("write concern")

internal val readConcernConverters: Map<String, (MongoDatabase, Any?) -> Promise<MongoDatabase>> = mapOf(
        typed("level", String::class.java) { db, value ->
            db.withReadConcern(ReadConcern(ReadConcernLevel.fromString(value)))
        }
)

internal val readConcernDefaultConverter = unrecognizedField<MongoDatabase>("read concern")

internal fun <T> unrecognizedField(objectName: String): (T, String, Any?) -> Promise<T> = { _, key, _ ->
    Rejected(CommandException("unrecognized $objectName field: $key", "FailedToParse"))
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
                else -> Rejected(CommandException("mode has to be a string", "FailedToParse"))
            }
        }
)

internal val readPreferenceDefaultConverter = unrecognizedField<MongoDatabase>("read preference")

internal val collationConverters: Map<String, (Collation.Builder, Any?) -> Promise<Collation.Builder>> = mapOf(
        typed("locale", String::class.java) { collation, value ->
            collation.locale(value)
        },
        typed("caseLevel", Boolean::class.java) { collation, value ->
            collation.caseLevel(value)
        },
        typed("caseFirst", String::class.java) { collation, value ->
            collation.collationCaseFirst(CollationCaseFirst.fromString(value))
        },
        typed("strength", Int::class.java) { collation, value ->
            collation.collationStrength(CollationStrength.fromInt(value))
        },
        typed("numericOrdering", Boolean::class.java) { collation, value ->
            collation.numericOrdering(value)
        },
        typed("alternate", String::class.java) { collation, value ->
            collation.collationAlternate(CollationAlternate.fromString(value))
        },
        typed("maxVariable", String::class.java) { collation, value ->
            collation.collationMaxVariable(CollationMaxVariable.fromString(value))
        },
        typed("backwards", Boolean::class.java) { collation, value ->
            collation.backwards(value)
        }
)

internal val collationDefaultConverter = unrecognizedField<Collation.Builder>("collation")

internal val aggregateConverters: Map<String, (AggregateIterable<Document>, Any?) -> Promise<AggregateIterable<Document>>> = mapOf(
        typed("collation", Map::class.java) { iterable, value ->
            val collation = convert(Collation.builder(), collationConverters, collationDefaultConverter, value)
                    .getOrThrow()
                    .build()
            iterable.collation(collation)
        },
        typed("allowDiskUse", Boolean::class.java) { iterable, value ->
            iterable.allowDiskUse(value)
        },
        typed("cursor", Map::class.java) { iterable, value ->
            convert(iterable, cursorConverters, cursorDefaultConverter, value).getOrThrow()
        },
        typed("maxTimeMS", Number::class.java) { iterable, value ->
            iterable.maxTime(value.toLong(), TimeUnit.MILLISECONDS)
        },
        typed("bypassDocumentValidation", Boolean::class.java) { iterable, value ->
            iterable.bypassDocumentValidation(value)
        },
        "readConcern" to { iterable, _ -> Resolved(iterable) }, // the value is copied to dbOptions
        "writeConcern" to { iterable, _ -> Resolved(iterable) }, // the value is copied to dbOptions
        "hint" to { iterable, value ->
            val v = if (value is Value) unwrap(value) else value
            when (v) {
                is String -> Resolved(iterable.hint(Document(v, 1)))
                is Map<*, *> -> Resolved(iterable.hint(Document(v as Map<String, Any?>)))
                else -> Rejected(CommandException("hint must be string or object value", "TypeMismatch"))
            }
        },
        typed("comment", String::class.java) { iterable, value ->
            iterable.comment(value)
        }
)

internal val aggregateDefaultConverter = unrecognizedField<AggregateIterable<Document>>("aggregate options")

internal val cursorConverters: Map<String, (AggregateIterable<Document>, Any?) -> Promise<AggregateIterable<Document>>> = mapOf(
        typed("batchSize", Int::class.java) { iterable, v ->
            iterable.batchSize(v)
        }
)

internal val cursorDefaultConverter = unrecognizedField<AggregateIterable<Document>>("cursor")

internal val countOptionsConverters: Map<String, (CountOptions, Any?) -> Promise<CountOptions>> = mapOf(
        typed("limit", Number::class.java) { opt, value ->
            opt.limit(value.toInt())
        },
        typed("skip", Number::class.java) { opt, value ->
            opt.skip(value.toInt())
        },
        "hint" to { opt, value ->
            val v = if (value is Value) unwrap(value) else value
            when (v) {
                is String -> Resolved(opt.hint(Document(v, 1)))
                is Map<*, *> -> Resolved(opt.hint(Document(v as Map<String, Any?>)))
                else -> Rejected(CommandException("hint must be string or object value", "TypeMismatch"))
            }
        },
        typed("maxTimeMS", Number::class.java) { opt, value ->
            opt.maxTime(value.toLong(), TimeUnit.MILLISECONDS)
        },
        "readConcern" to { opt, _ -> Resolved(opt) }, // the value is copied to dbOptions
        typed("collation", Map::class.java) { opt, value ->
            val collation = convert(Collation.builder(), collationConverters, collationDefaultConverter, value)
                    .getOrThrow()
                    .build()
            opt.collation(collation)
        }
)

internal val countOptionsDefaultConverter = unrecognizedField<CountOptions>("count options")

internal fun <T, C> typed(name: String, clazz: Class<C>, apply: (T, C) -> T): Pair<String, (T, Any?) -> Promise<T>> =
        name to { o, value ->
            val v = if (value is Value) unwrap(value) else value
            val casted = v as? C
            if (casted != null) {
                try {
                    Resolved(apply(o, casted))
                } catch (t: Throwable) {
                    Rejected<T>(t)
                }
            } else Rejected(CommandException("$name has to be a ${clazz.simpleName}", "TypeMismatch"))
        }

private fun unwrap(value: Value): Any? {
    return when {
        value.isString -> value.asString()
        value.isBoolean -> value.asBoolean()
        value.fitsInInt() -> value.asInt()
        value.fitsInLong() -> value.asLong()
        value.fitsInFloat() -> value.asFloat()
        value.fitsInDouble() -> value.asDouble()
        value.hasMembers() -> value.memberKeys.associateWith { key -> value.getMember(key) }
        else -> value
    }
}
