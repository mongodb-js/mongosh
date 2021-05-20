# mongosh

[Evergreen Waterfall CI](https://evergreen.mongodb.com/waterfall/mongosh)

## The MongoDB Shell

This repository is a monorepo for all the various components in the MongoDB Shell across
all environments (REPL, Browser, Compass, etc).

For our official documentation, please visit [MongoDB Docs
page](https://docs.mongodb.com/mongodb-shell).

MongoDB Shell works with MongoDB servers >= 4.0.

![MongoDB Shell Example](./mongosh.gif)

## Installation
You can get the release tarball from our [Downloads
Page](https://www.mongodb.com/try/download/shell). We currently maintain MongoDB
Shell on three different platforms - Windows (zip), MacOS (zip) and Linux (tgz, deb and rpm).
Once downloaded, you will have to extract the binary and add it to your PATH
variable. For detailed instructions for each of our supported platforms, please visit
[installation documentation](https://docs.mongodb.com/mongodb-shell/install#mdb-shell-install).

## CLI Usage
```shell
  $ mongosh [options] [db address] [file names (ending in .js or .mongodb)]

  Options:

    -h, --help                                 Show this usage information
        --host [arg]                           Server to connect to
        --port [arg]                           Port to connect to
        --version                              Show version information
        --shell                                Run the shell after executing files
        --nodb                                 Don't connect to mongod on startup - no 'db address' [arg] expected
        --norc                                 Will not run the '.mongoshrc.js' file on start up
        --eval [arg]                           Evaluate javascript
        --retryWrites                          Automatically retry write operations upon transient network errors

  Authentication Options:

    -u, --username [arg]                       Username for authentication
    -p, --password [arg]                       Password for authentication
        --authenticationDatabase [arg]         User source (defaults to dbname)
        --authenticationMechanism [arg]        Authentication mechanism
        --awsIamSessionToken [arg]             AWS IAM Temporary Session Token ID

  TLS Options:

        --tls                                  Use TLS for all connections
        --tlsCertificateKeyFile [arg]          PEM certificate/key file for TLS
        --tlsCertificateKeyFilePassword [arg]  Password for key in PEM file for TLS
        --tlsCAFile [arg]                      Certificate Authority file for TLS
        --tlsAllowInvalidHostnames             Allow connections to servers with non-matching hostnames
        --tlsAllowInvalidCertificates          Allow connections to servers with invalid certificates
        --tlsCertificateSelector [arg]         TLS Certificate in system store (Windows and macOS only)
        --tlsDisabledProtocols [arg]           Comma separated list of TLS protocols to disable [TLS1_0,TLS1_1,TLS1_2]

  API version options:

        --apiVersion [arg]                     Specifies the API version to connect with
        --apiStrict                            Use strict API version mode
        --apiDeprecationErrors                 Fail deprecated commands for the specified API version

  FLE Options:

        --awsAccessKeyId [arg]                 AWS Access Key for FLE Amazon KMS
        --awsSecretAccessKey [arg]             AWS Secret Key for FLE Amazon KMS
        --awsSessionToken [arg]                Optional AWS Session Token ID
        --keyVaultNamespace [arg]              database.collection to store encrypted FLE parameters
        --kmsURL [arg]                         Test parameter to override the URL of the KMS endpoint

  DB Address Examples:

        foo                                    Foo database on local machine
        192.168.0.5/foo                        Foo database on 192.168.0.5 machine
        192.168.0.5:9999/foo                   Foo database on 192.168.0.5 machine on port 9999
        mongodb://192.168.0.5:9999/foo         Connection string URI can also be used

  File Names:

        A list of files to run. Files must end in .js and will exit after unless --shell is specified.

  Examples:

        Start mongosh using 'ships' database on specified connection string:
        $ mongosh mongodb://192.168.0.5:9999/ships

  For more information on usage: https://docs.mongodb.com/mongodb-shell.
```

## Local Development

### Requirements

- Node.js v14.x
- Python 3.x
  - The test suite uses [mlaunch](http://blog.rueckstiess.com/mtools/mlaunch.html)
    for managing running mongod, you can install that manually as well via
    `pip3 install mtools[mlaunch]` if the automatic installation causes any trouble.

### Install

```shell
npm install -g lerna
npm install -g typescript
npm run bootstrap
```

### Running Tests

Run all tests (this may take some time):

```shell
npm test
```

Run tests from a specific package:

```shell
lerna run test --scope @mongosh/cli-repl
```

Run tests with all output from packages:

```shell
lerna run test --stream
```

To test against a specific version, the `MONGOSH_SERVER_TEST_VERSION`
environment variable can be set to a semver string specifying a server version.

### Starting the CLI

Via npm:

```shell
npm run start
```

Alternatively you can also run start inside the `cli-repl` package, if you're
sure everything else is compiled:

```shell
cd packages/cli-repl && npm run start
```

### Compiling

Compile all Typescript:

```shell
npm run compile-ts
```

Compile just the CLI:

```shell
npm run compile-cli
```

Compile the standalone executable (this may take some time):

```shell
npm run compile-exec
```

Compile a specific package, e.g. the `.deb` for Debian:

```shell
npm run compile-exec
npm run evergreen-release package -- --build-variant=debian-x64
```

### Releasing

Refer to the [`build` package](./packages/build/README.md) documentation.

## Contributing

For issues, please create a ticket in our
[JIRA Project](https://jira.mongodb.org/browse/MONGOSH).

For contributing, please refer to [CONTRIBUTING.md](./CONTRIBUTING.md).

Is there anything else you’d like to see in MongoDB Shell? Let us know by
submitting suggestions in our [feedback
forum](https://feedback.mongodb.com/forums/929233-mongodb-shell).

## License

[Apache-2.0](./LICENSE)
