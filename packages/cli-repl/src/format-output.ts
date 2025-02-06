import numeral from 'numeral';
import textTable from 'text-table';
import i18n from '@mongosh/i18n';
import type { InspectOptionsStylized } from 'util';
import util from 'util';
import stripAnsi from 'strip-ansi';
import clr from './clr';
import type {
  HelpProperties,
  CollectionNamesWithTypes,
} from '@mongosh/shell-api';
import { isShouldReportAsBugError } from '@mongosh/errors';
import type { MongoServerError } from 'mongodb';

type EvaluationResult = {
  value: any;
  type?: string | null;
};

export type FormatOptions = {
  colors: boolean;
  compact?: boolean | number;
  depth?: number;
  maxArrayLength?: number;
  maxStringLength?: number;
  showStackTraces?: boolean;
  bugReportErrorMessageInfo?: string;
  allowControlCharacters?: boolean;
};

// eslint-disable-next-line no-control-regex
export const CONTROL_CHAR_REGEXP = /[\x00-\x1F\x7F-\x9F]/;
// Same, but doesn't match \t and \n, which can be used normally
// for controlling visual output
export const CONTROL_CHAR_REGEXP_ALLOW_SIMPLE =
  // eslint-disable-next-line no-control-regex
  /[\x00-\x08\x0B-\x1F\x7F-\x9F]/;

const fullDepthInspectOptions = {
  depth: Infinity,
  maxArrayLength: Infinity,
  maxStringLength: Infinity,
};

function formatBytes(value: number): string {
  const precision = value <= 1000 ? '0' : '0.00';
  return numeral(value).format(precision + ' ib');
}

/**
 * Return the pretty string for the output.
 *
 * @param evaluationResult The evaluation result object, it holds the evaluated
 *  `value` and an optional `type` property, indicating the shell api type of
 *  the value.
 *
 * @param options A set of options that indicate what kind of formatting to apply.
 *
 * @returns {string} The formatted output.
 */
export function formatOutput(
  evaluationResult: EvaluationResult,
  options: FormatOptions
): string {
  const { value, type } = evaluationResult;

  if (type === 'Cursor' || type === 'AggregationCursor') {
    return formatCursor(value, { ...options, ...fullDepthInspectOptions });
  }

  if (type === 'CursorIterationResult') {
    return formatCursorIterationResult(value, {
      ...options,
      ...fullDepthInspectOptions,
    });
  }

  if (type === 'Help') {
    return formatHelp(value, options);
  }

  if (type === 'ShowDatabasesResult') {
    return formatDatabases(value, options);
  }

  if (type === 'ShowCollectionsResult') {
    return formatCollections(value, options);
  }

  if (type === 'ShowBannerResult') {
    return formatBanner(value, options);
  }

  if (type === 'StatsResult') {
    return formatStats(value, options);
  }

  if (type === 'ListCommandsResult') {
    return formatListCommands(value, options);
  }

  // TODO(MONGOSH-1285,STREAMS-1136): Remove this special handling
  // for listStreamProcessors return value, it harms usability by
  // making the values look like they have different structures
  // (see linked tickets for details)
  if (type === 'StreamsListResult') {
    return inspect(value, {
      ...options,
      ...fullDepthInspectOptions,
    });
  }

  if (type === 'ShowProfileResult') {
    if (value.count === 0) {
      return clr(
        `db.system.profile is empty.
Use db.setProfilingLevel(2) will enable profiling.
Use db.getCollection('system.profile').find() to show raw profile entries.`,
        'yellow',
        options
      );
    }
    // direct from old shell
    return value.result
      .map(function (x: any) {
        const res = `${x.op}\t${x.ns} ${x.millis}ms ${String(x.ts).substring(
          0,
          24
        )}\n`;
        let l = '';
        for (const z in x) {
          if (z === 'op' || z === 'ns' || z === 'millis' || z === 'ts') {
            continue;
          }

          const val = x[z];
          const mytype = typeof val;

          if (mytype === 'object') {
            l += z + ':' + formatSimpleType(val, options) + ' ';
          } else if (mytype === 'boolean') {
            l += z + ' ';
          } else {
            l += z + ':' + val + ' ';
          }
        }
        return `${res}${l}`;
      })
      .join('\n');
  }

  if (type === 'Error') {
    return formatError(value, options);
  }

  if (type === 'ExplainOutput' || type === 'ExplainableCursor') {
    return formatSimpleType(value, {
      ...options,
      ...fullDepthInspectOptions,
    });
  }

  return formatSimpleType(value, options);
}

function formatSimpleType(output: any, options: FormatOptions): string {
  if (
    typeof output === 'string' &&
    (options.allowControlCharacters ||
      !CONTROL_CHAR_REGEXP_ALLOW_SIMPLE.test(output))
  ) {
    return output;
  }
  if (typeof output === 'undefined') return '';

  return inspect(output, options);
}

