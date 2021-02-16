import { LERNA_BIN, PLACEHOLDER_VERSION, PROJECT_ROOT } from './constants';
import { spawnSync } from './spawn-sync';

export function bumpNpmPackages(
  version: string,
  spawnSyncFn: typeof spawnSync = spawnSync
): void {
  if (!version || version === PLACEHOLDER_VERSION) {
    console.info('mongosh: Not bumping package version, keeping at placeholder');
    return;
  }

  console.info(`mongosh: Bumping package versions to ${version}`);
  spawnSyncFn(LERNA_BIN, [
    'version',
    version,
    '--no-changelog',
    '--no-push',
    '--exact',
    '--no-git-tag-version',
    '--force-publish',
    '--yes'
  ], {
    stdio: 'inherit',
    cwd: PROJECT_ROOT,
    encoding: 'utf8'
  });
  spawnSyncFn('git', ['status', '--porcelain'], {
    stdio: 'inherit',
    cwd: PROJECT_ROOT,
    encoding: 'utf8'
  });
}
