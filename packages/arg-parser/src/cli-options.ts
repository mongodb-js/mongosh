import z from 'zod/v4';
import { argMetadata } from './arg-metadata';
import { CommonErrors, MongoshUnimplementedError } from '@mongosh/errors';
import type parser from 'yargs-parser';

export const CurrentCliOptionsSchema = z.object({
  // String options
  apiVersion: z.string().optional(),
  authenticationDatabase: z.string().optional(),
  authenticationMechanism: z.string().optional(),
  awsAccessKeyId: z.string().optional(),
  awsIamSessionToken: z.string().optional(),
  awsSecretAccessKey: z.string().optional(),
  awsSessionToken: z.string().optional(),
  csfleLibraryPath: z.string().optional(),
  cryptSharedLibPath: z.string().optional(),
  // TODO: This default doesn't do anything on its own but is used as documentation for now.
  deepInspect: z.boolean().default(true).optional(),
  db: z.string().optional(),
  gssapiServiceName: z.string().optional(),
  sspiHostnameCanonicalization: z.string().optional(),
  sspiRealmOverride: z.string().optional(),
  jsContext: z.enum(['repl', 'plain-vm', 'auto']).optional(),
  host: z.string().optional(),
  keyVaultNamespace: z.string().optional(),
  kmsURL: z.string().optional(),
  locale: z.string().optional(),
  oidcFlows: z.string().optional(),
  oidcRedirectUri: z
    .string()
    .optional()
    .register(argMetadata, {
      alias: ['oidcRedirectUrl'],
    }),
  password: z
    .string()
    .optional()
    .register(argMetadata, { alias: ['p'] }),
  port: z.string().optional(),
  username: z
    .string()
    .optional()
    .register(argMetadata, { alias: ['u'] }),

  // TLS options
  tlsCAFile: z.string().optional(),
  tlsCertificateKeyFile: z.string().optional(),
  tlsCertificateKeyFilePassword: z.string().optional(),
  tlsCertificateSelector: z.string().optional(),
  tlsCRLFile: z.string().optional(),
  tlsDisabledProtocols: z.string().optional(),

  // Boolean options
  apiDeprecationErrors: z.boolean().optional(),
  apiStrict: z.boolean().optional(),
  buildInfo: z
    .boolean()
    .optional()
    .register(argMetadata, { alias: ['build-info'] }),
  exposeAsyncRewriter: z.boolean().optional(),
  help: z
    .boolean()
    .optional()
    .register(argMetadata, { alias: ['h'] }),
  ipv6: z.boolean().optional(),
  nodb: z.boolean().optional(),
  norc: z.boolean().optional(),
  oidcTrustedEndpoint: z.boolean().optional(),
  oidcIdTokenAsAccessToken: z
    .boolean()
    .optional()
    .register(argMetadata, {
      alias: ['oidcIDTokenAsAccessToken'],
    }),
  oidcNoNonce: z.boolean().optional(),
  quiet: z.boolean().optional(),
  retryWrites: z.boolean().optional(),
  shell: z.boolean().optional(),
  skipStartupWarnings: z.boolean().optional(),
  verbose: z.boolean().optional(),
  version: z.boolean().optional(),

  // Tests
  smokeTests: z.boolean().optional(),
  perfTests: z.boolean().optional(),

  // TLS boolean options
  tls: z.boolean().optional(),
  tlsAllowInvalidCertificates: z.boolean().optional(),
  tlsAllowInvalidHostnames: z.boolean().optional(),
  tlsFIPSMode: z.boolean().optional(),
  tlsUseSystemCA: z.boolean().optional(),

  // Array options
  eval: z.array(z.string()).optional(),
  file: z
    .array(z.string())
    .optional()
    .register(argMetadata, { alias: ['f'] }),

  // Options that can be boolean or string
  json: z.union([z.boolean(), z.enum(['relaxed', 'canonical'])]).optional(),
  oidcDumpTokens: z
    .union([z.boolean(), z.enum(['redacted', 'include-secrets'])])
    .optional(),
  browser: z.union([z.literal(false), z.string()]).optional(),
});

