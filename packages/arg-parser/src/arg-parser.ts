import { CommonErrors, MongoshUnimplementedError } from '@mongosh/errors';
import i18n from '@mongosh/i18n';
import type { CliOptions } from '@mongosh/arg-parser';
import parser from 'yargs-parser';
import { z } from 'zod/v4';
import type { Options as YargsOptions } from 'yargs-parser';

/**
 * Custom registry for CLI options metadata
 */
export const cliOptionsRegistry = z.registry<CliOptionsRegistryMetadata>();

/**
 * CLI options schema with metadata attached via registry
 */
export const CliOptionsSchema = z
  .object({
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
    db: z.string().optional(),
    gssapiHostName: z
      .string()
      .optional()
      .register(cliOptionsRegistry, { unsupported: true }),
    gssapiServiceName: z.string().optional(),
    sspiHostnameCanonicalization: z.string().optional(),
    sspiRealmOverride: z.string().optional(),
    jsContext: z.string().optional(),
    host: z.string().optional(),
    keyVaultNamespace: z.string().optional(),
    kmsURL: z.string().optional(),
    locale: z.string().optional(),
    oidcFlows: z.string().optional(),
    oidcRedirectUri: z
      .string()
      .optional()
      .register(cliOptionsRegistry, {
        alias: ['oidcRedirectUrl'],
      }),
    password: z
      .string()
      .optional()
      .register(cliOptionsRegistry, { alias: ['p'] }),
    port: z.string().optional(),
    username: z
      .string()
      .optional()
      .register(cliOptionsRegistry, { alias: ['u'] }),

    // Deprecated SSL options (now TLS)
    sslPEMKeyFile: z.string().optional().register(cliOptionsRegistry, {
      deprecationReplacement: 'tlsCertificateKeyFile',
    }),
    sslPEMKeyPassword: z.string().optional().register(cliOptionsRegistry, {
      deprecationReplacement: 'tlsCertificateKeyFilePassword',
    }),
    sslCAFile: z.string().optional().register(cliOptionsRegistry, {
      deprecationReplacement: 'tlsCAFile',
    }),
    sslCertificateSelector: z.string().optional().register(cliOptionsRegistry, {
      deprecationReplacement: 'tlsCertificateSelector',
    }),
    sslCRLFile: z.string().optional().register(cliOptionsRegistry, {
      deprecationReplacement: 'tlsCRLFile',
    }),
    sslDisabledProtocols: z.string().optional().register(cliOptionsRegistry, {
      deprecationReplacement: 'tlsDisabledProtocols',
    }),

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
      .register(cliOptionsRegistry, { alias: ['build-info'] }),
    exposeAsyncRewriter: z.boolean().optional(),
    help: z
      .boolean()
      .optional()
      .register(cliOptionsRegistry, { alias: ['h'] }),
    ipv6: z.boolean().optional(),
    nodb: z.boolean().optional(),
    norc: z.boolean().optional(),
    oidcTrustedEndpoint: z.boolean().optional(),
    oidcIdTokenAsAccessToken: z
      .boolean()
      .optional()
      .register(cliOptionsRegistry, {
        alias: ['oidcIDTokenAsAccessToken'],
      }),
    oidcNoNonce: z.boolean().optional(),
    perfTests: z.boolean().optional(),
    quiet: z.boolean().optional(),
    retryWrites: z.boolean().optional(),
    shell: z.boolean().optional(),
    smokeTests: z.boolean().optional(),
    skipStartupWarnings: z.boolean().optional(),
    verbose: z.boolean().optional(),
    version: z.boolean().optional(),

    // Deprecated SSL boolean options
    ssl: z
      .boolean()
      .optional()
      .register(cliOptionsRegistry, { deprecationReplacement: 'tls' }),
    sslAllowInvalidCertificates: z
      .boolean()
      .optional()
      .register(cliOptionsRegistry, {
        deprecationReplacement: 'tlsAllowInvalidCertificates',
      }),
    sslAllowInvalidHostnames: z
      .boolean()
      .optional()
      .register(cliOptionsRegistry, {
        deprecationReplacement: 'tlsAllowInvalidHostnames',
      }),
    sslFIPSMode: z.boolean().optional().register(cliOptionsRegistry, {
      deprecationReplacement: 'tlsFIPSMode',
      unsupported: true,
    }),

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
      .register(cliOptionsRegistry, { alias: ['f'] }),

    // Options that can be boolean or string
    json: z.union([z.boolean(), z.enum(['relaxed', 'canonical'])]).optional(),
    oidcDumpTokens: z
      .union([z.boolean(), z.enum(['redacted', 'include-secrets'])])
      .optional(),
    browser: z.union([z.boolean(), z.string()]).optional(),
  })
  .loose();

