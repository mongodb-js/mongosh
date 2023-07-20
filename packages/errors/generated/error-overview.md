# mongosh Error Codes Overview

To quickly find an error by its code, search for the code in this overview.

## Table of Contents

- [@mongosh/async-rewriter2](#@mongosh/async-rewriter2)

- [@mongosh/cli-repl](#@mongosh/cli-repl)

- [@mongosh/errors](#@mongosh/errors)

- [@mongosh/shell-api](#@mongosh/shell-api)

## @mongosh/async-rewriter2

#### `ASYNC-10012`

Signals the use of a Mongosh API call in a place where it is not supported.
This occurs inside of constructors and (non-async) generator functions.

Examples causing error:

```javascript
class SomeClass {
  constructor() {
    this.list = db.coll.find().toArray();
  }
}

function*() {
  yield* db.coll.find().toArray();
}
```

**Solution: Do not use calls directly in such functions. If necessary, place these calls in an inner 'async' function.**

## @mongosh/cli-repl

#### `CLIREPL-10001`

Signals that the currently installed Node version does not match the one expected by mongosh.

See the output for further details on the required Node version.

## @mongosh/errors

#### `COMMON-10001`

Signals calling an API method with an invalid argument.

**Solution: See the error output for details on allowed argument values.**

#### `COMMON-10002`

Signals calling an API method that is not allowed in the current state.

**Solution: See the error output for details.**

#### `COMMON-10003`

Signals calling an API method that has been deprecated or using an argument or option of an API method that has been deprecated
and therefore is no longer supported.

**Solution: See the error output for details on alternatives or consult the official documentation.**

#### `COMMON-10004`

Signals an error while running a specific command against the database.

**Solution: Check the error output for more details and ensure the database is healthy and available.**

#### `COMMON-90001`

Signals an unexpected internal error of mongosh.

**Please file a bug report for the `MONGOSH` project here: https://jira.mongodb.org.**

#### `COMMON-90002`

Signals usage of a method that is not implemented yet.

**See the error output for details.**

## @mongosh/shell-api

#### `SHAPI-10001`

Signals calling a method that requires sharding for a collection that is not sharded
or a database that does not have sharding enabled.

**Solution: Be sure to enable sharding on the database or that the collection is sharded.**

#### `SHAPI-10002`

Signals calling a method requiring a replica set without being connected to a replica set.

**Solution: Make sure you are connected to a replica set.**

#### `SHAPI-10003`

Signals calling a method that requires to be connected to a `mongos` instead of just a `mongod`.

**Solution: Ensure you are connected to a `mongos` instances.**

#### `SHAPI-10004`

Signals calling an operation that requires an active database connection without being connected.

**Solution: Connect to a database before executing the operation.**

#### `SHAPI-10005`

Signals calling a method that requires a Mongo object with field-level encryption options
when none were passed.

**Solution: Create a new Mongo object with the correct field-level encryption options first.**
