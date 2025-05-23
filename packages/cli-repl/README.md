# @mongosh/cli-repl

[Evergreen Build][evergreen-url]

CLI interface for [MongoDB Shell][mongosh], an extension to Node.js REPL with MongoDB API.

This package is a convenience distribution of mongosh. To download a fully supported version
of mongosh, visit https://www.mongodb.com/try/download/shell.

## Usage

<!-- AUTOMATICALLY_INSERT_CLI_USAGE -->

```shell
  $ mongosh [options] [db address] [file names (ending in .js or .mongodb)]

  Options:

    -h, --help                                 Show this usage information
    -f, --file [arg]                           Load the specified mongosh script
        --host [arg]                           Server to connect to
        --port [arg]                           Port to connect to
        --build-info                           Show build information
        --version                              Show version information
        --quiet                                Silence output from the shell during the connection process
        --shell                                Run the shell after executing files
        --nodb                                 Don't connect to mongod on startup - no 'db address' [arg] expected
        --norc                                 Will not run the '.mongoshrc.js' file on start up
        --eval [arg]                           Evaluate javascript
        --json[=canonical|relaxed]             Print result of --eval as Extended JSON, including errors
        --retryWrites[=true|false]             Automatically retry write operations upon transient network errors (Default: true)

  Authentication Options:

    -u, --username [arg]                       Username for authentication
    -p, --password [arg]                       Password for authentication
        --authenticationDatabase [arg]         User source (defaults to dbname)
        --authenticationMechanism [arg]        Authentication mechanism
        --awsIamSessionToken [arg]             AWS IAM Temporary Session Token ID
        --gssapiServiceName [arg]              Service name to use when authenticating using GSSAPI/Kerberos
        --sspiHostnameCanonicalization [arg]   Specify the SSPI hostname canonicalization (none or forward, available on Windows)
        --sspiRealmOverride [arg]              Specify the SSPI server realm (available on Windows)

  TLS Options:

        --tls                                  Use TLS for all connections
        --tlsCertificateKeyFile [arg]          PEM certificate/key file for TLS
        --tlsCertificateKeyFilePassword [arg]  Password for key in PEM file for TLS
        --tlsCAFile [arg]                      Certificate Authority file for TLS
        --tlsAllowInvalidHostnames             Allow connections to servers with non-matching hostnames
        --tlsAllowInvalidCertificates          Allow connections to servers with invalid certificates
        --tlsCertificateSelector [arg]         TLS Certificate in system store (Windows and macOS only)
        --tlsCRLFile [arg]                     Specifies the .pem file that contains the Certificate Revocation List
        --tlsDisabledProtocols [arg]           Comma separated list of TLS protocols to disable [TLS1_0,TLS1_1,TLS1_2]
        --tlsFIPSMode                          Enable the system TLS library's FIPS mode

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

  OIDC auth options:

        --oidcFlows[=auth-code,device-auth]    Supported OIDC auth flows
        --oidcRedirectUri[=url]                Local auth code flow redirect URL [http://localhost:27097/redirect]
        --oidcTrustedEndpoint                  Treat the cluster/database mongosh as a trusted endpoint
        --oidcIdTokenAsAccessToken             Use ID tokens in place of access tokens for auth
        --oidcDumpTokens[=mode]                Debug OIDC by printing tokens to mongosh's output [redacted|include-secrets]
        --oidcNoNonce                          Don't send a nonce argument in the OIDC auth request

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

  For more information on usage: https://mongodb.com/docs/mongodb-shell.
```

<!-- /AUTOMATICALLY_INSERT_CLI_USAGE -->

### Log Format

CLI REPL listens to a few events via a message bus that are then logged to
user's local log file in `~/.mongodb/mongosh/` in ndjson format using
[pino][pino-js].

### bus.on('mongosh:connect', connectEvent)

Where `connectionInfo` is an object with the following interface:

```ts
interface ConnectEvent {
  driverUri: string;
}
```

Used to log and send telemetry about connection information. Sensitive
information is stripped beforehand.

