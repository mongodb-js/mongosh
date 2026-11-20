import semver from 'semver';
import type { Config } from './config';
import { isReleasableBranch } from '../git/repository-status';

/**
 * Checks if current build needs to be released to github and the download
 * center.
 * Returns true if the current branch is a branch releases are cut from (main,
 * a version branch like v2.x, or a release branch), there is a commit tag, and
 * if current version matches current revision's tag.
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

  if (!isReleasableBranch(config.branch)) {
    console.info(
      'mongosh: skip public release: branch',
      config.branch,
      'is not a branch releases are cut from'
    );
    return false;
  }

  if (semver.neq(config.triggeringGitTag, config.version) && !config.isDryRun) {
    console.info(
      'mongosh: skip public release: the commit tag',
      config.triggeringGitTag,
      'is different from the release version',
      config.version
    );

    return false;
  }

  return true;
}
