package com.mongodb.mongosh.result

class DoubleResult(override val value: Double) : MongoShellResult<Double> {
    override fun equals(other: Any?): Boolean = this === other || other is DoubleResult && value == other.value
    override fun hashCode(): Int = value.hashCode()
}