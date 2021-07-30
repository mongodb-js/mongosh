import { promises as fs } from 'fs';
import path from 'path';
import Bundler from 'parcel-bundler';
import { writeBuildInfo } from '../build-info';
import type { Config } from '../config';

/**
 * Generate the bundled up JS entryFile that will be compiled
 * into the executable.
 *
 * @param {object} config - The current build config.
 */
export async function generateBundle(config: Config): Promise<void> {
  // This takes the segment api key and writes it to the
  // cli-repl's analytics-config file, as well as information about the
  // current build environment.
  await writeBuildInfo(config, 'compiled');

  console.info('mongosh: creating bundle:', config.bundleSinglefileOutput);

  // Parcel is the saviour here since it was the only bundling
  // tool that could figure out how to handle everything in a
  // complex lerna project with cyclic dependencies everywhere.
  const bundler = new Bundler(config.bundleEntrypointInput, {
    outDir: path.dirname(config.bundleSinglefileOutput),
    outFile: path.basename(config.bundleSinglefileOutput),
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

  // Parcel also unfortunately does not know about the built-in 'v8' module
  // of Node.js. We create a dummy version that points to it.
  await fs.mkdir(path.join(__dirname, '../../../../node_modules/v8'), { recursive: true });
  await fs.writeFile(path.join(__dirname, '../../../../node_modules/v8/index.js'),
    'module.exports = require("module").createRequire(__filename)("v8")');

  await bundler.bundle();
}
