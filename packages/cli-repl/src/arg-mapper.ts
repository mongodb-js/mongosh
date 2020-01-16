import CliOptions from './cli-options';
import { NodeOptions } from 'mongosh-transport-server';

// auth: NodeAuthOptions; //username -> user, password -> password
// loggerLevel: string // --quiet -> error, --verbose -> debug

/**
 * Mapping fields from the CLI args to Node options.
 */
const MAPPINGS = {
  authenticationDatabase: 'authSource',
  authenticationMechanism: 'authMechanism',
  disableImplicitSessions: 'explicitlyIgnoreSession',
  retryWrites: 'retryWrites',
  tls: 'tls',
  tlsAllowInvalidCertificates: 'tlsAllowInvalidCertificates',
  tlsAllowInvalidHostnames: 'tlsAllowInvalidHostnames',
  tlsCAFile: 'tlsCAFile',
  tlsCertificateKeyFile: 'tlsCertificateKeyFile',
  tlsCertificateKeyFilePassword: 'tlsCertificateKeyFilePassword'
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
      nodeOptions[MAPPINGS[cliOption]] = options[cliOption];
    }
  });
  return nodeOptions;
};

export default mapCliToDriver;
