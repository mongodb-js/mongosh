/* eslint complexity: 0*/

import { CommonErrors, MongoshInvalidInputError } from '@mongosh/errors';
import i18n from '@mongosh/i18n';
import { URL } from 'url';
import CliOptions from './cli-options';
import { DEFAULT_DB } from './index';

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
 * Validate conflicts in the options.
 *
 * @param {CliOptions} options - The options.
 */
function validateConflicts(options: CliOptions): any {
  if (options.host || options.port) {
    throw new MongoshInvalidInputError(i18n.__(CONFLICT), CommonErrors.InvalidArgument);
  }
}

/**
 * Generate the host from the options or default.
 *
 * @param {CliOptions} options - The options.
 *
 * @returns {string} The host.
 */
function generateHost(options: CliOptions): string {
  if (options.host) {
    if (options.host.includes(':')) {
      return options.host.split(':')[0];
    }
    return options.host;
  }
  return DEFAULT_HOST;
}

/**
 * Generate the port from the options or default.
 *
 * @param {CliOptions} options - The options.
 *
 * @returns {string} The port.
 */
function generatePort(options: CliOptions): string {
  if (options.host && options.host.includes(':')) {
    const port = options.host.split(':')[1];
    if (!options.port || options.port === port) {
      return port;
    }
    throw new MongoshInvalidInputError(i18n.__(CONFLICT), CommonErrors.InvalidArgument);
  }
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
  const uri = options._?.[0];

  // There is no URI provided, use default 127.0.0.1:27017
  if (!uri) {
    return `${Scheme.Mongo}${generateHost(options)}:${generatePort(options)}/?directConnection=true`;
  }

  // mongodb+srv:// URI is provided, treat as correct and immediately return
  if (uri.startsWith(Scheme.MongoSrv)) {
    validateConflicts(options);
    return uri;
  } else if (uri.startsWith(Scheme.Mongo)) {
    // we need to figure out if we have to add the directConnection query parameter
    validateConflicts(options);
    return addDirectConnectionQueryParameterToMongoUriIfRequired(uri);
  }

  // Capture host, port and db from the string and generate a URI from
  // the parts.
  const uriMatch = /^([A-Za-z0-9][A-Za-z0-9.-]+):?(\d+)?[\/]?(\S+)?$/gi;
  const parts = uriMatch.exec(uri);

  if (parts === null) {
    throw new MongoshInvalidInputError(`Invalid URI: ${uri}`, CommonErrors.InvalidArgument);
  }

  let host: string | undefined = parts[1];
  const port = parts[2];
  let dbAndQueryString = parts[3];

  // If there is no port and db, host becomes db if there is no
  // '.' in the string. (legacy shell behaviour)
  if (!port && !dbAndQueryString && host.indexOf('.') < 0) {
    dbAndQueryString = host;
    host = undefined;
  }

  // If we have a host or port, validate that the options don't also
  // have a host or port in them.
  if (host || port) {
    validateConflicts(options);
  }

  return `${Scheme.Mongo}${host || generateHost(options)}:${port || generatePort(options)}${getDbAndQueryStringWithDirectConnectionIfRequired(dbAndQueryString || DEFAULT_DB)}`;
}

/**
 * Parses a given mongodb:// connection string and adds the `directConnection=true` query parameter if required.
 * See: https://github.com/mongodb/specifications/blob/master/source/connection-string/connection-string-spec.rst#reference-implementation
 * @param uri mongodb:// connection string
 */
function addDirectConnectionQueryParameterToMongoUriIfRequired(uri: string): string {
  const uriNoScheme = uri.substr(Scheme.Mongo.length);

  // Split URI at first "/"
  let splitIndex = uriNoScheme.indexOf('/');
  if (splitIndex < 0) {
    // maybe there's a question mark as separator
    splitIndex = uriNoScheme.indexOf('?');
  }

  const userAndHostInfo = splitIndex < 0 ? uriNoScheme : uriNoScheme.substr(0, splitIndex);
  const authDbAndOptions = splitIndex < 0 || splitIndex === uriNoScheme.length - 1 ? '' : uriNoScheme.substr(splitIndex);

  // Check user and host informatino part to extract only hosts
  const atIndex = userAndHostInfo.lastIndexOf('@');
  const hostInfo = atIndex < 0 ? userAndHostInfo : userAndHostInfo.substr(atIndex + 1);
  if (hostInfo.indexOf(',') > -1) {
    // multiple hosts, i.e. a seed list is present -> return original uri
    return uri;
  }

  if (authDbAndOptions) {
    // Check if a replicaSet or directConnection parameter is already present
    return `mongodb://${userAndHostInfo}` + getDbAndQueryStringWithDirectConnectionIfRequired(authDbAndOptions);
  }
  return `${uri.endsWith('/') ? uri : uri + '/'}?directConnection=true`;
}

/**
 * Takes the given URI path and query string representing the auth database and connection options
 * and checks if a `directConnection=true` parameter should be added.
 *
 * The returned string always starts with a `/`.
 *
 * @param dbAndQueryString URI Path and Query String
 */
function getDbAndQueryStringWithDirectConnectionIfRequired(dbAndQueryString: string): string {
  if (!dbAndQueryString.startsWith('/')) {
    dbAndQueryString = '/' + dbAndQueryString;
  }
  const params = new URL(`mongodb://localhost${dbAndQueryString}`).searchParams;
  if (params.has('replicaSet') || params.has('directConnection')) {
    return dbAndQueryString;
  }

  const directConnQueryParam = (!params.entries().next().done ? '&' : '?') + 'directConnection=true';
  return dbAndQueryString + directConnQueryParam;
}

export default generateUri;
export { Scheme };
