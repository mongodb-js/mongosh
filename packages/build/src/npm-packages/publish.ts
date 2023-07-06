import path from 'path';
import { LERNA_BIN, PLACEHOLDER_VERSION, PROJECT_ROOT } from './constants';
import type { LernaPackageDescription } from './list';
import { listNpmPackages as listNpmPackagesFn } from './list';
import { spawnSync } from '../helpers/spawn-sync';

export function publishNpmPackages(
  isDryRun: boolean,
  listNpmPackages: typeof listNpmPackagesFn = listNpmPackagesFn,
  markBumpedFilesAsAssumeUnchangedFn: typeof markBumpedFilesAsAssumeUnchanged = markBumpedFilesAsAssumeUnchanged,
  spawnSyncFn: typeof spawnSync = spawnSync
): void {
  const packages = listNpmPackages();

  const versions = Array.from(new Set(packages.map(({ version }) => version)));

  if (versions.length !== 1) {
    throw new Error(
      `Refusing to publish packages with multiple versions: ${versions}`
    );
  }

  if (versions[0] === PLACEHOLDER_VERSION) {
    throw new Error('Refusing to publish packages with placeholder version');
  }

  // Lerna requires a clean repository for a publish from-package (--force-publish does not have any effect here)
  // we use git update-index --assume-unchanged on files we know have been bumped
  markBumpedFilesAsAssumeUnchangedFn(packages, true);
  try {
    spawnSyncFn(
      LERNA_BIN,
      [
        'publish',
        'from-package',
        '--no-changelog',
        '--no-push',
        '--exact',
        '--no-git-tag-version',
        '--force-publish',
        '--yes',
        '--no-verify-access',
      ],
      {
        stdio: 'inherit',
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        env: {
          ...process.env,
          ...(isDryRun ? { npm_config_dry_run: 'true' } : {}),
        },
      }
    );
  } finally {
    markBumpedFilesAsAssumeUnchangedFn(packages, false);
  }
}

export function markBumpedFilesAsAssumeUnchanged(
  packages: LernaPackageDescription[],
  assumeUnchanged: boolean,
  spawnSyncFn: typeof spawnSync = spawnSync
): void {
  const filesToAssume = [path.resolve(PROJECT_ROOT, 'lerna.json')];
  packages.forEach(({ location }) => {
    filesToAssume.push(path.resolve(location, 'package.json'));
    filesToAssume.push(path.resolve(location, 'package-lock.json'));
  });

  filesToAssume.forEach((f) => {
    spawnSyncFn(
      'git',
      [
        'update-index',
        assumeUnchanged ? '--assume-unchanged' : '--no-assume-unchanged',
        f,
      ],
      {
        stdio: 'inherit',
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
      },
      true
    );
    console.info(
      `File ${f} is now ${assumeUnchanged ? '' : 'NOT '}assumed to be unchanged`
    );
  });
}
