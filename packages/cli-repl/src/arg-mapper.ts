import { NodeOptions, CliOptions } from '@mongosh/service-provider-server';
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
  quiet: [ 'loggerLevel', 'error' ],
  retryWrites: 'retryWrites',
  tls: 'tls',
  tlsAllowInvalidCertificates: 'tlsAllowInvalidCertificates',
  tlsAllowInvalidHostnames: 'tlsAllowInvalidHostnames',
  tlsCAFile: 'tlsCAFile',
  tlsCertificateKeyFile: 'tlsCertificateKeyFile',
  tlsCertificateKeyFilePassword: 'tlsCertificateKeyFilePassword',
  username: 'auth.user',
  verbose: [ 'loggerLevel', 'debug' ]
};

/**
 * Map the arguments provided on the command line to
 * driver friendly options.
 *
 * @param {CliOptions} options - The CLI options.
 *
 * @returns {} The driver options.
 */
function mapCliToDriver(options: CliOptions): NodeOptions {
  // @note: Durran: TS wasn't liking shorter reduce function here.
  //   come back an revisit to refactor.
  const nodeOptions = {};
  Object.keys(MAPPINGS).forEach((cliOption) => {
    if (options.hasOwnProperty(cliOption)) {
      const mapping = MAPPINGS[cliOption];
      if (Array.isArray(mapping)) {
        if (options[cliOption]) {
          setValue(nodeOptions, mapping[0], mapping[1]);
        }
      } else {
        setValue(nodeOptions, mapping, options[cliOption]);
      }
    }
  });
  return nodeOptions;
}

export default mapCliToDriver;
