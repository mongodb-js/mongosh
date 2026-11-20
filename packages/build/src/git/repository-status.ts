import { spawnSync as spawnSyncFn } from '../helpers';
import type { ReleaseVersion } from './tags';

export interface RepositoryStatus {
  branch?: {
    local: string;
    tracking: string | undefined;
    diverged: boolean;
  };
  clean: boolean;
  hasUnpushedTags: boolean;
}

const MAIN_OR_MASTER_BRANCH = /^(main|master)$/;
const VERSION_BRANCH = /^v([0-9]+)\.x$/;
const RELEASE_BRANCH = /^release\/v([a-z0-9]+\.[a-z0-9]+\.[a-z0-9]+)$/;

/**
 * Branches releases can be cut from: the branch that always holds the newest
 * release line (main/master), a version branch for a maintenance release line
 * (e.g. v2.x) or a release branch for a specific version
 * (e.g. release/v2.14.x).
 */
export function isReleasableBranch(branchName: string | undefined): boolean {
  return (
    !!branchName &&
    (MAIN_OR_MASTER_BRANCH.test(branchName) ||
      VERSION_BRANCH.test(branchName) ||
      RELEASE_BRANCH.test(branchName))
  );
}

/**
 * The version newer tags must belong to, used to look up the latest tag on the
 * branch being released. main/master always carry the newest release line, so
 * they are unrestricted; maintenance and release branches are limited to their
 * own version so that e.g. releasing from v2.x never picks up a newer line's
 * tag.
 */
export function getReleaseVersionRestrictionFromBranch(
  branchName: string | undefined
): ReleaseVersion | undefined {
  const versionBranch = branchName?.match(VERSION_BRANCH);
  if (versionBranch) {
    return { major: parseInt(versionBranch[1], 10) };
  }
  return getReleaseVersionFromBranch(branchName);
}

export function verifyGitStatus(
  repositoryRoot: string,
  getRepositoryStatusFn: typeof getRepositoryStatus = getRepositoryStatus,
  spawnSync: typeof spawnSyncFn = spawnSyncFn
): RepositoryStatus {
  spawnSync('git', ['fetch', '--tags'], {
    cwd: repositoryRoot,
    encoding: 'utf-8',
  });

  const repositoryStatus = getRepositoryStatusFn(repositoryRoot);
  if (!repositoryStatus.branch?.local) {
    throw new Error(
      'Could not determine local repository information - please verify your repository is intact.'
    );
  }
  if (!isReleasableBranch(repositoryStatus.branch.local)) {
    throw new Error(
      'The current branch does not match: master|main|vX.x|release/vX.X.X'
    );
  }
  if (!repositoryStatus.branch.tracking) {
    throw new Error('The branch you are on is not tracking any remote branch.');
  }
  if (repositoryStatus.branch?.diverged || !repositoryStatus.clean) {
    throw new Error(
      'Your local repository is not clean or diverged from the remote branch. Commit any uncommited changes and ensure your branch is up to date.'
    );
  }
  if (repositoryStatus.hasUnpushedTags) {
    throw new Error(
      'You have local tags that are not pushed to the remote. Remove or push those tags to continue.'
    );
  }
  return repositoryStatus;
}

export function getRepositoryStatus(
  repositoryRoot: string,
  spawnSync: typeof spawnSyncFn = spawnSyncFn
): RepositoryStatus {
  const gitStatus = spawnSync('git', ['status', '-b', '--porcelain'], {
    cwd: repositoryRoot,
    encoding: 'utf-8',
  });
  const tagStatus = spawnSync('git', ['push', '--tags', '--dry-run'], {
    cwd: repositoryRoot,
    encoding: 'utf-8',
  });

  const result: RepositoryStatus = {
    clean: true,
    hasUnpushedTags:
      `${tagStatus.stdout?.trim() ?? ''}${tagStatus.stderr?.trim() ?? ''}` !==
      'Everything up-to-date',
  };

  const output = gitStatus.stdout
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => !!l);

  const branchOutput = output.find((l) => /^## /.exec(l));
  const branchInfo = branchOutput?.match(
    /^## ([^\s]+?((?=\.\.\.)|$))(\.\.\.([^\s]+)( \[[^\]]+])?)?/
  );

  if (branchInfo) {
    result.branch = {
      local: branchInfo[1],
      tracking: branchInfo[4],
      diverged: !!branchInfo[5],
    };
  }

  const fileInfo = output.filter((l) => !/^## /.exec(l));
  result.clean = fileInfo.length === 0;

  return result;
}

export function getReleaseVersionFromBranch(branchName: string | undefined):
  | {
      major: number | undefined;
      minor: number | undefined;
      patch: number | undefined;
    }
  | undefined {
  const match = branchName?.match(RELEASE_BRANCH);
  if (!match) {
    return undefined;
  }

  const versionParts = match[1].split('.');
  const numOrUndefiend = (num: string): number | undefined => {
    const value = parseInt(num, 10);
    return isNaN(value) ? undefined : value;
  };

  return {
    major: numOrUndefiend(versionParts[0]),
    minor: numOrUndefiend(versionParts[1]),
    patch: numOrUndefiend(versionParts[2]),
  };
}
