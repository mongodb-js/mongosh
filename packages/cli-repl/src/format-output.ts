/* eslint no-use-before-define: ["error", { "functions": false }] */

import prettyBytes from 'pretty-bytes';
import bsonWriter from './format-bson';
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

export function formatError(error): string {
  let result = '';
  if (error.name) result += `\r${clr(error.name, ['bold', 'red'])}: `;
  if (error.message) result += error.message;
  // leave a bit of breathing room after the syntax error message output
  if (error.name === 'SyntaxError') result += '\n\n';

  return result;
}

function inspect(output): any {
  const formatted = bsonWriter(output);
  return util.inspect(formatted, {
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
