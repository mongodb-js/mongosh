import { CommonErrors, MongoshInvalidInputError } from '@mongosh/errors';
import type { CliOptions, ConnectionInfo } from './';
import type { DevtoolsConnectOptions } from '@mongodb-js/devtools-connect';
import {
  ConnectionString,
  CommaAndColonSeparatedRecord,
} from 'mongodb-connection-string-url';

// Each of these helper functions take a ConnectionInfo as an input,
// and return a transformed ConnectionInfo as their output.
function setDriver<Key extends keyof DevtoolsConnectOptions>(
  i: Readonly<ConnectionInfo>,
  key: Key,
  value: DevtoolsConnectOptions[Key]
) {
  return { ...i, driverOptions: { ...i.driverOptions, [key]: value } };
}

type ServerApi = Exclude<
  DevtoolsConnectOptions['serverApi'],
  undefined | string
>;
function setServerApi<Key extends keyof ServerApi>(
  i: Readonly<ConnectionInfo>,
  key: Key,
  value: ServerApi[Key]
): ConnectionInfo {
  const previousServerApi = i.driverOptions.serverApi;
  const serverApi =
    typeof previousServerApi === 'string'
      ? { version: previousServerApi }
      : { ...previousServerApi };
  serverApi[key] = value;
  return setDriver(i, 'serverApi', serverApi as Required<ServerApi>);
}

type AutoEncryptionOptions = NonNullable<
  DevtoolsConnectOptions['autoEncryption']
>;
function setAutoEncrypt<Key extends keyof AutoEncryptionOptions>(
  i: Readonly<ConnectionInfo>,
  key: Key,
  value: AutoEncryptionOptions[Key]
): ConnectionInfo {
  const autoEncryption = i.driverOptions.autoEncryption ?? {};
  autoEncryption[key] = value;
  return setDriver(i, 'autoEncryption', autoEncryption);
}

type AutoEncryptionExtraOptions = NonNullable<
  AutoEncryptionOptions['extraOptions']
>;
function setAutoEncryptExtra<Key extends keyof AutoEncryptionExtraOptions>(
  i: Readonly<ConnectionInfo>,
  key: Key,
  value: AutoEncryptionExtraOptions[Key]
): ConnectionInfo {
  const extraOptions = i.driverOptions.autoEncryption?.extraOptions ?? {};
  extraOptions[key] = value;
  return setAutoEncrypt(i, 'extraOptions', extraOptions);
}

type AWSKMSOptions = NonNullable<
  NonNullable<AutoEncryptionOptions['kmsProviders']>['aws']
>;
function setAWSKMS<Key extends keyof AWSKMSOptions>(
  i: Readonly<ConnectionInfo>,
  key: Key,
  value: AWSKMSOptions[Key]
): ConnectionInfo {
  const { kmsProviders } = i.driverOptions.autoEncryption ?? {};
  const aws = kmsProviders?.aws ?? ({} as Required<AWSKMSOptions>);
  aws[key] = value;
  return setAutoEncrypt(i, 'kmsProviders', { ...kmsProviders, aws });
}

function setUrlParam<Key extends keyof DevtoolsConnectOptions>(
  i: Readonly<ConnectionInfo>,
  key: Key,
  value: DevtoolsConnectOptions[Key] | undefined
): ConnectionInfo {
  const connectionString = new ConnectionString(i.connectionString, {
    looseValidation: true,
  });
  const searchParams =
    connectionString.typedSearchParams<DevtoolsConnectOptions>();
  if (value === '' || value === undefined) {
    searchParams.delete(key);
  } else {
    searchParams.set(key, value);
  }
  return { ...i, connectionString: connectionString.toString() };
}

function setUrl<Key extends keyof ConnectionString>(
  i: Readonly<ConnectionInfo>,
  key: Key,
  value: ConnectionString[Key]
): ConnectionInfo {
  const connectionString = new ConnectionString(i.connectionString, {
    looseValidation: true,
  });
  connectionString[key] = value;
  return { ...i, connectionString: connectionString.toString() };
}

type AuthMechanismProps = NonNullable<
  DevtoolsConnectOptions['authMechanismProperties']
