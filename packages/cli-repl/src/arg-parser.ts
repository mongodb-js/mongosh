import i18n from '@mongosh/i18n';
import { CliOptions } from '@mongosh/service-provider-server';
import parser from 'yargs-parser';
import { colorizeForStderr as clr } from './clr';
import { USAGE } from './constants';

/**
 * Unknown translation key.
 */
const UNKNOWN = 'cli-repl.arg-parser.unknown-option';

/**
 * npm start constant.
 */
const START = 'start';

/**
 * The yargs-parser options configuration.
 */
const OPTIONS = {
  string: [
    'authenticationDatabase',
    'authenticationMechanism',
    'awsAccessKeyId',
    'awsSecretAccessKey',
    'awsSessionToken',
    'db',
    'eval',
    'gssapiHostName',
    'gssapiServiceName',
    'host',
    'keyVaultNamespace',
    'kmsURL',
    'locale',
    'password',
    'port',
    'tlsCAFile',
    'tlsCertificateKeyFile',
    'tlsCertificateKeyFilePassword',
    'tlsCertificateSelector',
    'tlsCRLFile',
    'tlsDisabledProtocols',
    'username'
  ],
  boolean: [
    'async',
    'help',
    'ipv6',
    'nodb',
    'norc',
    'quiet',
    'redactInfo',
    'retryWrites',
    'shell',
    'tls',
    'tlsAllowInvalidCertificates',
    'tlsAllowInvalidHostnames',
    'tlsFIPSMode',
    'verbose',
    'version'
  ],
  alias: {
    h: 'help',
    p: 'password',
    u: 'username'
  },
  configuration: {
    'camel-case-expansion': false,
    'unknown-options-as-args': true
  }
};

/**
 * Determine the locale of the shell.
 *
 * @param {string[]} args - The arguments.
 *
 * @returns {string} The locale.
 */
function getLocale(args: string[], env: any): string {
  const localeIndex = args.indexOf('--locale');
  if (localeIndex > -1) {
    return args[localeIndex + 1];
  }
  const lang = env.LANG || env.LANGUAGE || env.LC_ALL || env.LC_MESSAGES;
  return lang ? lang.split('.')[0] : lang;
}

/**
 * Parses arguments into a JS object.
 *
 * @param {string[]} args - The args.
 *
 * @returns {CliOptions} The arguments as cli options.
 */
function parse(args: string[]): CliOptions {
  const programArgs = args.slice(2);
  i18n.setLocale(getLocale(programArgs, process.env));

  const parsed = parser(programArgs, OPTIONS);
  parsed._ = parsed._.filter(arg => {
    if (arg === START) {
      return false;
    }
    if (!arg.startsWith('-')) {
      return true;
    }
    throw new Error(
      `  ${clr(i18n.__(UNKNOWN), ['red', 'bold'])} ${clr(arg, 'bold')}
      ${USAGE}`
    );
  });
  return parsed;
}

export default parse;
export { getLocale };
