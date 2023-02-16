export type BuildInfo = {
  version: string;
  nodeVersion: string;
  distributionKind: 'unpackaged' | 'packaged' | 'compiled';
  buildArch: typeof process['arch'];
  buildPlatform: typeof process['platform'];
  buildTarget: string;
  buildTime: string | null;
  gitVersion: string | null;
  opensslVersion: string;
  sharedOpenssl: boolean;
  segmentApiKey?: string;
};

/**
 * Return an object with information about this mongosh instance,
 * in particular, when it was built and how.
 */
export function buildInfo({ withSegmentApiKey }: { withSegmentApiKey?: boolean } = {}): BuildInfo {
  const runtimeData = {
    nodeVersion: process.version,
    opensslVersion: process.versions.openssl,
    sharedOpenssl: !!process.config.variables.node_shared_openssl
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
