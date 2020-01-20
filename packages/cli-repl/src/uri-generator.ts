import CliOptions from './cli-options';

/**
 * URI schemes.
 */
enum Scheme {
  Mongo = 'mongodb://',
  MongoSrv = 'mongodb+srv'
}

/**
 * The default host.
 */
const DEFAULT_HOST = '127.0.0.1';

/**
 * The default port.
 */
const DEFAULT_PORT = '27017';

/**
 * GSSAPI options not supported as options in Node driver,
 * only in the URI.
 */
const GSSAPI_HOST_NAME = 'gssapiHostName';

/**
 * GSSAPI options not supported as options in Node driver,
 * only in the URI.
 */
const GSSAPI_SERVICE_NAME = 'gssapiServiceName';

/**
 * Conflicting host/port message.
 */
const CONFLICT = 'If a full URI is provided, you cannot also specify --host or --port';

/**
 * Validate conflicts in the options.
 *
 * @param {CliOptions} options - The options.
 */
function validateConflicts(options: CliOptions) {
  if (options.host || options.port) {
    throw new Error(CONFLICT);
  }
}

/**
 * Generate the host from the options or default.
 *
 * @param {CliOptions} options - The options.
 *
 * @returns {string} The host.
 */
function generateHost(options: CliOptions = {}): string {
  return options.host ? options.host : DEFAULT_HOST;
}

/**
 * Generate the port from the options or default.
 *
 * @param {CliOptions} options - The options.
 *
 * @returns {string} The port.
 */
function generatePort(options: CliOptions = {}): string {
  return options.port ? options.port : DEFAULT_PORT;
}

/**
 * Generate a URI from the provided CLI options.
 *
 * If a full URI is provided, you cannot also specify --host or --port
 *
 * Rules from the existing Shell code:
 *
 * if nodb is set then all positional parameters are files
 * otherwise the first positional parameter might be a dbaddress, but
 * only if one of these conditions is met:
 *   - it contains no '.' after the last appearance of '\' or '/'
 *   - it doesn't end in '.js' and it doesn't specify a path to an existing file
 *
 * gssapiHostName?: string; // needs to go in URI
 * gssapiServiceName?: string; // needs to go in URI
 */
function generateUri(options: CliOptions): string {
  const uri = options._[0];
  if (!uri) {
    return `${Scheme.Mongo}${generateHost()}:${generatePort()}`;
  }
  if (uri.startsWith(Scheme.Mongo) || uri.startsWith(Scheme.MongoSrv)) {
    validateConflicts(options);
    return uri;
  }
  const splitIndex = uri.indexOf('/');
  const address = uri.substring(0, splitIndex);
  const database = uri.substring(splitIndex + 1);
  if (address.length > 0) {
    validateConflicts(options);
    return `${Scheme.Mongo}${address}/${database}`;
  }
  return `${Scheme.Mongo}${generateHost(options)}:${generatePort(options)}/${database}`;
}

export default generateUri;
export { Scheme };
