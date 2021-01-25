import type { PackageInformation } from './tarball';
import semver from 'semver';

/**
 * Defines the configuration interface for the build system.
 */
export default interface Config {
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
  buildVariant?: string;
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

/**
 * Checks if current build needs to be released to github and the downloads
 * centre.
 * Returns true if current branch is master, there is a commit tag, and if
 * current version matches current revision's tag.
 */
export function shouldDoPublicRelease(config: Config): boolean {
  if (config.isPatch) {
    console.info('mongosh: skip public release: is a patch');
    return false;
  }
  if (!config.triggeringGitTag) {
    console.info('mongosh: skip public release: not triggered by a Git tag');
    return false;
  }

  if (config.branch !== 'master') {
    console.info('mongosh: skip public release: is not master');
    return false;
  }

  if (semver.neq(config.triggeringGitTag, config.version)) {
    console.info(
      'mongosh: skip public release: the commit tag', config.triggeringGitTag,
      'is different from the release version', config.version
    );

    return false;
  }

  return true;
}