/**
 * Metadata that can be used to define the yargs-parser configuration for a field.
 */
export type YargsOptionsMetadata = {
  alias?: string[];
};

/**
 * Type for option metadata
 */
export type CliOptionsRegistryMetadata = YargsOptionsMetadata & {
  deprecationReplacement?: keyof CliOptions;
  unsupported?: boolean;
};

/**
 * Extract metadata for a field using the custom registry
 */
const getCliOptionsMetadata = (
  fieldName: string
): CliOptionsRegistryMetadata | undefined => {
  const fieldSchema =
    CliOptionsSchema.shape[fieldName as keyof typeof CliOptionsSchema.shape];
  if (!fieldSchema) {
    return undefined;
  }
  return cliOptionsRegistry.get(fieldSchema);
};

/**
 * Generate yargs-parser configuration from schema
 */
export function generateYargsOptionsFromSchema({
  schema = CliOptionsSchema,
  configuration = {
    'camel-case-expansion': false,
    'unknown-options-as-args': true,
    'parse-positional-numbers': false,
    'parse-numbers': false,
    'greedy-arrays': false,
    'short-option-groups': false,
  },
}: {
  schema?: z.ZodObject;
  configuration?: YargsOptions['configuration'];
}): YargsOptions {
  const options = {
    string: <string[]>[],
    boolean: <string[]>[],
    array: <string[]>[],
    alias: <Record<string, string>>{},
    coerce: <Record<string, (value: unknown) => unknown>>{},
    number: <string[]>[],
  } satisfies Required<
    Pick<
      YargsOptions,
      'string' | 'boolean' | 'array' | 'alias' | 'coerce' | 'number'
    >
  >;

  for (const [fieldName, fieldSchema] of Object.entries(schema.shape)) {
    const meta = getCliOptionsMetadata(fieldName);

    // Unwrap optional type
    let unwrappedType = fieldSchema;
    if (fieldSchema instanceof z.ZodOptional) {
      unwrappedType = fieldSchema.unwrap();
    }

    // Determine type
    if (unwrappedType instanceof z.ZodArray) {
      options.array.push(fieldName);
    } else if (unwrappedType instanceof z.ZodBoolean) {
      options.boolean.push(fieldName);
    } else if (unwrappedType instanceof z.ZodString) {
      options.string.push(fieldName);
    } else if (unwrappedType instanceof z.ZodNumber) {
      options.number.push(fieldName);
    } else if (unwrappedType instanceof z.ZodUnion) {
      // Handle union types (like json, browser, oidcDumpTokens)
      // Check if the union includes boolean
      const unionOptions = (
        unwrappedType as z.ZodUnion<[z.ZodTypeAny, ...z.ZodTypeAny[]]>
      ).options;
      const hasBoolean = unionOptions.some(
        (opt) => opt instanceof z.ZodBoolean
      );
      const hasString = unionOptions.some(
        (opt) => opt instanceof z.ZodString || opt instanceof z.ZodEnum
      );

      if (hasString && !hasBoolean) {
        options.string.push(fieldName);
      }

      if (hasBoolean && hasString) {
        // When a field has both boolean and string, we add a coerce function to the field.
        // This allows to get a value in both --<field> and --<field>=<value> for boolean and string.
        options.coerce[fieldName] = coerceIfBoolean;
      }
    } else {
      throw new Error(`Unknown field type: ${unwrappedType.constructor.name}`);
    }

    // Add aliases
    if (meta?.alias) {
      for (const a of meta.alias) {
        options.alias[a] = fieldName;
      }
    }
  }

  return {
    ...options,
    configuration,
  };
}

/**
 * Maps deprecated arguments to their new counterparts, derived from schema metadata.
 */
function getDeprecatedArgsWithReplacement(): Record<
  keyof z.infer<typeof CliOptionsSchema>,
  keyof CliOptions
> {
  const deprecated: Record<string, keyof CliOptions> = {};
  for (const fieldName of Object.keys(CliOptionsSchema.shape)) {
    const meta = getCliOptionsMetadata(fieldName);
    if (meta?.deprecationReplacement) {
      deprecated[fieldName] = meta.deprecationReplacement;
    }
  }
  return deprecated;
}

/**
 * Get list of unsupported arguments, derived from schema metadata.
 */
function getUnsupportedArgs(schema: z.ZodObject): string[] {
  const unsupported: string[] = [];
  for (const fieldName of Object.keys(schema.shape)) {
    const meta = getCliOptionsMetadata(fieldName);
    if (meta?.unsupported) {
      unsupported.push(fieldName);
    }
  }
  return unsupported;
}

