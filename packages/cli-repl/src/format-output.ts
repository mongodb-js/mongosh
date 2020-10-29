/* eslint no-use-before-define: ["error", { "functions": false }] */

import prettyBytes from 'pretty-bytes';
import textTable from 'text-table';
import i18n from '@mongosh/i18n';
import util from 'util';
import clr from './clr';
import type { HelpProperties } from '@mongosh/shell-api';

type EvaluationResult = {
  value: any;
  type?: string;
};

type FormatOptions = {
  colors: boolean;
};

/**
 * Return the pretty string for the output.
 *
 * @param {any} output - The evaluation result object, it holds the evaluated
 *  `value` and an optional `type` property, indicating the shell api type of
 *  the value.
 *
 * @param {string} type - The shell api type if known or undefined.
 *
 * @returns {string} The output.
 */
export default function formatOutput(evaluationResult: EvaluationResult, options: FormatOptions): string {
  const { value, type } = evaluationResult;

  if (type === 'Cursor') {
    return formatCursor(value, options);
  }

  if (type === 'CursorIterationResult') {
    return formatCursorIterationResult(value, options);
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

  if (type === 'StatsResult') {
    return formatStats(value, options);
  }

  if (type === 'ListCommandsResult') {
    return formatListCommands(value, options);
  }

  if (type === 'ShowProfileResult') {
    if (value.count === 0) {
      return clr(`db.system.profile is empty.
Use db.setProfilingLevel(2) will enable profiling.
Use db.getCollection('system.profile').find() to show raw profile entries.`, 'yellow', options);
    }
    // direct from old shell
    return value.result.map(function(x: any) {
      const res = `${x.op}\t${x.ns} ${x.millis}ms ${String(x.ts).substring(0, 24)}\n`;
      let l = '';
      for (const z in x) {
        if (z === 'op' || z === 'ns' || z === 'millis' || z === 'ts') {
          continue;
        }

        const val = x[z];
        const mytype = typeof (val);

        if (mytype === 'object') {
          l += z + ':' + formatSimpleType(val, options) + ' ';
        } else if (mytype === 'boolean') {
          l += z + ' ';
        } else {
          l += z + ':' + val + ' ';
        }
      }
      return `${res}${l}`;
    }).join('\n');
  }

  if (type === 'Error') {
    return formatError(value, options);
  }

  return formatSimpleType(value, options);
}

function formatSimpleType(output: any, options: FormatOptions): any {
  if (typeof output === 'string') return output;
  if (typeof output === 'undefined') return '';

  return inspect(output, options);
}

function formatCollections(output: string[], options: FormatOptions): string {
  return clr(output.join('\n'), 'bold', options);
}

function formatDatabases(output: any[], options: FormatOptions): string {
  const tableEntries = output.map(
    (db) => [clr(db.name, 'bold', options), prettyBytes(db.sizeOnDisk)]
  );

  return textTable(tableEntries, { align: ['l', 'r'] });
}

function formatStats(output: Record<string, any>, options: FormatOptions): string {
  return Object.keys(output).map((c) => {
    return `${clr(c, ['bold', 'yellow'], options)}\n` +
      `${inspect(output[c], options)}`;
  }).join('\n---\n');
}

function formatListCommands(output: Record<string, any>, options: FormatOptions): string {
  const tableEntries = Object.keys(output).map(
    (cmd) => {
      const val = output[cmd];
      let result = Object.keys(val).filter(k => k !== 'help').reduce((str, k) => {
        if (val[k]) {
          return `${str} ${clr(k, ['bold', 'white'], options)}`;
        }
        return str;
      }, `${clr(cmd, ['bold', 'yellow'], options)}: `);
      result += val.help ? `\n${clr(val.help, 'green', options)}` : '';
      return result;
    }
  );
  return tableEntries.join('\n\n');
}

export function formatError(error: Error, options: FormatOptions): string {
  let result = '';
  if (error.name) result += `\r${clr(error.name, ['bold', 'red'], options)}: `;
  if (error.message) result += error.message;
  // leave a bit of breathing room after the syntax error message output
  if (error.name === 'SyntaxError') result += '\n\n';

  return result;
}

function inspect(output: any, options: FormatOptions): any {
  return util.inspect(output, {
    showProxy: false,
    colors: options.colors ?? true,
    depth: 6
  });
}

function formatCursor(value: any, options: FormatOptions): any {
  if (!value.length) {
    return '';
  }

  return inspect(value, options);
}

function formatCursorIterationResult(value: any, options: FormatOptions): any {
  if (!value.length) {
    return i18n.__('shell-api.classes.Cursor.iteration.no-cursor');
  }

  return inspect(value, options);
}

function formatHelp(value: HelpProperties, options: FormatOptions): string {
  // This is the spacing between arguments and description in mongosh --help.
  // Use this length for formatting consistency.
  const argLen = 47;
  let helpMenu = '';

  if (value.help) {
    helpMenu += `\n  ${clr(`${value.help}:`, ['yellow', 'bold'], options)}\n\n`;
  }

  (value.attr || []).forEach((method) => {
    let formatted = '';
    if (method.name && method.description) {
      formatted = `    ${method.name}`;
      const extraSpaces = argLen - formatted.length;
      formatted += `${' '.repeat(extraSpaces)}${method.description}`;
    }
    if (!method.name && method.description) {
      formatted = `  ${method.description}`;
    }

    if (formatted !== '') {
      helpMenu += `${formatted}\n`;
    }
  });

  if (value.docs) {
    helpMenu += `\n  ${clr(i18n.__('cli-repl.args.moreInformation'), 'bold', options)} ` +
      `${clr(value.docs, ['green', 'bold'], options)}`;
  }

  return helpMenu;
}
