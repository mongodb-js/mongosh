import minimist from 'minimist';

/**
 * Unknown option message.
 */
const UNKNOWN = 'Error parsing command line: unrecognized option:';

/**
 * npm start constant.
 */
const START = 'start';

/**
 * The minimist options.
 */
const OPTIONS = {
  string: [
    '_',
    'authenticationDatabase',
    'authenticationMechanism',
    'awsAccessKeyId',
    'awsSecretAccessKey',
    'awsSessionToken',
    'db',
    'eval',
    'gssapiHostName',
    'gssapiServiceName',
    'host',
    'keyVaultNamespace',
    'kmsURL',
    'password',
    'port',
    'tlsCAFile',
    'tlsCertificateKeyFile',
    'tlsCertificateKeyFilePassword',
    'tlsCertificateSelector',
    'tlsCRLFile',
    'tlsDisabledProtocols',
    'username'
  ],
  boolean: [
    'antlr',
    'disableImplicitSessions',
    'help',
    'ipv6',
    'nodb',
    'norc',
    'quiet',
    'retryWrites',
    'shell',
    'tls',
    'tlsAllowInvalidCertificates',
    'tlsAllowInvalidHostnames',
    'tlsFIPSMode',
    'verbose',
    'version'
  ],
  alias: {
    h: 'help',
    p: 'password',
    u: 'username'
  },
  unknown: (parameter) => {
    if (parameter === START) {
      return false;
    }
    if (!parameter.startsWith('-')) {
      return true;
    }
    throw new Error(`${UNKNOWN} ${parameter}`);
  }
};

/**
 * Parses arguments into a JS object.
 *
 * @param {string[]} args - The args.
 *
 * @returns {object} The arguments as an object.
 */
const parse = (args: string[]) => {
  // via npm start [ node, mongosh.js, start ]
  return minimist(args.slice(2), OPTIONS);
}

export default parse;
