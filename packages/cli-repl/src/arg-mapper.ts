import { CliOptions, MongoClientOptions } from '@mongosh/service-provider-server';
import setValue from 'lodash.set';

/**
 * Mapping fields from the CLI args to Node options.
 */
const MAPPINGS = {
  awsAccessKeyId: 'autoEncryption.kmsProviders.aws.accessKeyId',
  awsSecretAccessKey: 'autoEncryption.kmsProviders.aws.secretAccessKey',
  awsSessionToken: 'autoEncryption.kmsProviders.aws.sessionToken',
  awsIamSessionToken: 'authMechanismProperties.AWS_SESSION_TOKEN',
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
async function mapCliToDriver(options: CliOptions): Promise<MongoClientOptions> {
  // @note: Durran: TS wasn't liking shorter reduce function here.
  //   come back an revisit to refactor.
  const nodeOptions: MongoClientOptions = {};
  await Promise.all(Object.keys(MAPPINGS).map(async(cliOption) => {
    if (isExistingMappingKey(cliOption, options)) {
      const mapping = MAPPINGS[cliOption as keyof typeof MAPPINGS];
      if (typeof mapping === 'object') {
        const cliValue = (options as any)[cliOption];
        if (cliValue) {
          const { opt, val } = mapping;
          setValue(nodeOptions, opt, val);
        }
      } else {
        setValue(nodeOptions, mapping, (options as any)[cliOption]);
      }
    }
  }));
  let exportCertificateAndPrivateKey;
  try {
    exportCertificateAndPrivateKey = require('win-export-certificate-and-key');
  } catch { /* not windows */ }
  if (options.tlsCertificateSelector) {
    if (!exportCertificateAndPrivateKey) {
      throw new Error('--tlsCertificateSelector is not supported on this platform');
    }
    const match = options.tlsCertificateSelector.match(/^(?<key>\w+)=(?<value>.+)/);
    if (!match || !['subject', 'thumbprint'].includes(match.groups?.key ?? '')) {
      throw new Error('--tlsCertificateSelector needs to include subject or thumbprint');
    }
    const { key, value } = match.groups ?? {};
    const search = key === 'subject' ? { subject: value } : { thumbprint: Buffer.from(value, 'hex') };
    const { passphrase, pfx } = exportCertificateAndPrivateKey(search);
    nodeOptions.passphrase = passphrase;
    nodeOptions.pfx = pfx;
  }
  return nodeOptions;
}

export default mapCliToDriver;
