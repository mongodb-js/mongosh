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

Start the CLI:

```shell
npm start
```

Compile All Typescript

```shell
npm run compile
```
