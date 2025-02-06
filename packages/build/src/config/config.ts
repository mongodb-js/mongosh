import { Schema } from 'ajv';
import type { PackageInformationProvider } from '../packaging/package';
import type { PackageVariant } from './build-variant';

interface ManPageConfig {
  sourceUrl: string;
  downloadPath: string;
  fileName: string;
}

// TODO: this is duplicated in update-notification-manager.ts
export interface GreetingCTADetails {
  chunks: {
    text: string;
    style?: string; // TODO: this is actually clr.ts/StyleDefinition
  }[];
}

export type CTAConfig = {
  [version: string | '*']: GreetingCTADetails;
};

/**
 * Defines the configuration interface for the build system.
 */
export interface Config {
  version: string;
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
  injectedJsonFeedFile?: string;
  githubToken?: string;
  segmentKey?: string;
  notarySigningKeyName?: string;
  notaryAuthToken?: string;
  isCi?: boolean;
  platform?: string;
  execNodeVersion: string;
  packageVariant?: PackageVariant;
  repo: {
    owner: string;
    repo: string;
  };
  isPatch?: boolean;
  triggeringGitTag?: string;
  packageInformation?: PackageInformationProvider;
  cryptSharedLibPath: string;
  artifactUrlFile?: string;
  artifactUrlExtraTag?: string;
  manpage?: ManPageConfig;
  isDryRun?: boolean;
  useAuxiliaryPackagesOnly?: boolean;
  ctaConfig: CTAConfig;
  ctaConfigSchema: Schema;
}
