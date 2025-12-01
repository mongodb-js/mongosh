import i18n from '@mongosh/i18n';
import {
  getLocale,
  parseArgsWithCliOptions,
  UnknownCliArgumentError,
  UnsupportedCliArgumentError,
} from '@mongosh/arg-parser/arg-parser';
import { colorizeForStderr as clr } from './clr';
import { USAGE } from './constants';
import type { CliOptions } from '@mongosh/arg-parser';
import { CommonErrors, MongoshUnimplementedError } from '@mongosh/errors';

/**
 * Unknown translation key.
 */
const UNKNOWN = 'cli-repl.arg-parser.unknown-option';

export function parseMongoshArgs(argsWithProgram: string[]): {
  parsed: CliOptions;
  warnings: string[];
} {
  try {
    const args = argsWithProgram.slice(2);
    i18n.setLocale(getLocale(argsWithProgram, process.env));

    const { parsed, deprecated } = parseArgsWithCliOptions({ args });
    const warnings = Object.entries(deprecated).map(
      ([deprecated, replacement]) =>
        `WARNING: argument --${deprecated} is deprecated and will be removed. Use --${replacement} instead.`
    );
    return {
      parsed,
      warnings,
    };
  } catch (error) {
    if (error instanceof UnsupportedCliArgumentError) {
      throw new MongoshUnimplementedError(
        `Argument --${error.argument} is not supported in mongosh`,
        CommonErrors.InvalidArgument
      );
    }
    if (error instanceof UnknownCliArgumentError) {
      throw new MongoshUnimplementedError(
        `  ${clr(i18n.__(UNKNOWN), 'mongosh:error')} ${clr(
          String(error.argument),
          'bold'
        )}
        ${USAGE}`,
        CommonErrors.InvalidArgument
      );
    }
    throw error;
  }
}
