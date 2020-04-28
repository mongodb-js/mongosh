package com.mongodb.mongosh.result


class WriteCommandException(val errmsg: String, val codeName: String) : Exception(errmsg)
