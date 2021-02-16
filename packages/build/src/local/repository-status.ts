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
