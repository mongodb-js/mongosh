import { MongoshInvalidInputError } from '@mongosh/errors';
import { CliOptions, MongoClientOptions } from '@mongosh/service-provider-server';
import { promises as fs } from 'fs';
import setValue from 'lodash.set';

/**
 * Mapping fields from the CLI args to Node options.
 */
const MAPPINGS = {
  awsAccessKeyId: 'autoEncryption.kmsProviders.aws.accessKeyId',
  awsSecretAccessKey: 'autoEncryption.kmsProviders.aws.secretAccessKey',
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
  tlsCRLFile: { opt: 'sslCRL', val: readCrlFileContent },
  tlsCertificateKeyFile: 'tlsCertificateKeyFile',
  tlsCertificateKeyFilePassword: 'tlsCertificateKeyFilePassword',
  username: 'auth.username',
  verbose: { opt: 'loggerLevel', val: 'debug' }
};

async function readCrlFileContent(crlFilePath: string): Promise<string | Buffer> {
  let error: Error | undefined = undefined;
  try {
    if ((await fs.stat(crlFilePath)).isFile()) {
      return await fs.readFile(crlFilePath, { encoding: 'utf-8' });
    }
  } catch (e) {
    error = e;
  }
  throw new MongoshInvalidInputError(
    `The file specified by --tlsCRLFile does not exist or cannot be read${error ? ': ' + error.message : ''}`
  );
}

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
  const nodeOptions = {};
  await Promise.all(Object.keys(MAPPINGS).map(async(cliOption) => {
    if (isExistingMappingKey(cliOption, options)) {
      const mapping = MAPPINGS[cliOption as keyof typeof MAPPINGS];
      if (typeof mapping === 'object') {
        const cliValue = (options as any)[cliOption];
        if (cliValue) {
          const { opt, val } = mapping;
          if (typeof val === 'function') {
            setValue(nodeOptions, opt, await val(cliValue));
          } else {
            setValue(nodeOptions, opt, val);
          }
        }
      } else {
        setValue(nodeOptions, mapping, (options as any)[cliOption]);
      }
    }
  }));
  return nodeOptions;
}

export default mapCliToDriver;
