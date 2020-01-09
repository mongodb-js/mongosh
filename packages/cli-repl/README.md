# Mongosh CLI

## Usage
```
  $ mongosh [options] [db address] [file names]

  Options:

    --ipv6                                 Enable IPv6 support (disabled by default)
    --host [arg]                           Server to connect to
    --port [arg]                           Port to connect to
    -h, --help                             Show this usage information
    --version                              Show version information
    --verbose                              Increase verbosity
    --shell                                Run the shell after executing files
    --nodb                                 Don't connect to mongod on startup - no 'db address' [arg] expected
    --norc                                 Will not run the ".mongorc.js" file on start up
    --quiet                                Be less chatty
    --eval [arg]                           Evaluate javascript
    --disableJavaScriptJIT                 Disable the Javascript Just In Time compiler
    --enableJavaScriptJIT                  Enable the Javascript Just In Time compiler
    --disableJavaScriptProtection          Allow automatic JavaScript function marshalling
    --retryWrites                          Automatically retry write operations upon transient network errors
    --disableImplicitSessions              Do not automatically create and use implicit sessions
    --jsHeapLimitMB [arg]                  Set the js scope's heap size limit

  Authentication Options:

    -u, --username [arg]                   Username for authentication
    -p, --password [arg]                   Password for authentication
    --authenticationDatabase [arg]         User source (defaults to dbname)
    --authenticationMechanism [arg]        Authentication mechanism
    --gssapiServiceName [arg] (=mongodb)   Service name to use when authenticating using GSSAPI/Kerberos
    --gssapiHostName [arg]                 Remote host name to use for purpose of GSSAPI/Kerberos authentication

  TLS Options:

    --tls                                  Use TLS for all connections
    --tlsCertificateKeyFile [arg]          PEM certificate/key file for TLS
    --tlsCertificateKeyFilePassword [arg]  Password for key in PEM file for TLS
    --tlsCAFile [arg]                      Certificate Authority file for TLS
    --tlsCRLFile [arg]                     Certificate Revocation List file for TLS
    --tlsAllowInvalidHostnames             Allow connections to servers with non-matching hostnames
    --tlsAllowInvalidCertificates          Allow connections to servers with invalid certificates
    --tlsFIPSMode                          Activate FIPS 140-2 mode at startup
    --tlsCertificateSelector [arg]         TLS Certificate in system store
    --tlsDisabledProtocols [arg]           Comma separated list of TLS protocols to disable [TLS1_0,TLS1_1,TLS1_2]

  FLE AWS Options:

    --awsAccessKeyId [arg]                 AWS Access Key for FLE Amazon KMS
    --awsSecretAccessKey [arg]             AWS Secret Key for FLE Amazon KMS
    --awsSessionToken [arg]                Optional AWS Session Token ID
    --keyVaultNamespace [arg]              database.collection to store encrypted FLE parameters
    --kmsURL [arg]                         Test parameter to override the URL for KMS

  DB Address:

    foo                                    Foo database on local machine
    192.168.0.5/foo                        Foo database on 192.168.0.5 machine
    192.168.0.5:9999/foo                   Foo database on 192.168.0.5 machine on port 9999
    mongodb://192.168.0.5:9999/foo         Connection string URI can also be used

  File Names:

    A list of files to run. Files must end in .js and will exit after unless --shell is specified.

  Examples:

    Start mongosh using IPV6, running a local file:
    $ mongosh --ipv6 --shell index.js
```

## Development
To use locally link this package from `./cli-repl` directory:
```
npm link
```

and run locally using:
```
mongosh
```
or to start mongosh with antlr:
```
mongosh start-antlr
```
