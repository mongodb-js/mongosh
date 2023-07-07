import path from 'path';
import pkgUp from 'pkg-up';
import { writeBuildInfo } from '../build-info';
import type { Config } from '../config';
import { spawnSync } from '../helpers';

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
  // This could be an npm script that runs before the compile step if it
  // weren't for the build info file which is being written above.
  spawnSync('npm', ['run', 'webpack-build'], {
    cwd: path.dirname(
      (await pkgUp({ cwd: config.bundleSinglefileOutput })) as string
    ),
    encoding: 'utf8',
  });
}
