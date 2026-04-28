import type { Schema } from 'ajv';
import type { PackageInformationProvider } from '../packaging/package';
import type { PackageVariant } from './build-variant';

interface ManPageConfig {
  sourceUrl: string;
  downloadPath: string;
  fileName: string;
}

// This needs to match the interface in cli-repl/update-notification-manager.ts
export interface GreetingCTADetails {
  // Optional filter on buildInfo() fields. When set, the CTA is only shown to
  // shells whose buildInfo matches every key (string = exact, array = any-of,
  // boolean for boolean fields). When omitted, the CTA targets the version key
  // alone (current behavior).
  match?: { [field: string]: string | string[] | boolean };
  chunks: {
    text: string;
    // This is actually cli-repl/clr.ts/StyleDefinition, but we can't import it here.
    // The correct type is already enforced in json schema, so treating it as a generic
    // string is fine.
    style?: string;
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
  downloadCenterAwsKeyConfig?: string;
  downloadCenterAwsSecretConfig?: string;
  downloadCenterAwsKeyArtifacts?: string;
  downloadCenterAwsSecretArtifacts?: string;
  downloadCenterAwsSessionTokenArtifacts?: string;
  injectedJsonFeedFile?: string;
  githubToken?: string;
  segmentKey?: string;
  isCi?: boolean;
  platform?: NodeJS.Platform;
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
