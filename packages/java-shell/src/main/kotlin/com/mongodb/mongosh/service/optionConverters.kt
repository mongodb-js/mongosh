package com.mongodb.mongosh.service

import com.mongodb.ReadConcern
import com.mongodb.ReadConcernLevel
import com.mongodb.ReadPreference
import com.mongodb.client.AggregateIterable
import com.mongodb.client.MongoDatabase
import com.mongodb.client.model.*
import com.mongodb.mongosh.MongoShellContext
import com.mongodb.mongosh.result.CommandException
import com.mongodb.mongosh.result.DocumentResult
import org.bson.Document
import org.graalvm.polyglot.Value
import java.util.concurrent.TimeUnit


internal fun toDocument(context: MongoShellContext, map: Value?): Document {
    return if (map == null || map.isNull) Document()
    else (context.extract(map) as DocumentResult).value
}

internal fun <T> convert(o: T,
                         converters: Map<String, (T, Any?) -> Either<T>>,
                         defaultConverter: (T, String, Any?) -> Either<T>,
                         map: Map<*, *>?): Either<T> {
    if (map == null) return Right(o)
    var accumulator = o
    for ((key, value) in map.entries) {
        if (key !is String) continue
        val converter = converters[key]
        val res = if (converter != null) converter(accumulator, value) else defaultConverter(accumulator, key, value)
        when (res) {
            is Right -> accumulator = res.value
            is Left -> return res
        }
    }
    return Right(accumulator)
}

internal fun <T> convert(context: MongoShellContext,
                         o: T,
                         converters: Map<String, (T, Any?) -> Either<T>>,
                         defaultConverter: (T, String, Any?) -> Either<T>,
                         map: Value?): Either<T> {
    if (map == null) return Right(o)
    val result = context.extract(map)
    return convert(o, converters, defaultConverter, (result as DocumentResult).value)
}

internal val dbConverters: Map<String, (MongoDatabase, Any?) -> Either<MongoDatabase>> = mapOf(
        "w" to { db, value ->
            when (value) {
                is Number -> Right(db.withWriteConcern(db.writeConcern.withW(value.toInt())))
                is String -> Right(db.withWriteConcern(db.writeConcern.withW(value)))
                else -> Left(CommandException("w has to be a number or a string", "FailedToParse"))
            }
        },
        "j" to { db, value ->
            when (value) {
                is Boolean -> Right(db.withWriteConcern(db.writeConcern.withJournal(value)))
                is Number -> Right(db.withWriteConcern(db.writeConcern.withJournal(value != 0)))
                else -> Left(CommandException("j must be numeric or a boolean value", "FailedToParse"))
            }
        },
        "wtimeout" to { db, value ->
            when (value) {
                is Number -> Right(db.withWriteConcern(db.writeConcern.withWTimeout(value.toLong(), TimeUnit.MILLISECONDS)))
                else -> Right(db.withWriteConcern(db.writeConcern.withWTimeout(0, TimeUnit.MILLISECONDS)))
            }
        },
        "readConcern" to { db, value ->
            if (value is Map<*, *>) convert(db, readConcernConverters, readConcernDefaultConverter, value)
            else Left(CommandException("invalid parameter: expected an object (readConcern)", "FailedToParse"))
        },
        "readPreference" to { db, value ->
            if (value is Map<*, *>) convert(db, readPreferenceConverters, readPreferenceDefaultConverter, value)
            else Left(CommandException("invalid parameter: expected an object (readPreference)", "FailedToParse"))
        }
)

internal val dbDefaultConverter = unrecognizedField<MongoDatabase>("write concern")

internal val readConcernConverters: Map<String, (MongoDatabase, Any?) -> Either<MongoDatabase>> = mapOf(
        typed("level", String::class.java) { db, value ->
            db.withReadConcern(ReadConcern(ReadConcernLevel.fromString(value)))
        }
)

internal val readConcernDefaultConverter = unrecognizedField<MongoDatabase>("read concern")

internal fun <T> unrecognizedField(objectName: String): (T, String, Any?) -> Either<T> = { _, key, _ ->
    Left(CommandException("unrecognized $objectName field: $key", "FailedToParse"))
}

internal val readPreferenceConverters: Map<String, (MongoDatabase, Any?) -> Either<MongoDatabase>> = mapOf(
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
                    if (pref == null) Left(IllegalArgumentException("Unknown read preference mode: $value"))
                    else Right(db.withReadPreference(pref))
                }
                else -> Left(CommandException("mode has to be a string", "FailedToParse"))
            }
        }
)

internal val readPreferenceDefaultConverter = unrecognizedField<MongoDatabase>("read preference")

