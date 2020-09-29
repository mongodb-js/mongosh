import path from 'path';
import Bundler from 'parcel-bundler';
import writeAnalyticsConfig from './analytics';

/**
 * Generate the bundled up JS input that will be compiled
 * into the executable.
 *
 * @param {string} input - The input file to the cli.
 * @param {string} execInput - The input file that the exec will compile from.
 * @param {string} analyticsConfig - The path to the analytics config file.
 * @param {string} segmentKey - The segment API key.
 */
const generateInput = async(input: string, execInput: string, analyticsConfig: string, segmentKey: string) => {
  // This takes the segment api key and writes it to the
  // cli-repl's analytics-config file.
  await writeAnalyticsConfig(analyticsConfig, segmentKey);

  console.info('mongosh: creating bundle:', execInput);

  // Parcel is the saviour here since it was the only bundling
  // tool that could figure out how to handle everything in a
  // complex lerna project with cyclic dependencies everywhere.
  const bundler = new Bundler(input, {
    outDir: path.dirname(execInput),
    outFile: path.basename(execInput),
    contentHash: false,
    target: 'node',
    bundleNodeModules: true,
    minified: true,
    sourceMaps: false,
    logLevel: 3
  });
  await bundler.bundle();
};

export default generateInput;
