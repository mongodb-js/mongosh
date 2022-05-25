import type { PackageInformation } from '../packaging/package';
import { BuildVariant } from './build-variant';

interface ManPageConfig {
  sourceUrl: string;
  downloadPath: string;
  fileName: string;
}

/**
 * Defines the configuration interface for the build system.
 */
export interface Config {
  version: string;
  bundleEntrypointInput: string;
  bundleSinglefileOutput: string;
  executablePath: string;
  outputDir: string;
  buildInfoFilePath?: string;
  executableOsId?: string;
  rootDir: string;
  project?: string;
  revision?: string;
  branch?: string;
  evgAwsKey?: string;
  evgAwsSecret?: string;
  downloadCenterAwsKey?: string;
  downloadCenterAwsSecret?: string;
  githubToken?: string;
  segmentKey?: string;
  notarySigningKeyName?: string;
  notaryAuthToken?: string;
  isCi?: boolean;
  platform?: string;
  execNodeVersion: string;
  distributionBuildVariant?: BuildVariant;
  repo: {
    owner: string;
    repo: string;
  };
  isPatch?: boolean;
  triggeringGitTag?: string;
  csfleLibraryPath: string;
  packageInformation?: PackageInformation;
  artifactUrlFile?: string;
  manpage?: ManPageConfig;
  isDryRun?: boolean;
}
