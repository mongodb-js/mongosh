import type { PackageInformation } from '../tarball';
import { BuildVariant } from './build-variant';

/**
 * Defines the configuration interface for the build system.
 */
export interface Config {
  version: string;
  appleNotarizationBundleId?: string;
  input: string;
  execInput: string;
  executablePath: string;
  outputDir: string;
  analyticsConfigFilePath?: string;
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
  isCi?: boolean;
  platform?: string;
  execNodeVersion: string;
  buildVariant: BuildVariant;
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
