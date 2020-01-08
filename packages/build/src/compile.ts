import { compile as compileExecutable, NexeOptions } from 'nexe';

/**
 * Compile a distribution via Nexe for the provided
 * configuration object.
 *
 * @param {NexeOptions} config - The configuration.
 */
const compile = (config: NexeOptions) => {
  return compileExecutable({
    input: config.input,
    name: config.name,
    output: config.output
  });
};

export default compile;
