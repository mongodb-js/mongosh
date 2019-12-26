# mongosh [![Build Status](https://dev.azure.com/team-compass/team-compass/_apis/build/status/mongodb-js.mongosh?branchName=master)](https://dev.azure.com/team-compass/team-compass/_build/latest?definitionId=2&branchName=master)

## The MongoDB Shell

This repository is a monorepo for all the various components in the MongoDB Shell across
all environments (REPL, Browser, Compass, etc).

## Requirements

- NodeJS `~12.4.0`

## Install

```shell
npm install -g lerna
npm run bootstrap
```

## Running Tests

Run all tests:

```shell
npm test
```

Run tests from a specific package:

```shell
lerna run test --scope mongodbsh-transport
```

Run tests with all output from packages:

```shell
lerna run test --stream
```

Getting the Stitch integration tests running requires the 2 following env
variables to be set:

- `MONGOSH_STITCH_TEST_APP_ID`
- `MONGOSH_STITCH_TEST_SERVICE_NAME`

These can be gotten from the mongosh-test cluster in the Compass Atlas
clusters.

Start the CLI:

```shell
npm start
```

Start the CLI using ANTLR-based rewrite using double evaluation:
NOTE: This is only turned on for insertOne and deleteOne. You can tell
it's working by running "x = db.coll.insertOne()" then trying to access
a field of the returned object. If it undefined, then you've saved a
promise as 'x', but if it's not undefined, then rewrite has worked.

```shell
npm start
```

To see the bug with parsing using the JavaScript grammar, run
```shell
node --stack-size=50 packages/shell-api/lib/async-rewrite-double.js
```

Compile All Typescript

```shell
npm run compile
```
