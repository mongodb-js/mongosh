import { CommonErrors, MongoshUnimplementedError } from '@mongosh/errors';
import i18n from '@mongosh/i18n';
import parser from 'yargs-parser';
import type { CliOptions } from './cli-options';

/**
 * The yargs-parser options configuration.
 */
const OPTIONS = {
  string: [
    'apiVersion',
    'authenticationDatabase',
    'authenticationMechanism',
    'awsAccessKeyId',
    'awsIamSessionToken',
    'awsSecretAccessKey',
    'awsSessionToken',
    'awsIamSessionToken',
    'browser',
    'csfleLibraryPath',
    'cryptSharedLibPath',
    'db',
    'gssapiHostName',
    'gssapiServiceName',
    'sspiHostnameCanonicalization',
    'sspiRealmOverride',
    'jsContext',
    'host',
    'keyVaultNamespace',
    'kmsURL',
    'locale',
    'oidcFlows',
    'oidcRedirectUri',
    'password',
    'port',
    'sslPEMKeyFile',
    'sslPEMKeyPassword',
    'sslCAFile',
    'sslCertificateSelector',
    'sslCRLFile',
    'sslDisabledProtocols',
    'tlsCAFile',
    'tlsCertificateKeyFile',
    'tlsCertificateKeyFilePassword',
    'tlsCertificateSelector',
    'tlsCRLFile',
    'tlsDisabledProtocols',
    'username',
  ],
  boolean: [
    'apiDeprecationErrors',
    'apiStrict',
    'buildInfo',
    'exposeAsyncRewriter',
    'help',
    'ipv6',
    'nodb',
    'norc',
    'oidcTrustedEndpoint',
    'oidcIdTokenAsAccessToken',
    'oidcNoNonce',
    'perfTests',
    'quiet',
    'retryWrites',
    'shell',
    'smokeTests',
    'skipStartupWarnings',
    'ssl',
    'sslAllowInvalidCertificates',
    'sslAllowInvalidHostnames',
    'sslFIPSMode',
    'tls',
    'tlsAllowInvalidCertificates',
    'tlsAllowInvalidHostnames',
    'tlsFIPSMode',
    'tlsUseSystemCA',
    'verbose',
    'version',
  ],
  array: ['eval', 'file'],
  alias: {
    h: 'help',
    p: 'password',
    u: 'username',
    f: 'file',
    'build-info': 'buildInfo',
    json: 'json', // List explicitly here since it can be a boolean or a string
    browser: 'browser', // ditto
    oidcDumpTokens: 'oidcDumpTokens', // ditto
    oidcRedirectUrl: 'oidcRedirectUri', // I'd get this wrong about 50% of the time
    oidcIDTokenAsAccessToken: 'oidcIdTokenAsAccessToken', // ditto
  },
  configuration: {
    'camel-case-expansion': false,
    'unknown-options-as-args': true,
    'parse-positional-numbers': false,
    'parse-numbers': false,
    'greedy-arrays': false,
    'short-option-groups': false,
  },
};

/**
 * Maps deprecated arguments to their new counterparts.
 */
const DEPRECATED_ARGS_WITH_REPLACEMENT: Record<string, keyof CliOptions> = {
  ssl: 'tls',
  sslAllowInvalidCertificates: 'tlsAllowInvalidCertificates',
  sslAllowInvalidHostnames: 'tlsAllowInvalidHostnames',
  sslFIPSMode: 'tlsFIPSMode',
  sslPEMKeyFile: 'tlsCertificateKeyFile',
  sslPEMKeyPassword: 'tlsCertificateKeyFilePassword',
  sslCAFile: 'tlsCAFile',
  sslCertificateSelector: 'tlsCertificateSelector',
  sslCRLFile: 'tlsCRLFile',
  sslDisabledProtocols: 'tlsDisabledProtocols',
};

/**
 * If an unsupported argument is given an error will be thrown.
 */
const UNSUPPORTED_ARGS: Readonly<string[]> = ['sslFIPSMode', 'gssapiHostName'];

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

/**
 * Parses arguments into a JS object.
 *
 * @param args - The CLI arguments.
 *
 * @returns The arguments as cli options.
 */
export function parseCliArgs(args: string[]):
  | CliOptions & {
      smokeTests: boolean;
      perfTests: boolean;
      buildInfo: boolean;
      _argParseWarnings: string[];
    } {
  const programArgs = args.slice(2);
  i18n.setLocale(getLocale(programArgs, process.env));

  const parsed = parser(programArgs, OPTIONS) as unknown as CliOptions & {
    smokeTests: boolean;
    perfTests: boolean;
    buildInfo: boolean;
    _argParseWarnings: string[];
    _?: string[];
    file?: string[];
  };
  const positionalArguments = parsed._ ?? [];
  for (const arg of positionalArguments) {
    if (arg.startsWith('-')) {
      throw new UnknownCliArgumentError(arg);
    }
  }

  if (!parsed.nodb && isConnectionSpecifier(positionalArguments[0])) {
    parsed.connectionSpecifier = positionalArguments.shift();
  }
  parsed.fileNames = [...(parsed.file ?? []), ...positionalArguments];

  // All positional arguments are either in connectionSpecifier or fileNames,
  // and should only be accessed that way now.
  delete parsed._;

  parsed._argParseWarnings = verifyCliArguments(parsed);

  return parsed;
}

export function verifyCliArguments(args: any /* CliOptions */): string[] {
  for (const unsupported of UNSUPPORTED_ARGS) {
    if (unsupported in args) {
      throw new MongoshUnimplementedError(
        `Argument --${unsupported} is not supported in mongosh`,
        CommonErrors.InvalidArgument
      );
    }
  }

  if (![undefined, true, false, 'relaxed', 'canonical'].includes(args.json)) {
    throw new MongoshUnimplementedError(
      '--json can only have the values relaxed or canonical',
      CommonErrors.InvalidArgument
    );
  }

  if (
    ![undefined, true, false, 'redacted', 'include-secrets'].includes(
      args.oidcDumpTokens
    )
  ) {
    throw new MongoshUnimplementedError(
      '--oidcDumpTokens can only have the values redacted or include-secrets',
      CommonErrors.InvalidArgument
    );
  }

  const messages = [];
  for (const deprecated in DEPRECATED_ARGS_WITH_REPLACEMENT) {
    if (deprecated in args) {
      const replacement = DEPRECATED_ARGS_WITH_REPLACEMENT[deprecated];
      messages.push(
        `WARNING: argument --${deprecated} is deprecated and will be removed. Use --${replacement} instead.`
      );

      args[replacement] = args[deprecated];
      delete args[deprecated];
    }
  }
  return messages;
}

export class UnknownCliArgumentError extends Error {
  /** The argument that was not parsed. */
  readonly argument: string;
  constructor(argument: string) {
    super(`Unknown argument: ${argument}`);
    this.name = 'UnknownParserArgumentError';
    this.argument = argument;
  }
}
