import util from 'util';

/**
 * Return the pretty string for the output.
 *
 * @param {any} value - The output value.
 * @param {string} type - The shell api type if known or undefined.
 *
 * @returns {string} The output.
 */
export default function formatOutput(output: any, type?: string): string {
  if (type === 'Cursor') {
    return formatCursor(output);
  }

  if (type === 'CursorIterationResult') {
    return formatCursorIterationResult(output);
  }

  if (type === 'Help') {
    return formatHelp(output);
  }

  return formatSimpleType(output);
}

function formatSimpleType(output) {
  if (typeof output === 'string') {
    return output;
  }

  return inspect(output);
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
  return value.help; // TODO: Irina this one needs some magic.
}
