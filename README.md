# mongosh [![Build Status](https://dev.azure.com/team-compass/team-compass/_apis/build/status/mongodb-js.mongosh?branchName=master)](https://dev.azure.com/team-compass/team-compass/_build/latest?definitionId=2&branchName=master)

## The MongoDB Shell

This repository is a monorepo for all the various components in the MongoDB Shell across
all environments (REPL, Browser, Compass, etc).

## Requirements

- NodeJS `~10.2.1`

## Install

```shell
npm install -g lerna
lerna bootstrap
```

## Running Tests

```shell
lerna run test
```

## Interdependencies Between Packages in Repo

Add the name of the dependency in the package.json of the individual package
and version number and `lerna bootstrap` will handle it.
