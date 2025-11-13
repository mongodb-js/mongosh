import os from 'os';
import { NodeDriverServiceProvider } from '@mongosh/service-provider-node-driver';
import { promises as fs } from 'fs';

interface BuildInfo {
  version: string;
  nodeVersion: string;
  distributionKind: 'unpackaged' | 'packaged' | 'compiled';
  installationMethod: 'npx' | 'homebrew' | 'linux-system-wide' | 'other';
  runtimeArch: (typeof process)['arch'];
  runtimePlatform: (typeof process)['platform'];
  buildArch: (typeof process)['arch'];
  buildPlatform: (typeof process)['platform'];
  buildTarget: string;
  buildTime: string | null;
  gitVersion: string | null;
  opensslVersion: string;
  sharedOpenssl: boolean;
  segmentApiKey?: string;
  runtimeGlibcVersion: string;
  deps: ReturnType<typeof NodeDriverServiceProvider.getVersionInformation>;
}

function getSystemArch(): (typeof process)['arch'] {
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

async function getInstallationMethod(
  info: Pick<BuildInfo, 'distributionKind' | 'buildPlatform'>
): Promise<BuildInfo['installationMethod']> {
  if (info.distributionKind !== 'compiled') {
    if (
      process.env.npm_lifecycle_event === 'npx' &&
      process.env.npm_lifecycle_script?.includes('mongosh')
    )
      return 'npx';
    if (
      __filename.match(/\bhomebrew\b/i) &&
      process.execPath.match(/\bhomebrew\b/i)
    )
      return 'homebrew';
  } else {
    if (
      info.buildPlatform === 'linux' &&
      process.execPath.startsWith('/usr/bin/') &&
      (await fs.stat(process.execPath)).uid === 0
    ) {
      return 'linux-system-wide'; // e.g. deb or rpm
    }
  }
  return 'other';
}

export function baseBuildInfo(): Omit<
  BuildInfo,
  'deps' | 'installationMethod'
> {
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
    runtimeGlibcVersion: getGlibcVersion() ?? 'N/A',
  };

  try {
    return {
      ...require('./build-info.json'),
      ...runtimeData,
    };
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
      ...runtimeData,
    };
  }
}

/**
 * Return an object with information about this mongosh instance,
 * in particular, when it was built and how.
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function buildInfo({
  withSegmentApiKey,
}: {
  withSegmentApiKey?: boolean;
} = {}): Promise<BuildInfo> {
  const dependencyVersionInfo: BuildInfo['deps'] = {
    ...NodeDriverServiceProvider.getVersionInformation(),
  };

  const buildInfo = { ...baseBuildInfo(), deps: { ...dependencyVersionInfo } };
  if (!withSegmentApiKey) {
    delete buildInfo.segmentApiKey;
  }
  return {
    installationMethod: await getInstallationMethod(buildInfo),
    ...buildInfo,
  };
}

let cachedGlibcVersion: string | undefined | null = null;
export function getGlibcVersion(): string | undefined {
  if (process.platform !== 'linux') return undefined;
  if (cachedGlibcVersion !== null) return cachedGlibcVersion;
  try {
    return (cachedGlibcVersion = require('glibc-version')());
  } catch {
    return (cachedGlibcVersion = undefined);
  }
}
