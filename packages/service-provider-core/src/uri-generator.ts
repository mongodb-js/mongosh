/* eslint complexity: 0*/

import { CommonErrors, MongoshInvalidInputError } from '@mongosh/errors';
import i18n from '@mongosh/i18n';
import CliOptions from './cli-options';
import ConnectionString, { CommaAndColonSeparatedRecord } from 'mongodb-connection-string-url';
import { DEFAULT_DB } from './index';

/**
 * URI schemes.
 */
enum Scheme {
  Mongo = 'mongodb://',
  MongoSrv = 'mongodb+srv://'
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
 * Conflicting host/port message.
 */
const CONFLICT = 'cli-repl.uri-generator.no-host-port';

/**
 * Invalid host message.
 */
const INVALID_HOST = 'cli-repl.uri-generator.invalid-host';

/**
 * Host seed list contains a port that mismatches an explicit --port.
 */
const HOST_LIST_PORT_MISMATCH = 'cli-repl.uri-generator.host-list-port-mismatch';

/**
 * Diverging gssapiServiceName and SERVICE_NAME mechanism property
 */
const DIVERGING_SERVICE_NAME = 'cli-repl.uri-generator.diverging-service-name';

/**
 * Usage of unsupported gssapiServiceName query parameter
 */
const GSSAPI_SERVICE_NAME_UNSUPPORTED = 'cli-repl.uri-generator.gssapi-service-name-unsupported';

/**
 * Validate conflicts in the options.
 */
function validateConflicts(options: CliOptions, connectionString?: ConnectionString): void {
  if (options.host || options.port) {
    throw new MongoshInvalidInputError(i18n.__(CONFLICT), CommonErrors.InvalidArgument);
  }

  if (options.gssapiServiceName && connectionString?.searchParams.has('authMechanismProperties')) {
    const authProperties = new CommaAndColonSeparatedRecord(
      connectionString.searchParams.get('authMechanismProperties'));
    const serviceName = authProperties.get('SERVICE_NAME');
    if (serviceName !== undefined && options.gssapiServiceName !== serviceName) {
      throw new MongoshInvalidInputError(i18n.__(DIVERGING_SERVICE_NAME), CommonErrors.InvalidArgument);
    }
  }

  if (connectionString?.searchParams.has('gssapiServiceName')) {
    throw new MongoshInvalidInputError(i18n.__(GSSAPI_SERVICE_NAME_UNSUPPORTED), CommonErrors.InvalidArgument);
  }
}

/**
 * Perform basic validation of the --host option.
 *
 * @param {string} host - The value of the --host option.
 */
function validateHost(host: string): void {
  const invalidCharacter = host.match(/[^a-zA-Z0-9.:\[\]_-]/);
  if (invalidCharacter) {
    throw new MongoshInvalidInputError(
      i18n.__(INVALID_HOST) + ': ' + invalidCharacter[0],
      CommonErrors.InvalidArgument);
  }
}

/**
 * Validates a host seed list against a specified fixed port and
 * returns an individual `<host>:<port>` array.
 */
function validateHostSeedList(hosts: string, fixedPort: string | undefined): string[] {
  const trimmedHosts = hosts.split(',').map(h => h.trim()).filter(h => !!h);
  const hostList: string[] = [];
  trimmedHosts.forEach(h => {
    const [host, port] = h.split(':');
    if (fixedPort && port !== undefined && port !== fixedPort) {
      throw new MongoshInvalidInputError(
        i18n.__(HOST_LIST_PORT_MISMATCH),
        CommonErrors.InvalidArgument
      );
    }
    hostList.push(`${host}${(port || fixedPort) ? ':' + (port || fixedPort) : ''}`);
  });
  return hostList;
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
    validateHost(options.host);
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
    validateHost(options.host);
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
 */
function generateUri(options: CliOptions): string {
  if (options.nodb) {
    return '';
  }
  const connectionString = generateUriNormalized(options);
  if (connectionString.hosts.every(host =>
    ['localhost', '127.0.0.1'].includes(host.split(':')[0]))) {
    const params = connectionString.searchParams;
    if (!params.has('serverSelectionTimeoutMS')) {
      params.set('serverSelectionTimeoutMS', '2000');
    }
  }
  return connectionString.toString();
}
function generateUriNormalized(options: CliOptions): ConnectionString {
  const uri = options.connectionSpecifier;

  // If the --host argument contains /, it has the format
  // <replSetName>/<hostname1><:port>,<hostname2><:port>,<...>
  const replSetHostMatch = (options.host ?? '').match(
    /^(?<replSetName>[^/]+)\/(?<hosts>([A-Za-z0-9._-]+(:\d+)?,?)+)$/
  );
  if (replSetHostMatch) {
    const { replSetName, hosts } = replSetHostMatch.groups as { replSetName: string, hosts: string };
    const connectionString = new ConnectionString(`${Scheme.Mongo}replacemeHost/${encodeURIComponent(uri || '')}`);
    connectionString.hosts = validateHostSeedList(hosts, options.port);
    connectionString.searchParams.set('replicaSet', replSetName);
    return addShellConnectionStringParameters(connectionString);
  }

  // If the --host argument contains multiple hosts as a seed list
  // we directly do not do additional host/port parsing
  const seedList = (options.host ?? '').match(
    /^(?<hosts>([A-Za-z0-9._-]+(:\d+)?,?)+)$/
  );
  if (seedList && options.host?.includes(',')) {
    const { hosts } = seedList.groups as { hosts: string };
    const connectionString = new ConnectionString(`${Scheme.Mongo}replacemeHost/${encodeURIComponent(uri || '')}`);
    connectionString.hosts = validateHostSeedList(hosts, options.port);
    return addShellConnectionStringParameters(connectionString);
  }

  // There is no URI provided, use default 127.0.0.1:27017
  if (!uri) {
    return new ConnectionString(`${Scheme.Mongo}${generateHost(options)}:${generatePort(options)}/?directConnection=true`);
  }

  // mongodb+srv:// URI is provided, treat as correct and immediately return
  if (uri.startsWith(Scheme.MongoSrv)) {
    const connectionString = new ConnectionString(uri);
    validateConflicts(options, connectionString);
    return connectionString;
  } else if (uri.startsWith(Scheme.Mongo)) {
    // we need to figure out if we have to add the directConnection query parameter
    const connectionString = new ConnectionString(uri);
    validateConflicts(options, connectionString);
    return addShellConnectionStringParameters(connectionString);
  }

  // Capture host, port and db from the string and generate a URI from
  // the parts. If there is a db part, it *must* start with /.
  const uriMatch = /^([A-Za-z0-9][A-Za-z0-9._-]+):?(\d+)?(?:\/(\S*))?$/gi;
  let parts: string[] | null = uriMatch.exec(uri);

  if (parts === null) {
    if (/[/\\. "$]/.test(uri)) {
      // This cannot be a database name because 'uri' contains characters invalid in a database.
      throw new MongoshInvalidInputError(`Invalid URI: ${uri}`, CommonErrors.InvalidArgument);
    } else {
      parts = [ uri, uri ];
    }
  }

  let host: string | undefined = parts?.[1];
  const port = parts?.[2];
  let dbAndQueryString = parts?.[3];

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
  return addShellConnectionStringParameters(new ConnectionString(
    `${Scheme.Mongo}${host || generateHost(options)}:${port || generatePort(options)}/${encodeURIComponent(dbAndQueryString || DEFAULT_DB)}`));
}

/**
 * Adds the `directConnection=true` query parameter if required.
 * @param uri mongodb:// connection string
 */
function addShellConnectionStringParameters(uri: ConnectionString): ConnectionString {
  uri = uri.clone();
  const params = uri.searchParams;
  if (!params.has('replicaSet') && !params.has('directConnection') && !params.has('loadBalanced') && uri.hosts.length === 1) {
    params.set('directConnection', 'true');
  }
  return uri;
}

export default generateUri;
export { Scheme };
