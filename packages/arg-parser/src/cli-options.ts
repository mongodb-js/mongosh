/**
 * Valid options that can be parsed from the command line.
 */
export interface CliOptions {
  // Positional arguments:
  connectionSpecifier?: string;
  fileNames?: string[];

  // Non-positional arguments:
  apiDeprecationErrors?: boolean;
  apiStrict?: boolean;
  apiVersion?: string;
  authenticationDatabase?: string;
  authenticationMechanism?: string;
  awsAccessKeyId?: string;
  awsIamSessionToken?: string;
  awsSecretAccessKey?: string;
  awsSessionToken?: string;
  csfleLibraryPath?: string;
  cryptSharedLibPath?: string;
  db?: string;
  eval?: string[];
  exposeAsyncRewriter?: boolean; // internal testing only
  gssapiServiceName?: string;
  sspiHostnameCanonicalization?: string;
  sspiRealmOverride?: string;
  help?: boolean;
  host?: string;
  ipv6?: boolean;
  jsContext?: 'repl' | 'plain-vm' | 'auto';
  json?: boolean | 'canonical' | 'relaxed';
  keyVaultNamespace?: string;
  kmsURL?: string;
  nodb?: boolean;
  norc?: boolean;
  password?: string;
  port?: string;
  quiet?: boolean;
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
  verbose?: boolean; // No-op since driver v5.0.0 (see also MONGOSH-970)
  version?: boolean;
  oidcFlows?: string;
  oidcRedirectUri?: string;
  oidcTrustedEndpoint?: boolean;
  oidcIdTokenAsAccessToken?: boolean;
  oidcDumpTokens?: boolean | 'redacted' | 'include-secrets';
  oidcNoNonce?: boolean;
  browser?: string | false;
}