function formatCollections(
  output: CollectionNamesWithTypes[],
  options: FormatOptions
): string {
  const systemCollections: CollectionNamesWithTypes[] = [];
  const otherCollections: CollectionNamesWithTypes[] = [];

  for (const coll of output) {
    if (coll.name.startsWith('system.') || coll.name.startsWith('enxcol_.')) {
      systemCollections.push(coll);
    } else {
      otherCollections.push(coll);
    }
  }

  const tableEntries = [
    ...otherCollections.map((coll) => [
      clr(formatSimpleType(coll.name, options), 'bold', options),
      coll.badge,
    ]),
    ...systemCollections.map((coll) => [
      `${options.colors ? '\u001b[2m' : ''}${clr(
        formatSimpleType(coll.name, options),
        'bold',
        options
      )}`,
      coll.badge,
    ]),
  ];

  return textTable(tableEntries, { align: ['l', 'l'] });
}

function formatBanner(
  output: null | { header?: string; content: string },
  options: FormatOptions
): string {
  if (!output?.content) {
    return '';
  }

  let text = '';
  text += `${clr('------', 'mongosh:section-header', options)}\n`;
  if (output.header) {
    text += `   ${clr(
      formatSimpleType(output.header, options),
      'mongosh:section-header',
      options
    )}\n`;
  }
  // indent output.content with 3 spaces
  text +=
    formatSimpleType(output.content, options).trim().replace(/^/gm, '   ') +
    '\n';
  text += `${clr('------', 'mongosh:section-header', options)}\n`;
  return text;
}

function formatDatabases(output: any[], options: FormatOptions): string {
  const tableEntries = output.map((db) => [
    clr(formatSimpleType(db.name, options), 'bold', options),
    formatBytes(db.sizeOnDisk),
  ]);

  return textTable(tableEntries, { align: ['l', 'r'] });
}

function formatStats(
  output: Record<string, any>,
  options: FormatOptions
): string {
  return Object.keys(output)
    .map((c) => {
      return (
        `${clr(
          formatSimpleType(c, options),
          'mongosh:section-header',
          options
        )}\n` + `${inspect(output[c], options)}`
      );
    })
    .join('\n---\n');
}

function formatListCommands(
  output: Record<string, Record<string, unknown>>,
  options: FormatOptions
): string {
  const tableEntries = Object.keys(output).map((cmd) => {
    const val = output[cmd];
    let result = `${clr(cmd, 'mongosh:section-header', options)}: `;
    for (const key of Object.keys(val)) {
      if (val[key] === true)
        result += ` ${clr(
          formatSimpleType(key, options),
          ['bold', 'white'],
          options
        )}`;
    }
    if (val.help) {
      result += `\n${clr(
        formatSimpleType(val.help, options),
        'green',
        options
      )}`;
    }
    if (Array.isArray(val.apiVersions) && val.apiVersions.length > 0) {
      result += `\n${clr(
        'API Versions',
        ['bold', 'white'],
        options
      )} ${formatSimpleType(val.apiVersions.join(', '), options)}`;
    }
    if (
      Array.isArray(val.deprecatedApiVersions) &&
      val.deprecatedApiVersions.length > 0
    ) {
      result += `\n${clr(
        'Deprecated API Versions',
        ['white'],
        options
      )} ${formatSimpleType(val.deprecatedApiVersions.join(', '), options)}`;
    }
    return result;
  });
  return tableEntries.join('\n\n');
}

