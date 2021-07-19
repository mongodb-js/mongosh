import os from 'os';

export type BuildInfo = {
  version: string;
  distributionKind: 'unpackaged' | 'packaged' | 'compiled';
  buildArch: string;
  buildPlatform: string;
  buildTarget: string;
  buildTime: string | null;
  gitVersion: string | null;
};

export function buildInfo(): BuildInfo {
  try {
    const buildInfo = { ...require('./build-info.json') };
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
      gitVersion: null
    };
  }
}
