import { spawnSync as spawnSyncFn } from '../helpers';


export interface RepositoryStatus {
    branch?: {
        local: string;
        tracking: string | undefined;
        diverged: boolean;
    },
    clean: boolean,
    hasUnpushedTags: boolean
}

export function verifyGitStatus(
  repositoryRoot: string,
  getRepositoryStatusFn: typeof getRepositoryStatus = getRepositoryStatus
): void {
  const repositoryStatus = getRepositoryStatusFn(repositoryRoot);
  if (!repositoryStatus.branch?.local) {
    throw new Error('Could not determine local repository information - please verify your repository is intact.');
  }
  if (!/^(master|main|v[a-z0-9]+\.[a-z0-9]+\.[a-z0-9]+)$/.test(repositoryStatus.branch.local)) {
    throw new Error('The current branch does not match: master|main|vX.X.X');
  }
  if (!repositoryStatus.branch.tracking) {
    throw new Error('The branch you are on is not tracking any remote branch.');
  }
  if (repositoryStatus.branch?.diverged || !repositoryStatus.clean) {
    throw new Error('Your local repository is not clean or diverged from the remote branch. Commit any uncommited changes and ensure your branch is up to date.');
  }
  if (repositoryStatus.hasUnpushedTags) {
    throw new Error('You have local tags that are not pushed to the remote. Remove or push those tags to continue.');
  }
}

export function getRepositoryStatus(
  repositoryRoot: string,
  spawnSync: typeof spawnSyncFn = spawnSyncFn
): RepositoryStatus {
  const gitStatus = spawnSync('git', ['status', '-b', '--porcelain'], {
    cwd: repositoryRoot,
    encoding: 'utf-8'
  });
  const tagStatus = spawnSync('git', ['push', '--tags', '--dry-run'], {
    cwd: repositoryRoot,
    encoding: 'utf-8'
  });

  const result: RepositoryStatus = {
    clean: true,
    hasUnpushedTags: tagStatus.stdout.trim() !== 'Everything up-to-date'
  };

  const output = gitStatus.stdout
    .split('\n')
    .map(l => l.trim())
    .filter(l => !!l);

  const branchOutput = output.find(l => l.match(/^## /));
  const branchInfo = branchOutput?.match(/^## ([^\s.]+)(\.\.\.([^\s]+)( \[[^\]]+])?)?/);

  if (branchInfo) {
    result.branch = {
      local: branchInfo[1],
      tracking: branchInfo[3],
      diverged: !!branchInfo[4]
    };
  }

  const fileInfo = output.filter(l => !l.match(/^## /));
  result.clean = fileInfo.length === 0;

  return result;
}