Example:

```js
bus.emit('mongosh:connect', {
  driverUri: 'mongodb://192.168.0.5:9999/ships',
});
```

### bus.on('mongosh:new-user', telemetryUserIdentity, enableTelemetry)

Where `telemetryUserIdentity` is `userId` and `anonymousId` which are both a [BSON ObjectID][object-id].
And `enableTelemetry` is a boolean flag.
This is used internally to update telemetry preferences.

Example:

```js
bus.emit(
  'mongosh:new-user',
  { userId: '12394dfjvnaw3uw3erdf', anonymousId: '12394dfjvnaw3uw3erdf' },
  true
);
```

### bus.on('mongosh:update-user', telemetryUserIdentity, enableTelemetry)

Where `telemetryUserIdentity` is `userId` and `anonymousId` which are both a [BSON ObjectID][object-id].
And `enableTelemetry` is a boolean flag.
This is used internally to update telemetry preferences.

Example:

```js
bus.emit(
  'mongosh:update-user',
  { userId: '12394dfjvnaw3uw3erdf', anonymousId: null },
  false
);
```

### bus.on('mongosh:error', error)

Where `error` is an [Error Object][error-object]. Used to log and send telemetry
about errors that are _thrown_.

Example:

```js
bus.emit('mongosh:error', new Error('Unable to show collections'));
```

### bus.on('mongosh:rewritten-async-input', inputInfo)

Used for internal debugging of async-rewriter. `inputInfo` is an object with the
following interface:

```ts
interface AsyncRewriterEvent {
  original: string;
  rewritten: string;
}
```

Example:

```js
bus.emit('mongosh:rewritten-async-input', {
  original: 'db.coll.find().forEach()',
  rewritten: 'await db.coll.find().forEach();',
});
```

### bus.on('mongosh:use', args)

Used for recording information about `use`. `args` has the following interface:

```ts
interface UseEvent {
  db: string;
}
```

Example:

```js
bus.emit('mongosh:use', { db: 'cats' });
```

### bus.on('mongosh:show', args)

Used for recording information about `show` command. `args` has the following
interface:

```ts
interface ShowEvent {
  method: string;
}
```

Example:

```js
bus.emit('mongosh:show', { method: 'dbs' });
```

### bus.on('mongosh:it')

Used for recording when `it` command was called.

Example:

```js
bus.emit('mongosh:it');
```

### bus.on('mongosh:api-call', args)

Used for recording information when API calls are made. `args` has the following
interface:

```ts
interface ApiEvent {
  method?: string;
  class?: string;
  db?: string;
  coll?: string;
  arguments?: ApiEventArguments;
}
```

```ts
interface ApiEventArguments {
  pipeline?: any[];
  query?: object;
  options?: object;
  filter?: object;
}
```

`arguments` may contain information about the API call. As a rule, we don't emit
information containing documents coming from API calls such as
`db.coll.insert()` or `db.coll.bulkWrite()` to keep cleaner logs.

`aggregate` Event Example:

```js
this.messageBus.emit('mongosh:api-call', {
  method: 'aggregate',
  class: 'Collection',
  db,
  coll,
  arguments: { options, pipeline },
});
```

`runCommand` Event Example:

```js
this.messageBus.emit('mongosh:api-call', {
  method: 'runCommand',
  class: 'Database',
  db,
  arguments: { cmd },
});
```

`createIndex` Event Example:

```js
this.messageBus.emit('mongosh:api-call', {
  method: 'createIndex',
  class: 'Collection',
  db,
  coll,
  arguments: { keys, options },
});
```

## Local Development

## Installation

```shell
npm install --save @mongosh/cli-repl
```

[mongosh]: https://github.com/mongodb-js/mongosh
[evergreen-url]: https://evergreen.mongodb.com/waterfall/mongosh
[pino-js]: https://github.com/pinojs/pino
[object-id]: https://mongodb.com/docs/manual/reference/method/ObjectId/
[error-object]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
