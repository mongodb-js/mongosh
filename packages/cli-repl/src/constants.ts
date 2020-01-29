const ansi = require('ansi-escape-sequences');

export const USAGE = `
  $ ${clr('mongosh', 'bold')} ${clr('[options]', 'green')} [db address]

  ${clr('Options:', ['bold', 'yellow'])}
    -h, --help                                 Show this usage information
        --ipv6                                 Enable IPv6 support (disabled by default)
        --host [arg]                           Server to connect to
        --port [arg]                           Port to connect to
        --version                              Show version information
        --shell                                Run the shell after executing files
        --nodb                                 Don't connect to mongod on startup - no 'db address' [arg] expected
        --norc                                 Will not run the ".mongorc.js" file on start up
        --eval [arg]                           Evaluate javascript
        --retryWrites                          Automatically retry write operations upon transient network errors
        --disableImplicitSessions              Do not automatically create and use implicit sessions

  ${clr('Authentication Options:', ['bold', 'yellow'])}

    -u, --username [arg]                       Username for authentication
    -p, --password [arg]                       Password for authentication
        --authenticationDatabase [arg]         User source (defaults to dbname)
        --authenticationMechanism [arg]        Authentication mechanism
        --gssapiServiceName [arg] (=mongodb)   Service name to use when authenticating using GSSAPI/Kerberos
        --gssapiHostName [arg]                 Remote host name to use for purpose of GSSAPI/Kerberos authentication

  ${clr('TLS Options:', ['bold', 'yellow'])}

        --tls                                  Use TLS for all connections
        --tlsCertificateKeyFile [arg]          PEM certificate/key file for TLS
        --tlsCertificateKeyFilePassword [arg]  Password for key in PEM file for TLS
        --tlsCAFile [arg]                      Certificate Authority file for TLS
        --tlsCRLFile [arg]                     Certificate Revocation List file for TLS
        --tlsAllowInvalidHostnames             Allow connections to servers with non-matching hostnames
        --tlsAllowInvalidCertificates          Allow connections to servers with invalid certificates
        --tlsCertificateSelector [arg]         TLS Certificate in system store
        --tlsDisabledProtocols [arg]           Comma separated list of TLS protocols to disable [TLS1_0,TLS1_1,TLS1_2]

  ${clr('FLE AWS Options:', ['bold', 'yellow'])}

        --awsAccessKeyId [arg]                 AWS Access Key for FLE Amazon KMS
        --awsSecretAccessKey [arg]             AWS Secret Key for FLE Amazon KMS
        --awsSessionToken [arg]                Optional AWS Session Token ID
        --keyVaultNamespace [arg]              database.collection to store encrypted FLE parameters
        --kmsURL [arg]                         Test parameter to override the URL for KMS

  ${clr('DB Address:', ['bold', 'yellow'])}

        foo                                    Foo database on local machine
        192.168.0.5/foo                        Foo database on 192.168.0.5 machine
        192.168.0.5:9999/foo                   Foo database on 192.168.0.5 machine on port 9999
        mongodb://192.168.0.5:9999/foo         Connection string URI can also be used

  ${clr('File Names:', ['bold', 'yellow'])}

        A list of files to run. Files must end in ${clr('.js', 'bold')} and will exit after unless ${clr('--shell', 'bold')} is specified.

  ${clr('Examples:', ['bold', 'yellow'])}

        Start mongosh using 'ships' database on specified connection string:
        ${clr('$ mongosh mongodb://192.168.0.5:9999/ships', 'green')}

  For more information on mongosh usage: ${clr('https://docs.mongodb.com/manual/mongo/', 'green')}.
`.replace(/\n$/, '').replace(/^\n/, '');

function clr(text, style) {
  return process.stdout.isTTY ? ansi.format(text, style) : text;
}
