import { Config } from './config';

export function redactConfig(config: Config): Partial<Config> {
  return {
    version: config.version,
    appleNotarizationBundleId: config.appleNotarizationBundleId,
    rootDir: config.rootDir,
    bundleEntrypointInput: config.bundleEntrypointInput,
    distributionBuildVariant: config.distributionBuildVariant,
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
    mongocryptdPath: config.mongocryptdPath,
    artifactUrlFile: config.artifactUrlFile
  };
}
