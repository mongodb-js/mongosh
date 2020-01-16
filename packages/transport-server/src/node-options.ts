import NodeAuthOptions from './node-auth-options';

/**
 * Valid options that can be used with the Node driver. This is a
 * partial list of things that need to be mapped.
 *
 * gssapiHostName?: string; // needs to go in URI
 * gssapiServiceName?: string; // needs to go in URI
 * host?: string; // needs to go in URI
 * port?: string; // needs to go in URI
 * db?: string; // needs to go in URI
 * _?: string[];
 */
interface NodeOptions {
  auth?: NodeAuthOptions;
  authSource?: string;
  authMechanism?: string;
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
