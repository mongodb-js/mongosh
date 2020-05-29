package com.mongodb.mongosh.service

import org.graalvm.polyglot.Value

interface ServiceProviderCursor {
  fun addCursorFlag(flag: Value, v: Boolean): ServiceProviderCursor
  fun addOption(option: Int): ServiceProviderCursor
  fun allowPartialResults(): ServiceProviderCursor
  fun batchSize(v: Int): ServiceProviderCursor
  fun bufferedCount(): Int
  fun close(options: Value)
  fun close()
  fun clone(): ServiceProviderCursor
  fun isClosed(): Boolean
  fun collation(spec: Value): ServiceProviderCursor
  fun comment(v: String): ServiceProviderCursor
  fun count(): Int
  fun forEach(func: Value)
  fun hasNext(): Boolean
  fun hint(v: Value): ServiceProviderCursor
  fun isExhausted(): Boolean
  fun itcount(): Int
  fun limit(v: Int): ServiceProviderCursor
  fun map(func: Value): ServiceProviderCursor
  fun max(v: Value): ServiceProviderCursor
  fun maxTimeMS(value: Int): ServiceProviderCursor
  fun maxAwaitTimeMS(value: Int): ServiceProviderCursor
  fun min(indexBounds: Value): ServiceProviderCursor
  fun next(): Any?
  fun oplogReplay(): ServiceProviderCursor
  fun project(v: Value): ServiceProviderCursor
  fun returnKey(v: Boolean): ServiceProviderCursor
  fun setReadPreference(v: Value): ServiceProviderCursor
  fun showRecordId(v: Boolean): ServiceProviderCursor
  fun size(): Value
  fun skip(v: Int): ServiceProviderCursor
  fun sort(spec: Value): ServiceProviderCursor
  fun tailable(): ServiceProviderCursor
  fun toArray(): Value
  fun explain(verbosity: String)
}
