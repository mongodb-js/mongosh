import path from 'path';
import Bundler from 'parcel-bundler';
import writeAnalyticsConfig from './analytics';

/**
 * Generate the bundled up JS input that will be compiled
 * into the executable.
 *
 * @param {string} input - The input file to the cli.
 * @param {string} execInput - The input file that the exec will compile from.
 * @param {string} analyticsConfigFilePath - The path to the analytics config file.
 * @param {string} segmentKey - The segment API key.
 */
async function generateInput(input: string, execInput: string, analyticsConfigFilePath: string, segmentKey: string): Promise<void> {
  // This takes the segment api key and writes it to the
  // cli-repl's analytics-config file.
  await writeAnalyticsConfig(analyticsConfigFilePath, segmentKey);

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
    sourceMaps: false,
    logLevel: 3,
    watch: false
  });

  // Sigh! Parcel does not understand that you can't just use an ES6 module file
  // as the result of a 'require()' call, and always uses the 'module' key
  // of 'package.json' instead of the 'main' key. This works fine for most of
  // our direct code, because TypeScript handles the discrepancy for us,
  // but it's causing trouble for nested dependencies like is-recoverable-error.
  // On the other hand, it also cannot deal with '.cjs' files and would place them
  // in a separate "bundle" which won't work, e.g. for yargs-parser. So we need to
  // make sure that we take the '.js' exported main or module.
  const originalGPE = (bundler as any).resolver.getPackageEntries;
  (bundler as any).resolver.getPackageEntries = function(packageJsonContent: any): any {
    const mainField = packageJsonContent.main;
    const moduleField = packageJsonContent.module;
    if (mainField?.endsWith('.cjs')) {
      if (!moduleField || !moduleField.endsWith('.js')) {
        console.warn('mongosh: bundling detected potential issue - ' + packageJsonContent.name + ' only has a .cjs main file...');
      } else {
        packageJsonContent.main = moduleField;
      }
    }
    delete packageJsonContent.module;
    const result = originalGPE.call(this, packageJsonContent);
    packageJsonContent.main = mainField;
    packageJsonContent.module = moduleField;
    return result;
  };

  await bundler.bundle();
}

export default generateInput;
