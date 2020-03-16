/**
 * Valid options that can be parsed from the command line.
 */
interface CliOptions {
  _?: string[];
  async?: boolean;
  authenticationDatabase?: string;
  authenticationMechanism?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsSessionToken?: string;
  db?: string;
  disableImplicitSessions?: boolean;
  eval?: string;
  gssapiHostName?: string;
  gssapiServiceName?: string;
  h?: boolean;
  help?: boolean;
  host?: string;
  ipv6?: boolean;
  keyVaultNamespace?: string;
  kmsURL?: string;
  nodb?: boolean;
  norc?: boolean;
  p?: string;
  password?: string;
  port?: string;
  quiet?: boolean;
  redactInfo?: boolean;
  retryWrites?: boolean;
  shell?: boolean;
  tls?: boolean;
  tlsAllowInvalidCertificates?: boolean;
  tlsAllowInvalidHostnames?: boolean;
  tlsCAFile?: string;
  tlsCertificateKeyFile?: string;
  tlsCertificateKeyFilePassword?: string;
  tlsCertificateSelector?: string;
  tlsCRLFile?: string;
  tlsDisabledProtocols?: boolean;
  tlsFIPSMode?: boolean;
  username?: string;
  u?: string;
  verbose?: boolean;
  version?: boolean;
}

export default CliOptions;
