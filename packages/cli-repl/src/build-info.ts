import os from 'os';

export type BuildInfo = {
  version: string;
  nodeVersion: string;
  distributionKind: 'unpackaged' | 'packaged' | 'compiled';
  buildArch: string;
  buildPlatform: string;
  buildTarget: string;
  buildTime: string | null;
  gitVersion: string | null;
};

/**
 * Return an object with information about this mongosh instance,
 * in particular, when it was built and how.
 */
export function buildInfo(): BuildInfo {
  try {
    const buildInfo = { ...require('./build-info.json'), nodeVersion: process.version };
    delete buildInfo.segmentApiKey;
    return buildInfo;
  } catch {
    const { version } = require('../package.json');
    return {
      version,
      distributionKind: 'unpackaged',
      buildArch: os.arch(),
      buildPlatform: os.platform(),
      buildTarget: 'unknown',
      buildTime: null,
      gitVersion: null,
      nodeVersion: process.version
    };
  }
}
