import i18n from '@mongosh/i18n';
import {
  parseCliArgs,
  UnknownCliArgumentError,
} from '@mongosh/arg-parser/arg-parser';
import { colorizeForStderr as clr } from './clr';
import { USAGE } from './constants';

/**
 * Unknown translation key.
 */
const UNKNOWN = 'cli-repl.arg-parser.unknown-option';

export function parseMongoshCliArgs(
  args: string[]
): ReturnType<typeof parseCliArgs> {
  try {
    return parseCliArgs(args);
  } catch (error) {
    if (error instanceof UnknownCliArgumentError) {
      throw new Error(
        `  ${clr(i18n.__(UNKNOWN), 'mongosh:error')} ${clr(
          String(error.argument),
          'bold'
        )}
        ${USAGE}`
      );
    }
    throw error;
  }
}
