import os from 'os';
import { CliServiceProvider } from '@mongosh/service-provider-server';

export interface BuildInfo {
  version: string;
  nodeVersion: string;
  distributionKind: 'unpackaged' | 'packaged' | 'compiled';
  runtimeArch: typeof process['arch'];
  runtimePlatform: typeof process['platform'];
  buildArch: typeof process['arch'];
  buildPlatform: typeof process['platform'];
  buildTarget: string;
  buildTime: string | null;
  gitVersion: string | null;
  opensslVersion: string;
  sharedOpenssl: boolean;
  segmentApiKey?: string;
  deps: ReturnType<typeof CliServiceProvider.getVersionInformation>;
}

function getSystemArch(): typeof process['arch'] {
  return process.platform === 'darwin'
    ? os.cpus().some((cpu) => {
      // process.arch / os.arch() will return the arch for which the node
      // binary was compiled. Checking if one of the CPUs has Apple in its
      // name is the way to check (there is slight difference between the
      // earliest models naming and a current one, so we check only for
      // Apple in the name)
      return /Apple/.test(cpu.model);
    })
      ? 'arm64'
      : 'x64'
    : process.arch;
}

/**
 * Return an object with information about this mongosh instance,
 * in particular, when it was built and how.
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function buildInfo({
  withSegmentApiKey,
}: {
  withSegmentApiKey?: boolean,
} = {}): Promise<BuildInfo> {
  const dependencyVersionInfo: BuildInfo['deps'] = {
    ...CliServiceProvider.getVersionInformation()
  };

  const runtimeData = {
    nodeVersion: process.version,
    opensslVersion: process.versions.openssl,
    sharedOpenssl: !!process.config.variables.node_shared_openssl,
    // Runtime arch can differ e.g. because x64 binaries can run
    // on M1 cpus
    runtimeArch: getSystemArch(),
    // Runtime platform can differ e.g. because homebrew on macOS uses
    // npm packages published from Linux
    runtimePlatform: process.platform,
    deps: { ...dependencyVersionInfo }
  };

  try {
    const buildInfo = { ...require('./build-info.json'), ...runtimeData };
    if (!withSegmentApiKey) {
      delete buildInfo.segmentApiKey;
    }
    return buildInfo;
  } catch {
    const { version } = require('../package.json');
    return {
      version,
      distributionKind: 'unpackaged',
      buildArch: process.arch,
      buildPlatform: process.platform,
      buildTarget: 'unknown',
      buildTime: null,
      gitVersion: null,
      ...runtimeData
    };
  }
}
