import CliOptions from './cli-options';
import { USAGE } from './constants';
import i18n from '@mongosh/i18n';
import minimist from 'minimist';
import clr from './clr';
import os from 'os';

/**
 * Unknown translation key.
 */
const UNKNOWN = 'cli-repl.arg-parser.unknown-option';

/**
 * npm start constant.
 */
const START = 'start';

/**
 * The minimist options.
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
    'disableImplicitSessions',
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
  unknown: (parameter) => {
    if (parameter === START) {
      return false;
    }
    if (!parameter.startsWith('-')) {
      return true;
    }
    throw new Error(
      `  ${clr(i18n.__(UNKNOWN), ['red', 'bold'])} ${clr(parameter, 'bold')}
      ${USAGE}`
    );
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
  return minimist(programArgs, OPTIONS);
}

export default parse;
export { getLocale };
