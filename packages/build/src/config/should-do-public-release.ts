import semver from 'semver';
import { Config } from './config';

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

  if (config.branch !== 'main') {
    console.info('mongosh: skip public release: is not main');
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
