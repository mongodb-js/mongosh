import type { PackageInformation } from '../packaging/package';
import { BuildVariant } from './build-variant';

/**
 * Defines the configuration interface for the build system.
 */
export interface Config {
  version: string;
  appleNotarizationBundleId?: string;
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
  appleNotarizationUsername?: string;
  appleNotarizationApplicationPassword?: string;
  appleCodesignIdentity?: string;
  appleCodesignEntitlementsFile?: string;
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
  mongocryptdPath: string;
  packageInformation?: PackageInformation;
  artifactUrlFile?: string;
}