>;
function setAuthMechProp<Key extends keyof AuthMechanismProps>(
  i: Readonly<ConnectionInfo>,
  key: Key & string, // Currently, AuthMechanismProps extends Document, hence & string
  value: AuthMechanismProps[Key] | undefined
): ConnectionInfo {
  const connectionString = new ConnectionString(i.connectionString, {
    looseValidation: true,
  });
  const authMechanismProps =
    new CommaAndColonSeparatedRecord<AuthMechanismProps>(
      connectionString
        .typedSearchParams<DevtoolsConnectOptions>()
        .get('authMechanismProperties')
    );
  if (value === '' || value === undefined) {
    authMechanismProps.delete(key);
  } else {
    authMechanismProps.set(key, value);
  }
  return setUrlParam(i, 'authMechanismProperties', authMechanismProps);
}

function setAuthMechPropNonUrl<Key extends keyof AuthMechanismProps>(
  i: Readonly<ConnectionInfo>,
  key: Key & string, // Currently, AuthMechanismProps extends Document, hence & string
  value: AuthMechanismProps[Key] | undefined
): ConnectionInfo {
  return setDriver(i, 'authMechanismProperties', {
    ...i.driverOptions.authMechanismProperties,
    [key]: value,
  });
}

type OIDCOptions = NonNullable<DevtoolsConnectOptions['oidc']>;
function setOIDC<Key extends keyof OIDCOptions>(
  i: Readonly<ConnectionInfo>,
  key: Key,
  value: OIDCOptions[Key]
): ConnectionInfo {
  return setDriver(i, 'oidc', { ...i.driverOptions.oidc, [key]: value });
}

// Return an ALLOWED_HOSTS value that matches the hosts listed in the connection string of `i`,
// including possible SRV "sibling" domains.
function matchingAllowedHosts(i: Readonly<ConnectionInfo>): string[] {
  const connectionString = new ConnectionString(i.connectionString, {
    looseValidation: true,
  });
  const suffixes = connectionString.hosts.map((hostStr) => {
    // eslint-disable-next-line
    const { host } = hostStr.match(/^(?<host>.+?)(?<port>:[^:\]\[]+)?$/)
      ?.groups!;
    if (host.startsWith('[') && host.endsWith(']')) {
      return host.slice(1, -1); // IPv6
    }
    if (/^[0-9.]+$/.exec(host)) {
      return host; // IPv4
    }
    if (!host.includes('.') || !connectionString.isSRV) {
      return host;
    }
    // An SRV record for foo.bar.net can resolve to any hosts that match `*.bar.net`
    const parts = host.split('.');
    parts[0] = '*';
    return parts.join('.');
  });
  return [...new Set(suffixes)];
}

/**
 * Mapping fields from the CLI args to Node options.
 */
