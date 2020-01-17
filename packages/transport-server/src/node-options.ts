import NodeAuthOptions from './node-auth-options';
import NodeFleOptions from './node-fle-options';

/**
 * Valid options that can be used with the Node driver. This is a
 * partial list of things that need to be mapped.
 */
interface NodeOptions {
  auth?: NodeAuthOptions;
  authSource?: string;
  authMechanism?: string;
  autoEncryption?: NodeFleOptions;
  explicitlyIgnoreSession?: boolean;
  loggerLevel?: string;
  retryWrites?: boolean;
  tls?: boolean;
  tlsAllowInvalidCertificates?: boolean;
  tlsAllowInvalidHostnames?: boolean;
  tlsCAFile?: string;
  tlsCertificateKeyFile?: string;
  tlsCertificateKeyFilePassword?: string;
}

export default NodeOptions;
