package com.mongodb.mongosh.service

import org.graalvm.polyglot.Value

/**
 * see service-provider-core/src/admin.ts
 */
internal interface AdminServiceProvider {
    fun createCollection(database: String, collection: String, options: Value?): Value
}