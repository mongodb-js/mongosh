package com.mongodb.mongosh.service

internal sealed class Promise<out T> {
    abstract fun <T1> then(transform: (T) -> T1): Promise<T1>
}

internal class Rejected(val value: Throwable) : Promise<Nothing>() {
    override fun <T1> then(transform: (Nothing) -> T1): Promise<T1> {
        return this
    }
}

internal class Resolved<T>(val value: T) : Promise<T>() {
    override fun <T1> then(transform: (T) -> T1): Promise<T1> {
        return Resolved(transform(value))
    }
}