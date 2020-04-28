package com.mongodb.mongosh.service

internal sealed class Promise<out E : Throwable, out T> {
    abstract fun <T1> then(transform: (T) -> T1): Promise<E, T1>
}

internal class Rejected<E : Throwable>(val value: E) : Promise<E, Nothing>() {
    override fun <T1> then(transform: (Nothing) -> T1): Promise<E, T1> {
        return this
    }
}

internal class Resolved<T>(val value: T) : Promise<Nothing, T>() {
    override fun <T1> then(transform: (T) -> T1): Promise<Nothing, T1> {
        return Resolved(transform(value))
    }
}