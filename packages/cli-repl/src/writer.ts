import util from 'util';

/**
 * Return the pretty string for the output.
 *
 * @param {any} output - The output.
 *
 * @returns {string} The output.
 */
function write(output: any): string {
  if (output && output.toReplString) {
    return output.toReplString();
  }
  if (typeof output === 'string') {
    return output;
  }
  return util.inspect(output, {
    showProxy: false,
    colors: true,
  });
}

export default write;
