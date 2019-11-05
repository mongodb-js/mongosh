# mongosh [![Build Status](https://dev.azure.com/team-compass/team-compass/_apis/build/status/mongodb-js.mongosh?branchName=master)](https://dev.azure.com/team-compass/team-compass/_build/latest?definitionId=2&branchName=master)

## The MongoDB Shell

This repository is a monorepo for all the various components in the MongoDB Shell across
all environments (REPL, Browser, Compass, etc).

## Requirements

- NodeJS `~10.2.1`

## Install

```shell
npm install -g lerna
npm install
```

## Running Tests

Run all tests:

```shell
lerna run test
```

Run tests from a specific package:

```shell
lerna run test --scope mongodbsh-transport
```

Run tests with all output from packages:

```shell
lerna run test --stream
```
