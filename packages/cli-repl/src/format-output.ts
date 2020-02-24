import i18n from 'mongosh-i18n';
import util from 'util';
import clr from './clr';

type EvaluationResult = {
  value: any,
  type?: string
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
  const {value, type} = evaluationResult;

  if (type === 'Cursor') {
    return formatCursor(value);
  }

  if (type === 'CursorIterationResult') {
    return formatCursorIterationResult(value);
  }

  if (type === 'Help') {
    return formatHelp(value);
  }

  if (type === 'Error') {
    return formatError(value)
  }

  return formatSimpleType(value);
}

function formatSimpleType(output) {
  if (typeof output === 'string') {
    return output;
  }

  return inspect(output);
}

function formatError(error) {
  return inspect(error)
}

function inspect(output) {
  return util.inspect(output, {
    showProxy: false,
    colors: true,
  });
}

function formatCursor(value) {
  if (!value.length) {
    return '';
  }

  return inspect(value);
}

function formatCursorIterationResult(value) {
  if (!value.length) {
    return 'no cursor';
  }

  return inspect(value);
}

function formatHelp(value) {
  // This is the spacing between arguments and description in mongosh --help.
  // Use this length for formatting consistency.
  const argLen = 47;
  let helpMenu = '';

  if (value.help) {
    helpMenu += `\n  ${clr(`${value.help}:`, ['yellow', 'bold'])}\n\n`
  }
  value.attr.forEach((method) => {
    if (method.name && method.description) {
      let formatted = `    ${method.name}`;
      const extraSpaces = 47 - formatted.length;
      formatted += `${' '.repeat(extraSpaces)}${method.description}`;
      helpMenu += `${formatted}\n`;
    }
  })

  if (value.docs) {
    helpMenu += `\n  ${clr(i18n.__('cli-repl.args.moreInformation'), 'bold')} ${clr(value.docs, ['green', 'bold'])}`
  }

  return helpMenu;
}