internal val collationConverters: Map<String, (Collation.Builder, Any?) -> Either<Collation.Builder>> = mapOf(
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

internal val aggregateConverters: Map<String, (AggregateIterable<Document>, Any?) -> Either<AggregateIterable<Document>>> = mapOf(
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
        "readConcern" to { iterable, _ -> Right(iterable) }, // the value is copied to dbOptions
        "writeConcern" to { iterable, _ -> Right(iterable) }, // the value is copied to dbOptions
        "hint" to { iterable, value ->
            when (value) {
                is String -> Right(iterable.hint(Document(value, 1)))
                is Map<*, *> -> Right(iterable.hint(Document(value as Map<String, Any?>)))
                else -> Left(CommandException("hint must be string or object value", "TypeMismatch"))
            }
        },
        typed("comment", String::class.java) { iterable, value ->
            iterable.comment(value)
        }
)

internal val aggregateDefaultConverter = unrecognizedField<AggregateIterable<Document>>("aggregate options")

internal val cursorConverters: Map<String, (AggregateIterable<Document>, Any?) -> Either<AggregateIterable<Document>>> = mapOf(
        typed("batchSize", Int::class.java) { iterable, v ->
            iterable.batchSize(v)
        }
)

internal val cursorDefaultConverter = unrecognizedField<AggregateIterable<Document>>("cursor")

internal val countOptionsConverters: Map<String, (CountOptions, Any?) -> Either<CountOptions>> = mapOf(
        typed("limit", Number::class.java) { opt, value ->
            opt.limit(value.toInt())
        },
        typed("skip", Number::class.java) { opt, value ->
            opt.skip(value.toInt())
        },
        "hint" to { opt, value ->
            when (value) {
                is String -> Right(opt.hint(Document(value, 1)))
                is Map<*, *> -> Right(opt.hint(Document(value as Map<String, Any?>)))
                else -> Left(CommandException("hint must be string or object value", "TypeMismatch"))
            }
        },
        typed("maxTimeMS", Number::class.java) { opt, value ->
            opt.maxTime(value.toLong(), TimeUnit.MILLISECONDS)
        },
        "readConcern" to { opt, _ -> Right(opt) }, // the value is copied to dbOptions
        typed("collation", Map::class.java) { opt, value ->
            val collation = convert(Collation.builder(), collationConverters, collationDefaultConverter, value)
                    .getOrThrow()
                    .build()
            opt.collation(collation)
        }
)

internal val countOptionsDefaultConverter = unrecognizedField<CountOptions>("count options")

internal val estimatedCountOptionsConverters: Map<String, (EstimatedDocumentCountOptions, Any?) -> Either<EstimatedDocumentCountOptions>> = mapOf(
        typed("maxTimeMS", Number::class.java) { opt, value ->
            opt.maxTime(value.toLong(), TimeUnit.MILLISECONDS)
        }
)

internal val estimatedCountOptionsDefaultConverter = unrecognizedField<EstimatedDocumentCountOptions>("estimate count options")

internal val replaceOptionsConverters: Map<String, (ReplaceOptions, Any?) -> Either<ReplaceOptions>> = mapOf(
        typed("upsert", Boolean::class.java) { opt, value ->
            opt.upsert(value)
        },
        "writeConcern" to { iterable, _ -> Right(iterable) }, // the value is copied to dbOptions
        typed("collation", Map::class.java) { opt, value ->
            val collation = convert(Collation.builder(), collationConverters, collationDefaultConverter, value)
                    .getOrThrow()
                    .build()
            opt.collation(collation)
        },
        typed("bypassDocumentValidation", Boolean::class.java) { opt, value ->
            opt.bypassDocumentValidation(value)
        }
)

internal val replaceOptionsDefaultConverters = unrecognizedField<ReplaceOptions>("replace options")

internal val findOneAndReplaceOptionsConverters: Map<String, (FindOneAndReplaceOptions, Any?) -> Either<FindOneAndReplaceOptions>> = mapOf(
        typed("projection", Map::class.java) { opt, value ->
            opt.projection(toBson(value))
        },
        typed("sort", Map::class.java) { opt, value ->
            opt.sort(toBson(value))
        },
        typed("maxTimeMS", Number::class.java) { opt, value ->
            opt.maxTime(value.toLong(), TimeUnit.MILLISECONDS)
        },
        typed("upsert", Boolean::class.java) { opt, value ->
            opt.upsert(value)
        },
        typed("returnDocument", Boolean::class.java) { opt, value ->
            opt.returnDocument(if (value) ReturnDocument.AFTER else ReturnDocument.BEFORE)
        },
        typed("collation", Map::class.java) { opt, value ->
            val collation = convert(Collation.builder(), collationConverters, collationDefaultConverter, value)
                    .getOrThrow()
                    .build()
            opt.collation(collation)
        }
)

internal val findOneAndReplaceOptionsDefaultConverters = unrecognizedField<FindOneAndReplaceOptions>("find and replace options")

internal val bulkWriteOptionsConverters: Map<String, (BulkWriteOptions, Any?) -> Either<BulkWriteOptions>> = mapOf(
        typed("ordered", Boolean::class.java) { opt, value ->
            opt.ordered(value)
        },
        typed("bypassDocumentValidation", Boolean::class.java) { opt, value ->
            opt.bypassDocumentValidation(value)
        },
        "writeConcern" to { opt, _ -> Right(opt) } // the value is copied to dbOptions
)

internal val bulkWriteOptionsDefaultConverter = unrecognizedField<BulkWriteOptions>("bulk write options")


internal fun <T, C> typed(name: String, clazz: Class<C>, apply: (T, C) -> T): Pair<String, (T, Any?) -> Either<T>> =
        name to { o, value ->
            val casted = value as? C
            if (casted != null) {
                try {
                    Right(apply(o, casted))
                } catch (t: Throwable) {
                    Left<T>(t)
                }
            } else Left(CommandException("$name has to be a ${clazz.simpleName}", "TypeMismatch"))
        }

private fun toBson(map: Map<*, *>?): Document {
    val doc = Document()
    map?.entries?.forEach { (key, value) ->
        if (key !is String) return@forEach
        doc[key] = if (value is Map<*, *>) toBson(value) else value
    }
    return doc
}
