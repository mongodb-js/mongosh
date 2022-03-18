import { MongoshInvalidInputError, MongoshUnimplementedError } from '@mongosh/errors';
import { CliOptions, DevtoolsConnectOptions } from '@mongosh/service-provider-server';
import setValue from 'lodash.set';

/**
 * Mapping fields from the CLI args to Node options.
 */
const MAPPINGS = {
  apiDeprecationErrors: 'serverApi.deprecationErrors',
  apiStrict: 'serverApi.strict',
  apiVersion: 'serverApi.version',
  awsAccessKeyId: 'autoEncryption.kmsProviders.aws.accessKeyId',
  awsSecretAccessKey: 'autoEncryption.kmsProviders.aws.secretAccessKey',
  awsSessionToken: 'autoEncryption.kmsProviders.aws.sessionToken',
  awsIamSessionToken: 'authMechanismProperties.AWS_SESSION_TOKEN',
  gssapiServiceName: 'authMechanismProperties.SERVICE_NAME',
  sspiRealmOverride: 'authMechanismProperties.SERVICE_REALM',
  sspiHostnameCanonicalization: { opt: 'authMechanismProperties.CANONICALIZE_HOST_NAME', fun: mapGSSAPIHostnameCanonicalization },
  authenticationDatabase: 'authSource',
  authenticationMechanism: 'authMechanism',
  keyVaultNamespace: 'autoEncryption.keyVaultNamespace',
  password: 'auth.password',
  quiet: { opt: 'loggerLevel', val: 'error' },
  retryWrites: 'retryWrites',
  tls: 'tls',
  tlsAllowInvalidCertificates: 'tlsAllowInvalidCertificates',
  tlsAllowInvalidHostnames: 'tlsAllowInvalidHostnames',
  tlsCAFile: 'tlsCAFile',
  tlsCRLFile: 'sslCRL',
  tlsCertificateKeyFile: 'tlsCertificateKeyFile',
  tlsCertificateKeyFilePassword: 'tlsCertificateKeyFilePassword',
  tlsUseSystemCA: 'useSystemCA',
  username: 'auth.username',
  verbose: { opt: 'loggerLevel', val: 'debug' }
};

function isExistingMappingKey(key: string, options: CliOptions): key is keyof typeof MAPPINGS {
  return MAPPINGS.hasOwnProperty(key) && options.hasOwnProperty(key);
}

/**
 * Map the arguments provided on the command line to
 * driver friendly options.
 *
 * @param {CliOptions} options - The CLI options.
 *
 * @returns {} The driver options.
 */
function mapCliToDriver(options: CliOptions): DevtoolsConnectOptions {
  const nodeOptions: DevtoolsConnectOptions = {};
  for (const cliOption of Object.keys(MAPPINGS)) {
    if (isExistingMappingKey(cliOption, options)) {
      const mapping = MAPPINGS[cliOption as keyof typeof MAPPINGS];
      if (typeof mapping === 'object') {
        const cliValue = (options as any)[cliOption];
        if (cliValue) {
          let newValue: any;
          if ('val' in mapping) {
            newValue = mapping.val;
          } else {
            newValue = mapping.fun(cliValue);
            if (newValue === undefined) {
              continue;
            }
          }
          setValue(nodeOptions, mapping.opt, newValue);
        }
      } else {
        setValue(nodeOptions, mapping, (options as any)[cliOption]);
      }
    }
  }

  const { version } = require('../package.json');
  return {
    ...nodeOptions,
    ...getTlsCertificateSelector(options.tlsCertificateSelector),
    driverInfo: { name: 'mongosh', version }
  };
}

type TlsCertificateExporter = (search: { subject: string } | { thumbprint: Buffer }) => { passphrase: string, pfx: Buffer };
export function getTlsCertificateSelector(
  selector: string | undefined
): { passphrase: string, pfx: Buffer }|undefined {
  if (!selector) {
    return;
  }

  const exportCertificateAndPrivateKey = getCertificateExporter();
  if (!exportCertificateAndPrivateKey) {
    throw new MongoshUnimplementedError('--tlsCertificateSelector is not supported on this platform');
  }

  const match = selector.match(/^(?<key>\w+)=(?<value>.+)/);
  if (!match || !['subject', 'thumbprint'].includes(match.groups?.key ?? '')) {
    throw new MongoshInvalidInputError('--tlsCertificateSelector needs to include subject or thumbprint');
  }
  const { key, value } = match.groups ?? {};
  const search = key === 'subject' ? { subject: value } : { thumbprint: Buffer.from(value, 'hex') };

  try {
    const { passphrase, pfx } = exportCertificateAndPrivateKey(search);
    return { passphrase, pfx };
  } catch (err: any) {
    throw new MongoshInvalidInputError(`Could not resolve certificate specification '${selector}': ${err?.message}`);
  }
}

function getCertificateExporter(): TlsCertificateExporter | undefined {
  if (process.env.TEST_OS_EXPORT_CERTIFICATE_AND_KEY_PATH) {
    return require(process.env.TEST_OS_EXPORT_CERTIFICATE_AND_KEY_PATH);
  }

  try {
    switch (process.platform) {
      case 'win32':
        return require('win-export-certificate-and-key');
      case 'darwin':
        return require('macos-export-certificate-and-key');
      default:
        return undefined;
    }
  } catch { /* os probably not supported */ }
  return undefined;
}

function mapGSSAPIHostnameCanonicalization(value: string): string | boolean | undefined {
  // Here for backwards compatibility reasons -- ideally, users should always
  // just either not specify this, or use none/forward/forwardAndReverse.
  if (value === '') {
    return undefined;
  }
  if (value === 'true' || value === 'false') {
    return value === 'true';
  }
  return value;
}

export default mapCliToDriver;
