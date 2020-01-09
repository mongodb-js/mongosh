#!/usr/bin/env node

process.title = 'mongosh'

require('v8-compile-cache') //speed up initial cli load time

const ansi = require('ansi-escape-sequences')
const minimist = require('minimist')
const path = require('path')

const USAGE = `
  $ ${clr('mongosh', 'bold')} ${clr('[options]', 'green')} [db address] [file names]

  ${clr('Options:', 'bold')}

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

  ${clr('Authentication Options:', 'bold')}

    -u, --username [arg]                   Username for authentication
    -p, --password [arg]                   Password for authentication
    --authenticationDatabase [arg]         User source (defaults to dbname)
    --authenticationMechanism [arg]        Authentication mechanism
    --gssapiServiceName [arg] (=mongodb)   Service name to use when authenticating using GSSAPI/Kerberos
    --gssapiHostName [arg]                 Remote host name to use for purpose of GSSAPI/Kerberos authentication

  ${clr('TLS Options:', 'bold')}

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

  ${clr('FLE AWS Options:', 'bold')}

    --awsAccessKeyId [arg]                 AWS Access Key for FLE Amazon KMS
    --awsSecretAccessKey [arg]             AWS Secret Key for FLE Amazon KMS
    --awsSessionToken [arg]                Optional AWS Session Token ID
    --keyVaultNamespace [arg]              database.collection to store encrypted FLE parameters
    --kmsURL [arg]                         Test parameter to override the URL for KMS

  ${clr('DB Address:', 'bold')}

    foo                                    Foo database on local machine
    192.168.0.5/foo                        Foo database on 192.168.0.5 machine
    192.168.0.5:9999/foo                   Foo database on 192.168.0.5 machine on port 9999
    mongodb://192.168.0.5:9999/foo         Connection string URI can also be used

  ${clr('File Names:', 'bold')}

    A list of files to run. Files must end in ${clr('.js', 'bold')} and will exit after unless ${clr('--shell', 'bold')} is specified.

  ${clr('Examples:', 'bold')}

    Start mongosh using IPV6, running a local file:
    ${clr('$ mongosh --ipv6 --shell index.js', 'green')}

`.replace(/\n$/, '').replace(/^\n/, '')

const optionString =
[
  'ipv6', 'host', 'port', 'verbose', 'shell', 'nodb', 'norc', 'eval', 'disableJavaScriptJIT',
  'enableJavaScriptJIT', 'disableJavaScriptProtection', 'retryWrites', 'disableImplicitSessions',
  'jsHeapLimitMB', 'username', 'password', 'authenticationDatabase', 'authenticationMechanism',
  'gssapiServiceName', 'gssapiHostName', 'tls', 'tlsCertificateKeyFile', 'tlsCertificateKeyFilePassword',
  'tlsCAFile', 'tlsCRLFile', 'tlsAllowInvalidHostnames', 'tlsAllowInvalidCertificates',
  'tlsFIPSMode', 'tlsCertificateSelector', 'tlsDisabledProtocols', 'awsAccessKeyID',
  'awsSecretAccessKey', 'keyVaultNamespace', 'kmsURL'
]


const argv = minimist(process.argv.slice(2), {
  alias: {
    help: 'h',
    username: 'u',
    password: 'p',
    version: 'v',
  },
  strings: optionString,
  default: {
    ipv6: false
    // authenticationDatabase should be defaulted to current dbname
  },
  boolean: [
    'help',
    'quiet',
    'version'
  ]
})

;(function main (argv) {
  const cmd = argv._[0] //lrlna: not sure if we will have any commands in the future? might not even need this
  // TODO: lrlna: extract db address and .js file name


  const CliRepl = require('./lib/cli-repl.js');

  if (argv.help) {
    console.log(USAGE)
  } else if (argv.version) {
    console.log(require('./package.json').version)
  } else if (cmd === 'start-antlr') {
    new CliRepl(true)
  } else if (argv.ipv6) {
    // TODO: lrlna handle various options ideally in a separate module.exports
    // file that could also be used by the browser 'repl'
  } else {
    new CliRepl();
  }
})(argv)

function clr (text, color) {
  return process.stdout.isTTY ? ansi.format(text, color) : text
}
