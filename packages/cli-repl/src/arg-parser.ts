import minimist from 'minimist';

/**
 * Unknown option message.
 */
const UNKNOWN = 'Error parsing command line: unrecognized option:';

/**
 * The minimist options.
 */
const OPTIONS = {
  string: [
    '_',
    'authenticationDatabase',
    'authenticationMechanism',
    'eval',
    'gssapiHostName',
    'gssapiServiceName',
    'password',
    'username'
  ],
  number: [

  ],
  array: [

  ],
  boolean: [
    'disableImplicitSessions',
    'help',
    'ipv6',
    'nodb',
    'norc',
    'quiet',
    'retryWrites',
    'shell',
    'verbose',
    'version'
  ],
  alias: {
    h: 'help',
    p: 'password',
    u: 'username'
  },
  default: {

  },
  unknown: (parameter) => {
    if (!parameter.startsWith('-')) return true;
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
  // via npm linked mongosh [ node, mongosh ]
  // via npm start [ node, mongosh.js, start ]
  // via built mongosh [ node, mongosh.js ]
  return minimist(args.slice(2), OPTIONS);
}

export default parse;