export const DeprecatedCliOptions = z.object({
  ssl: z
    .boolean()
    .optional()
    .register(argMetadata, { deprecationReplacement: 'tls' }),
  sslAllowInvalidCertificates: z.boolean().optional().register(argMetadata, {
    deprecationReplacement: 'tlsAllowInvalidCertificates',
  }),
  sslAllowInvalidHostnames: z.boolean().optional().register(argMetadata, {
    deprecationReplacement: 'tlsAllowInvalidHostnames',
  }),
  sslPEMKeyFile: z.string().optional().register(argMetadata, {
    deprecationReplacement: 'tlsCertificateKeyFile',
  }),
  sslPEMKeyPassword: z.string().optional().register(argMetadata, {
    deprecationReplacement: 'tlsCertificateKeyFilePassword',
  }),
  sslCAFile: z.string().optional().register(argMetadata, {
    deprecationReplacement: 'tlsCAFile',
  }),
  sslCertificateSelector: z.string().optional().register(argMetadata, {
    deprecationReplacement: 'tlsCertificateSelector',
  }),
  sslCRLFile: z.string().optional().register(argMetadata, {
    deprecationReplacement: 'tlsCRLFile',
  }),
  sslDisabledProtocols: z.string().optional().register(argMetadata, {
    deprecationReplacement: 'tlsDisabledProtocols',
  }),
});

export const UnsupportedCliOptions = z.object({
  gssapiHostName: z
    .string()
    .optional()
    .register(argMetadata, { unsupported: true }),
  sslFIPSMode: z.boolean().optional().register(argMetadata, {
    unsupported: true,
  }),
});

export const CliOptionsSchema = z.object({
  ...CurrentCliOptionsSchema.shape,
  ...DeprecatedCliOptions.shape,
  ...UnsupportedCliOptions.shape,
});

type ExcludedFields =
  | keyof typeof DeprecatedCliOptions
  | keyof typeof UnsupportedCliOptions;

/**
 * Valid options that can be parsed from the command line.
 */
export type CliOptions = Omit<
  z.infer<typeof CliOptionsSchema>,
  ExcludedFields
> & {
  // Positional arguments
  connectionSpecifier?: string;
  fileNames?: string[];
};

export function processPositionalCliOptions<T extends CliOptions>({
  parsed,
  positional,
}: {
  parsed: T;
  positional: parser.Arguments['_'];
}): T {
  const processed = { ...parsed };
  if (typeof positional[0] === 'string') {
    if (!processed.nodb && isConnectionSpecifier(positional[0])) {
      processed.connectionSpecifier = positional.shift() as string;
    }
  }
  processed.fileNames = [
    ...(processed.file ?? []),
    ...(positional as string[]),
  ];

  return processed;
}

/**
 *  Validates the CLI options.
 *  TODO: Use proper schema validation for all fields.
 *  For now, to minimize impact of adopting Zod, this only validates the enum values.
 */
export function validateCliOptions(parsed: CliOptions): void {
  const jsonValidation = CliOptionsSchema.shape.json.safeParse(parsed.json);
  if (!jsonValidation.success) {
    throw new MongoshUnimplementedError(
      '--json can only have the values relaxed, canonical',
      CommonErrors.InvalidArgument
    );
  }

  const oidcDumpTokensValidation =
    CliOptionsSchema.shape.oidcDumpTokens.safeParse(parsed.oidcDumpTokens);
  if (!oidcDumpTokensValidation.success) {
    throw new MongoshUnimplementedError(
      '--oidcDumpTokens can only have the values redacted, include-secrets',
      CommonErrors.InvalidArgument
    );
  }

  const jsContextValidation = CliOptionsSchema.shape.jsContext.safeParse(
    parsed.jsContext
  );
  if (!jsContextValidation.success) {
    throw new MongoshUnimplementedError(
      '--jsContext can only have the values repl, plain-vm, auto',
      CommonErrors.InvalidArgument
    );
  }

  const browserValidation = CliOptionsSchema.shape.browser.safeParse(
    parsed.browser
  );
  if (!browserValidation.success) {
    throw new MongoshUnimplementedError(
      '--browser can only be true or a string',
      CommonErrors.InvalidArgument
    );
  }
}

function isConnectionSpecifier(arg?: string): boolean {
  return (
    typeof arg === 'string' &&
    (arg.startsWith('mongodb://') ||
      arg.startsWith('mongodb+srv://') ||
      !(arg.endsWith('.js') || arg.endsWith('.mongodb')))
  );
}
