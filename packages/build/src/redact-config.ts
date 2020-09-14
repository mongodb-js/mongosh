import Config from './config';

export function redactConfig(config: Config): any {
  return {
    version: config.version,
    bundleId: config.bundleId,
    rootDir: config.rootDir,
    input: config.input,
    buildVariant: config.buildVariant,
    execInput: config.execInput,
    outputDir: config.outputDir,
    project: config.project,
    revision: config.revision,
    branch: config.branch,
    isCi: config.isCi,
    platform: config.platform,
    repo: config.repo
  };
}
