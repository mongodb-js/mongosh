import type { Config } from './config';
import { promises as fs } from 'fs';
import type { BuildInfo } from '../../cli-repl/src/build-info';

/**
 * Write data into a build config that is included in the executable but
 * comes from the build environment rather than the source tree.
 */
export async function writeBuildInfo(
  config: Config,
  distributionKind: 'compiled' | 'packaged'
): Promise<void> {
  if (!config.buildInfoFilePath) {
    throw new Error('Build info file path is required');
  }

  if (!config.segmentKey) {
    throw new Error('Segment key is required');
  }

  const info: Omit<
    BuildInfo,
    | 'deps'
    | 'installationMethod'
    | 'runtimeArch'
    | 'runtimePlatform'
    | 'nodeVersion'
    | 'opensslVersion'
    | 'sharedOpenssl'
    | 'runtimeGlibcVersion'
  > = {
    segmentApiKey: config.segmentKey,
    version: config.version,
    distributionKind,
    buildArch: process.arch,
    buildPlatform: process.platform,
    buildTarget: config.executableOsId ?? 'unknown',
    buildTime: new Date().toISOString(),
    gitVersion: config.revision ?? null,
  };
  console.info('mongosh: writing build info data:', config.buildInfoFilePath);
  await fs.writeFile(config.buildInfoFilePath, JSON.stringify(info));
}
