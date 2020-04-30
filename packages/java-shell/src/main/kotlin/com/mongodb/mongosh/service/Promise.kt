package com.mongodb.mongosh.service

internal sealed class Promise<out T> {
    abstract fun <T1> then(transform: (T) -> T1): Promise<T1>
    abstract fun <T1> flatMap(transform: (T) -> Promise<T1>): Promise<T1>
    abstract fun getOrThrow(): T
}

internal class Rejected<T>(val value: Throwable) : Promise<T>() {
    override fun <T1> then(transform: (T) -> T1): Promise<T1> {
        return Rejected(value)
    }

    override fun <T1> flatMap(transform: (T) -> Promise<T1>): Promise<T1> {
        return Rejected(value)
    }

    override fun getOrThrow() = throw value
}

internal class Resolved<T>(val value: T) : Promise<T>() {
    override fun <T1> then(transform: (T) -> T1): Promise<T1> {
        return Resolved(transform(value))
    }

    override fun <T1> flatMap(transform: (T) -> Promise<T1>): Promise<T1> {
        return transform(value)
    }

    override fun getOrThrow() = value
}