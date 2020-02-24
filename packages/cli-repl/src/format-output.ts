import util from 'util';

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
  console.log(value)
  return value.help; // TODO: Irina this one needs some magic.
}
