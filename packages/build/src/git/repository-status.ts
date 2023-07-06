import { spawnSync as spawnSyncFn } from '../helpers';

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
const RELEASE_BRANCH = /^release\/v([a-z0-9]+\.[a-z0-9]+\.[a-z0-9]+)$/;

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
  if (
    !MAIN_OR_MASTER_BRANCH.test(repositoryStatus.branch.local) &&
    !RELEASE_BRANCH.test(repositoryStatus.branch.local)
  ) {
    throw new Error(
      'The current branch does not match: master|main|release/vX.X.X'
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
