import { Config } from './config';

export function redactConfig(config: Config): Partial<Config> {
  return {
    version: config.version,
    appleNotarizationBundleId: config.appleNotarizationBundleId,
    rootDir: config.rootDir,
    input: config.input,
    buildVariant: config.buildVariant,
    executablePath: config.executablePath,
    execInput: config.execInput,
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
