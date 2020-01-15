import minimist from 'minimist';
import CliOptions from './cli-options';

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
 * @returns {CliOptions} The arguments as cli options.
 */
function parse(args: string[]): CliOptions {
  return minimist(args.slice(2), OPTIONS);
}

export default parse;
