# mongosh [![Build Status](https://dev.azure.com/team-compass/mongosh/_apis/build/status/mongodb-js.mongosh?branchName=master)](https://dev.azure.com/team-compass/mongosh/_build/latest?definitionId=5&branchName=master)

[Evergreen Waterfall](https://evergreen.mongodb.com/waterfall/mongosh)

## The MongoDB Shell

This repository is a monorepo for all the various components in the MongoDB Shell across
all environments (REPL, Browser, Compass, etc).

## CLI Usage
```shell
  $ mongosh [options] [db address]

  Options:
    -h, --help                                 Show this usage information
        --ipv6                                 Enable IPv6 support (disabled by default)
        --host [arg]                           Server to connect to
        --port [arg]                           Port to connect to
        --version                              Show version information
        --shell                                Run the shell after executing files
        --nodb                                 Don't connect to mongod on startup - no 'db address' [arg] expected
        --norc                                 Will not run the '.mongorc.js' file on start up
        --eval [arg]                           Evaluate javascript
        --retryWrites                          Automatically retry write operations upon transient network errors
        --disableImplicitSessions              Do not automatically create and use implicit sessions

  Authentication Options:

    -u, --username [arg]                       Username for authentication
    -p, --password [arg]                       Password for authentication
        --authenticationDatabase [arg]         User source (defaults to dbname)
        --authenticationMechanism [arg]        Authentication mechanism
        --gssapiServiceName [arg] (=mongodb)   undefined
        --gssapiHostName [arg]                 Automatically retry write operations upon transient network errors

  TLS Options:

        --tls                                  Use TLS for all connections
        --tlsCertificateKeyFile [arg]          PEM certificate/key file for TLS
        --tlsCertificateKeyFilePassword [arg]  undefined
        --tlsCAFile [arg]                      Certificate Authority file for TLS
        --tlsCRLFile [arg]                     Certificate Revocation List file for TLS
        --tlsAllowInvalidHostnames             undefined
        --tlsAllowInvalidCertificates          undefined
        --tlsCertificateSelector [arg]         TLS Certificate in system store
        --tlsDisabledProtocols [arg]           Comma separated list of TLS protocols to disable [TLS1_0,TLS1_1,TLS1_2]

  FLE AWS Options

        --awsAccessKeyId [arg]                 AWS Access Key for FLE Amazon KMS
        --awsSecretAccessKey [arg]             AWS Secret Key for FLE Amazon KMS
        --awsSessionToken [arg]                Optional AWS Session Token ID
        --keyVaultNamespace [arg]              database.collection to store encrypted FLE parameters
        --kmsURL [arg]                         Test parameter to override the URL for

  DB Address Examples

        foo                                    Foo database on local machine
        192.168.0.5/foo                        Foo database on 192.168.0.5 machine
        192.168.0.5:9999/foo                   Foo database on 192.168.0.5 machine on port 9999
        mongodb://192.168.0.5:9999/foo         Connection string URI can also be used

  File Names

        A list of files to run. Files must end in .js and will exit after unless --shell is specified.

  Examples

        Start mongosh using 'ships' database on specified connection string:
        $ mongosh mongodb://192.168.0.5:9999/ships

  For more information on mongosh usage: https://docs.mongodb.com/manual/mongo/.
```

## Requirements

- NodeJS `~12.4.0`

## Install

```shell
npm install -g lerna
npm install -g typescript
npm run bootstrap
```

## Running Tests

Run all tests:

```shell
npm test
```

Run tests from a specific package:

```shell
lerna run test --scope mongosh-transport
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

## Starting the CLI

Via NPM:

```shell
npm start
```

## Compiling

Compile all Typescript:

```shell
npm run compile-ts
```

Compile the standalone executable:

```shel
npm run compile-exec
```
