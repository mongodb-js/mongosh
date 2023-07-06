import type { PackageInformation } from '../packaging';
import type { Config } from './config';

export function redactConfig(config: Config): Partial<Config> & {
  packageInformationInstantiated?: PackageInformation;
} {
  return {
    version: config.version,
    rootDir: config.rootDir,
    packageVariant: config.packageVariant,
    executablePath: config.executablePath,
    bundleSinglefileOutput: config.bundleSinglefileOutput,
    outputDir: config.outputDir,
    project: config.project,
    revision: config.revision,
    branch: config.branch,
    isCi: config.isCi,
    platform: config.platform,
    repo: config.repo,
    isPatch: config.isPatch,
    packageInformation: config.packageInformation,
    packageInformationInstantiated:
      config.packageVariant &&
      config.packageInformation?.(config.packageVariant),
    cryptSharedLibPath: config.cryptSharedLibPath,
    artifactUrlFile: config.artifactUrlFile,
    isDryRun: config.isDryRun,
  };
}
