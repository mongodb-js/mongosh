/* eslint complexity: 0*/

import i18n from '@mongosh/i18n';
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
// const GSSAPI_HOST_NAME = 'gssapiHostName';

/**
 * GSSAPI options not supported as options in Node driver,
 * only in the URI.
 */
// const GSSAPI_SERVICE_NAME = 'gssapiServiceName';

/**
 * Conflicting host/port message.
 */
const CONFLICT = 'cli-repl.uri-generator.no-host-port';

/**
 * The default db name.
 */
const TEST = 'test';

/**
 * Validate conflicts in the options.
 *
 * @param {CliOptions} options - The options.
 */
function validateConflicts(options: CliOptions): any {
  if (options.host || options.port) {
    throw new Error(i18n.__(CONFLICT));
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

  // There is no URI provided, use default 127.0.0.1:27017
  if (!uri) {
    return `${Scheme.Mongo}${generateHost()}:${generatePort()}`;
  }

  // A mongodb:// or mongodb+srv:// URI is provided, treat as correct.
  if (uri.startsWith(Scheme.Mongo) || uri.startsWith(Scheme.MongoSrv)) {
    validateConflicts(options);
    return uri;
  }

  // Capture host, port and db from the string and generate a URI from
  // the parts.
  const uriMatch = /^([A-Za-z0-9][A-Za-z0-9.-]+):?(\d+)?[\/]?(\S+)?$/gi;
  const parts = uriMatch.exec(uri);

  let host = parts[1];
  const port = parts[2];
  let db = parts[3];

  // If there is no port and db, host becomes db if there is no
  // '.' in the string. (legacy shell behaviour)
  if (!port && !db && host.indexOf('.') < 0) {
    db = host;
    host = undefined;
  }

  // If we have a host or port, validate that the options don't also
  // have a host or port in them.
  if (host || port) {
    validateConflicts(options);
  }

  return `${Scheme.Mongo}${host || generateHost(options)}:${port || generatePort(options)}/${db || TEST}`;
}

export default generateUri;
export { Scheme };
