import minimist from 'minimist';

/**
 * The minimist options.
 */
const OPTIONS = {
  string: [
    '_',
    'authenticationDatabase',
    'authenticationMechanism',
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

  ],
  alias: {
    p: 'password',
    u: 'username'
  },
  default: {

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