/**
 * Determine the locale of the shell.
 *
 * @param {string[]} args - The arguments.
 *
 * @returns {string} The locale.
 */
export function getLocale(args: string[], env: any): string {
  const localeIndex = args.indexOf('--locale');
  if (localeIndex > -1) {
    return args[localeIndex + 1];
  }
  const lang = env.LANG || env.LANGUAGE || env.LC_ALL || env.LC_MESSAGES;
  return lang ? lang.split('.')[0] : lang;
}

function isConnectionSpecifier(arg?: string): boolean {
  return (
    typeof arg === 'string' &&
    (arg.startsWith('mongodb://') ||
      arg.startsWith('mongodb+srv://') ||
      !(arg.endsWith('.js') || arg.endsWith('.mongodb')))
  );
}

export function parseCliArgs<T>({
  args,
  schema,
  parserConfiguration,
}: {
  args: string[];
  schema?: z.ZodObject;
  parserConfiguration?: YargsOptions['configuration'];
}): T & parser.Arguments {
  const options = generateYargsOptionsFromSchema({
    schema,
    configuration: parserConfiguration,
  });

  return parser(args, options) as unknown as T & parser.Arguments;
}

/**
 * Parses mongosh-specific arguments into a JS object.
 *
 * @param args - The CLI arguments.
 *
 * @returns The arguments as cli options.
 */
export function parseMongoshCliOptionsArgs(args: string[]): {
  options: CliOptions;
  warnings: string[];
} {
  const programArgs = args.slice(2);
  i18n.setLocale(getLocale(programArgs, process.env));

  const parsed = parseCliArgs<
    CliOptions & {
      smokeTests: boolean;
      perfTests: boolean;
      buildInfo: boolean;
      file?: string[];
    }
  >({ args: programArgs, schema: CliOptionsSchema });

  const positionalArguments = parsed._ ?? [];
  for (const arg of positionalArguments) {
    if (typeof arg === 'string' && arg.startsWith('-')) {
      throw new UnknownCliArgumentError(arg);
    }
  }

  if (typeof positionalArguments[0] === 'string') {
    if (!parsed.nodb && isConnectionSpecifier(positionalArguments[0])) {
      parsed.connectionSpecifier = positionalArguments.shift() as string;
    }
  }

  // Remove the _ property from the parsed object
  const { _: _exclude, ...parsedCliOptions } = parsed;

  return {
    options: {
      ...parsedCliOptions,
      fileNames: [
        ...(parsedCliOptions.file ?? []),
        ...(positionalArguments as string[]),
      ],
    },
    warnings: verifyCliArguments(parsed),
  };
}

function verifyCliArguments(args: CliOptions): string[] {
  const unsupportedArgs = getUnsupportedArgs(CliOptionsSchema);
  for (const unsupported of unsupportedArgs) {
    if (unsupported in args) {
      throw new MongoshUnimplementedError(
        `Argument --${unsupported} is not supported in mongosh`,
        CommonErrors.InvalidArgument
      );
    }
  }

  const jsonValidation = CliOptionsSchema.shape.json.safeParse(args.json);
  if (!jsonValidation.success) {
    throw new MongoshUnimplementedError(
      '--json can only have the values relaxed or canonical',
      CommonErrors.InvalidArgument
    );
  }

  const oidcDumpTokensValidation =
    CliOptionsSchema.shape.oidcDumpTokens.safeParse(args.oidcDumpTokens);
  if (!oidcDumpTokensValidation.success) {
    throw new MongoshUnimplementedError(
      '--oidcDumpTokens can only have the values redacted or include-secrets',
      CommonErrors.InvalidArgument
    );
  }

  const messages = [];
  const deprecatedArgs = getDeprecatedArgsWithReplacement();
  for (const deprecated of Object.keys(deprecatedArgs)) {
    if (deprecated in args) {
      const replacement = deprecatedArgs[deprecated];
      messages.push(
        `WARNING: argument --${deprecated} is deprecated and will be removed. Use --${replacement} instead.`
      );

      // This is a complicated type scenario.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (args as any)[replacement] = args[deprecated as keyof CliOptions];
      delete args[deprecated as keyof CliOptions];
    }
  }
  return messages;
}

export function coerceIfBoolean(value: unknown) {
  if (typeof value === 'string') {
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }
    return value;
  }
  return value;
}

export class UnknownCliArgumentError extends Error {
  /** The argument that was not parsed. */
  readonly argument: string;
  constructor(argument: string) {
    super(`Unknown argument: ${argument}`);
    this.name = 'UnknownCliArgumentError';
    this.argument = argument;
  }
}