export function formatError(error: Error, options: FormatOptions): string {
  let result = '';
  if (error.name) {
    result += `\r${clr(error.name, 'mongosh:error', options)}`;
    const codeName = (error as MongoServerError).codeName;
    if (codeName)
      result += `${clr(
        `[` + formatSimpleType(codeName, options) + `]`,
        'mongosh:error',
        options
      )}`;
    result += ': ';
  }

  if (error.message && String(error.name).startsWith('Mongo')) {
    // potentially contains arbitrary strings from the database
    result += formatSimpleType(error.message, options);
  } else if (error.message) {
    result += error.message;
  }

  if (isShouldReportAsBugError(error)) {
    result +=
      '\nThis is an error inside mongosh. Please file a bug report for the MONGOSH project here: https://jira.mongodb.org/projects/MONGOSH/issues.';
    if (options.bugReportErrorMessageInfo) {
      result += `\n${options.bugReportErrorMessageInfo}`;
    }
  }
  if (error.name === 'SyntaxError') {
    if (!options.colors) {
      // Babel applies syntax highlighting to its errors by default.
      // This is deep inside the dependency chain here, to the degree where
      // it seems unreasonable to pass coloring options along all the way.
      // Instead, we just strip the syntax highlighting away if coloring is
      // disabled (e.g. in script usage).
      result = stripAnsi(result);
    }
    // leave a bit of breathing room after the syntax error message output
    result += '\n\n';
  } else if (options.showStackTraces && error.stack) {
    result += error.stack.slice(error.stack.indexOf('\n'));
  }
  if ((error as any).errInfo) {
    result += `\n${clr(
      i18n.__('cli-repl.cli-repl.additionalErrorInfo'),
      'mongosh:additional-error-info',
      options
    )}: `;
    result += inspect((error as any).errInfo, {
      ...options,
      ...fullDepthInspectOptions,
    });
  }
  if ((error as any).result) {
    result += `\n${clr(
      i18n.__('cli-repl.cli-repl.additionalErrorResult'),
      'mongosh:additional-error-info',
      options
    )}: `;
    result += inspect((error as any).result, {
      ...options,
      ...fullDepthInspectOptions,
    });
  }
  if ((error as any).writeErrors) {
    result += `\n${clr(
      i18n.__('cli-repl.cli-repl.additionalErrorWriteErrors'),
      'mongosh:additional-error-info',
      options
    )}: `;
    result += inspect((error as any).writeErrors, {
      ...options,
      ...fullDepthInspectOptions,
    });
  }
  if ((error as any).violations) {
    result += `\n${clr(
      i18n.__('cli-repl.cli-repl.additionalErrorViolations'),
      'mongosh:additional-error-info',
      options
    )}: `;
    result += inspect((error as any).violations, {
      ...options,
      ...fullDepthInspectOptions,
    });
  }
  if ((error as any).cause) {
    result += `\n${clr(
      i18n.__('cli-repl.cli-repl.errorCausedBy'),
      'mongosh:additional-error-info',
      options
    )}: \n`;
    const { cause } = error as any;
    result +=
      Object.prototype.toString.call(cause) === '[object Error]'
        ? formatError(cause, options)
        : inspect(cause, options);
  }

  return result;
}

function removeUndefinedValues<T>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj as Record<string, any>).filter(
      (keyValue) => keyValue[1] !== undefined
    )
  );
}

function dateInspect(
  this: Date,
  depth: number,
  options: InspectOptionsStylized
): string {
  if (isNaN(this.valueOf())) {
    return options.stylize('Invalid Date', 'date');
  }
  return `ISODate('${this.toISOString()}')`;
}

function inspect(output: unknown, options: FormatOptions): string {
  // Set a custom inspection function for 'Date' objects. Since we only want this
  // to affect mongosh scripts, we unset it later.
  (Date.prototype as any)[util.inspect.custom] = dateInspect;
  try {
    return util.inspect(
      output,
      removeUndefinedValues({
        showProxy: false,
        colors: options.colors ?? true,
        depth: options.depth ?? 6,
        maxArrayLength: options.maxArrayLength,
        maxStringLength: options.maxStringLength,
        compact: options.compact,
      })
    );
  } finally {
    delete (Date.prototype as any)[util.inspect.custom];
  }
}

function formatCursor(
  value: { documents?: unknown[]; cursorHasMore?: boolean },
  options: FormatOptions
): string {
  if (!value.documents?.length) {
    return '';
  }

  return formatCursorIterationResult(value, options);
}

function formatCursorIterationResult(
  value: { documents?: unknown[]; cursorHasMore?: boolean },
  options: FormatOptions
): string {
  if (!value.documents?.length) {
    return i18n.__('shell-api.classes.Cursor.iteration.no-cursor');
  }

  let ret = inspect(value.documents, options);
  if (value.cursorHasMore) {
    ret +=
      '\n' + i18n.__('shell-api.classes.Cursor.iteration.type-it-for-more');
  }
  return ret;
}

function formatHelp(value: HelpProperties, options: FormatOptions): string {
  // This is the spacing between arguments and description in mongosh --help.
  // Use this length for formatting consistency.
  const argLen = 47;
  let helpMenu = '';

  if (value.help) {
    helpMenu += `\n  ${clr(
      `${value.help}:`,
      'mongosh:section-header',
      options
    )}\n\n`;
  }

  for (const method of value.attr || []) {
    let formatted = '';
    if (method.name && method.description) {
      formatted = `    ${method.name}`;
      const extraSpaces = argLen - formatted.length;
      const descriptionLines = method.description.split('\n');
      descriptionLines[0] = ' '.repeat(extraSpaces) + descriptionLines[0];
      for (let i = 1; i < descriptionLines.length; i++) {
        if (descriptionLines[i].trim() !== '') {
          descriptionLines[i] = ' '.repeat(argLen) + descriptionLines[i];
        }
      }
      formatted += descriptionLines.join('\n');
    }
    if (!method.name && method.description) {
      formatted = `  ${method.description}`;
    }

    if (formatted !== '') {
      helpMenu += `${formatted}\n`;
    }
  }

  if (value.docs) {
    helpMenu +=
      `\n  ${clr(i18n.__('cli-repl.args.moreInformation'), 'bold', options)} ` +
      `${clr(value.docs, 'mongosh:uri', options)}`;
  }

  return helpMenu;
}
