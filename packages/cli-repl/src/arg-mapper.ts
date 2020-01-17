import CliOptions from './cli-options';
import { NodeOptions } from 'mongosh-transport-server';

/**
 * Mapping fields from the CLI args to Node options.
 */
const MAPPINGS = {
  authenticationDatabase: (value) => ([ 'authSource', value ]),
  authenticationMechanism: (value) => ([ 'authMechanism', value ]),
  disableImplicitSessions: (value) => ([ 'explicitlyIgnoreSession', value ]),
  password: (value) => ([ 'auth', { password: value }]),
  quiet: () => ([ 'loggerLevel', 'error' ]),
  retryWrites: (value) => ([ 'retryWrites', value ]),
  tls: (value) => ([ 'tls', value ]),
  tlsAllowInvalidCertificates: (value) => ([ 'tlsAllowInvalidCertificates', value ]),
  tlsAllowInvalidHostnames: (value) => ([ 'tlsAllowInvalidHostnames', value ]),
  tlsCAFile: (value) => ([ 'tlsCAFile', value ]),
  tlsCertificateKeyFile: (value) => ([ 'tlsCertificateKeyFile', value ]),
  tlsCertificateKeyFilePassword: (value) => ([ 'tlsCertificateKeyFilePassword', value ]),
  username: (value) => ([ 'auth', { user: value }]),
  verbose: () => ([ 'loggerLevel', 'debug' ])
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
      const mapped = MAPPINGS[cliOption](options[cliOption]);
      // In the case of auth, and potentially others, we need to
      // merge the objects if the key already exists in the new
      // options.
      if (nodeOptions.hasOwnProperty(mapped[0])) {
        nodeOptions[mapped[0]] = { ...nodeOptions[mapped[0]], ...mapped[1] };
      } else {
        nodeOptions[mapped[0]] = mapped[1];
      }
    }
  });
  return nodeOptions;
};

export default mapCliToDriver;