const MAPPINGS: {
  [K in keyof CliOptions]?: (
    i: Readonly<ConnectionInfo>,
    v: Required<CliOptions>[K]
  ) => ConnectionInfo;
} = {
  apiDeprecationErrors: (i, v) => setServerApi(i, 'deprecationErrors', v),
  apiStrict: (i, v) => setServerApi(i, 'strict', v),
  apiVersion: (i, v) => setServerApi(i, 'version', v as ServerApi['version']),
  awsAccessKeyId: (i, v) => setAWSKMS(i, 'accessKeyId', v),
  awsSecretAccessKey: (i, v) => setAWSKMS(i, 'secretAccessKey', v),
  awsSessionToken: (i, v) => setAWSKMS(i, 'sessionToken', v),
  awsIamSessionToken: (i, v) => setAuthMechProp(i, 'AWS_SESSION_TOKEN', v),
  csfleLibraryPath: (i, v) =>
    setAutoEncryptExtra(
      i,
      'cryptSharedLibPath',
      v as AutoEncryptionExtraOptions['cryptSharedLibPath']
    ),
  cryptSharedLibPath: (i, v) =>
    setAutoEncryptExtra(
      i,
      'cryptSharedLibPath',
      v as AutoEncryptionExtraOptions['cryptSharedLibPath']
    ),
  gssapiServiceName: (i, v) => setAuthMechProp(i, 'SERVICE_NAME', v),
  sspiRealmOverride: (i, v) => setAuthMechProp(i, 'SERVICE_REALM', v),
  sspiHostnameCanonicalization: (i, v) =>
    setAuthMechProp(
      i,
      'CANONICALIZE_HOST_NAME',
      mapGSSAPIHostnameCanonicalization(v)
    ),
  authenticationDatabase: (i, v) => setUrlParam(i, 'authSource', v),
  authenticationMechanism: (i, v) =>
    setUrlParam(
      i,
      'authMechanism',
      v as DevtoolsConnectOptions['authMechanism']
    ),
  keyVaultNamespace: (i, v) => setAutoEncrypt(i, 'keyVaultNamespace', v),
  password: (i, v) => setUrl(i, 'password', encodeURIComponent(v)),
  retryWrites: (i, v) => setUrlParam(i, 'retryWrites', v),
  tls: (i, v) => setUrlParam(i, 'tls', v),
  tlsAllowInvalidCertificates: (i, v) =>
    setUrlParam(i, 'tlsAllowInvalidCertificates', v),
  tlsAllowInvalidHostnames: (i, v) =>
    setUrlParam(i, 'tlsAllowInvalidHostnames', v),
  tlsCAFile: (i, v) => setUrlParam(i, 'tlsCAFile', v),
  tlsCRLFile: (i, v) => setUrlParam(i, 'tlsCRLFile', v),
  tlsCertificateKeyFile: (i, v) => setUrlParam(i, 'tlsCertificateKeyFile', v),
  tlsCertificateKeyFilePassword: (i, v) =>
    setUrlParam(i, 'tlsCertificateKeyFilePassword', v),
  username: (i, v) => setUrl(i, 'username', encodeURIComponent(v)),
  oidcRedirectUri: (i, v) => setOIDC(i, 'redirectURI', v),
  oidcTrustedEndpoint: (i, v) =>
    setAuthMechPropNonUrl(
      i,
      'ALLOWED_HOSTS',
      v ? matchingAllowedHosts(i) : undefined
    ),
  oidcFlows: (i, v) =>
    setOIDC(
      i,
      'allowedFlows',
      v.split(',').filter(Boolean) as OIDCOptions['allowedFlows']
    ),
  oidcIdTokenAsAccessToken: (i, v) => setOIDC(i, 'passIdTokenAsAccessToken', v),
  oidcNoNonce: (i, v) => setOIDC(i, 'skipNonceInAuthCodeRequest', v),
  browser: (i, v) =>
    setOIDC(i, 'openBrowser', typeof v === 'string' ? { command: v } : v),
};

function mapOption<Key extends keyof CliOptions>(
  i: Readonly<ConnectionInfo>,
  key: Key,
  value: Required<CliOptions>[Key]
): ConnectionInfo {
  return MAPPINGS[key]?.(i, value) ?? i;
}

/**
 * Map the arguments provided on the command line to
 * driver friendly options.
 *
 * @param {CliOptions} options - The CLI options.
 *
 * @returns {} The driver options.
 */
export function mapCliToDriver(
  options: Readonly<CliOptions>,
  i: Readonly<ConnectionInfo>
): ConnectionInfo {
  for (const cliOption of Object.keys(options) as (keyof CliOptions)[]) {
    const optionValue = options[cliOption];
    if (
      optionValue !== null &&
      optionValue !== undefined &&
      optionValue !== ''
    ) {
      i = mapOption(i, cliOption, optionValue);
    }
  }

  validateConnectionInfoAfterArgMapping(i, options);

  return i;
}

function mapGSSAPIHostnameCanonicalization(
  value: string
): AuthMechanismProps['CANONICALIZE_HOST_NAME'] {
  // Here for backwards compatibility reasons -- ideally, users should always
  // just either not specify this, or use none/forward/forwardAndReverse.
  if (value === '') {
    return undefined;
  }
  if (value === 'true' || value === 'false') {
    return value === 'true';
  }
  return value as AuthMechanismProps['CANONICALIZE_HOST_NAME'];
}

function validateConnectionInfoAfterArgMapping(
  info: ConnectionInfo,
  originalOptions: CliOptions
): void {
  if (!info.connectionString) {
    return;
  }
  // Provide a better error message for some cases in which applying
  // command line options to the connection string can make it invalid.
  const connectionString = new ConnectionString(info.connectionString, {
    looseValidation: true,
  });
  if (connectionString.password && !connectionString.username) {
    let text =
      'Invalid connection information: Password specified but no username provided';
    if (originalOptions.password && !originalOptions.port) {
      text += " (did you mean '--port' instead of '-p'?)";
    }
    throw new MongoshInvalidInputError(text, CommonErrors.InvalidArgument);
  }
  // Just make sure the result ultimately parses with strict validation.
  new ConnectionString(info.connectionString, { looseValidation: false });
}
