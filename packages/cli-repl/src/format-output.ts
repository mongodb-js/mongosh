/* eslint no-use-before-define: ["error", { "functions": false }] */

import prettyBytes from 'pretty-bytes';
import textTable from 'text-table';
import i18n from '@mongosh/i18n';
import util from 'util';
import clr from './clr';

type EvaluationResult = {
  value: any;
  type?: string;
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
export default function formatOutput(evaluationResult: EvaluationResult): string {
  const { value, type } = evaluationResult;

  if (type === 'Cursor') {
    return formatCursor(value);
  }

  if (type === 'CursorIterationResult') {
    return formatCursorIterationResult(value);
  }

  if (type === 'Help') {
    return formatHelp(value);
  }

  if (type === 'ShowDatabasesResult') {
    return formatDatabases(value);
  }

  if (type === 'ShowCollectionsResult') {
    return formatCollections(value);
  }

  if (type === 'StatsResult') {
    return formatStats(value);
  }

  if (type === 'ListCommandsResult') {
    return formatListCommands(value);
  }

  if (type === 'ShowProfileResult') {
    if (value.count === 0) {
      return clr(`db.system.profile is empty.
Use db.setProfilingLevel(2) will enable profiling.
Use db.getCollection('system.profile').find() to show raw profile entries.`, 'yellow');
    }
    // direct from old shell
    return value.result.map(function(x) {
      const res = `${x.op}\t${x.ns} ${x.millis}ms ${String(x.ts).substring(0, 24)}\n`;
      let l = '';
      for (const z in x) {
        if (z === 'op' || z === 'ns' || z === 'millis' || z === 'ts') {
          continue;
        }

        const val = x[z];
        const mytype = typeof (val);

        if (mytype === 'string' || mytype === 'number') {
          l += z + ':' + val + ' ';
        } else if (mytype === 'object') {
          l += z + ':' + formatSimpleType(val) + ' ';
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
    return formatError(value);
  }

  return formatSimpleType(value);
}

function formatSimpleType(output): any {
  if (typeof output === 'string') return output;
  if (typeof output === 'undefined') return '';

  return inspect(output);
}

function formatCollections(output): string {
  return clr(output.join('\n'), 'bold');
}

function formatDatabases(output): string {
  const tableEntries = output.map(
    (db) => [clr(db.name, 'bold'), prettyBytes(db.sizeOnDisk)]
  );

  return textTable(tableEntries, { align: ['l', 'r'] });
}

function formatStats(output): string {
  return Object.keys(output).map((c) => {
    return `${clr(c, ['bold', 'yellow'])}\n${inspect(output[c])}`;
  }).join('\n---\n');
}

function formatListCommands(output): string {
  const tableEntries = Object.keys(output).map(
    (cmd) => {
      const val = output[cmd];
      let result = Object.keys(val).filter(k => k !== 'help').reduce((str, k) => {
        if (val[k]) {
          return `${str} ${clr(k, ['bold', 'white'])}`;
        }
        return str;
      }, `${clr(cmd, ['bold', 'yellow'])}: `);
      result += val.help ? `\n${clr(val.help, 'green')}` : '';
      return result;
    }
  );
  return tableEntries.join('\n\n');
}

export function formatError(error): string {
  let result = '';
  if (error.name) result += `\r${clr(error.name, ['bold', 'red'])}: `;
  if (error.message) result += error.message;
  // leave a bit of breathing room after the syntax error message output
  if (error.name === 'SyntaxError') result += '\n\n';

  return result;
}

function inspect(output): any {
  return util.inspect(output, {
    showProxy: false,
    colors: true,
    depth: 6
  });
}

function formatCursor(value): any {
  if (!value.length) {
    return '';
  }

  return inspect(value);
}

function formatCursorIterationResult(value): any {
  if (!value.length) {
    return i18n.__('shell-api.classes.Cursor.iteration.no-cursor');
  }

  return inspect(value);
}

function formatHelp(value): string {
  // This is the spacing between arguments and description in mongosh --help.
  // Use this length for formatting consistency.
  const argLen = 47;
  let helpMenu = '';

  if (value.help) {
    helpMenu += `\n  ${clr(`${value.help}:`, ['yellow', 'bold'])}\n\n`;
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
    helpMenu += `\n  ${clr(i18n.__('cli-repl.args.moreInformation'), 'bold')} ${clr(value.docs, ['green', 'bold'])}`;
  }

  return helpMenu;
}
