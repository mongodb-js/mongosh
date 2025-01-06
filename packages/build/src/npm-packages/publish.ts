import path from 'path';
import {
  EXCLUDE_RELEASE_PACKAGES,
  LERNA_BIN,
  MONGOSH_RELEASE_PACKAGES,
  PROJECT_ROOT,
} from './constants';
import type { LernaPackageDescription } from './list';
import { listNpmPackages as listNpmPackagesFn } from './list';
import { spawnSync as spawnSyncFn } from '../helpers/spawn-sync';
import type { SpawnSyncOptionsWithStringEncoding } from 'child_process';

export function publishNpmPackages(
  isDryRun = false,
  useAuxiliaryPackagesOnly = false,
  listNpmPackages: typeof listNpmPackagesFn = listNpmPackagesFn,
  markBumpedFilesAsAssumeUnchangedFn: typeof markBumpedFilesAsAssumeUnchanged = markBumpedFilesAsAssumeUnchanged,
  spawnSync: typeof spawnSyncFn = spawnSyncFn
): void {
  const commandOptions: SpawnSyncOptionsWithStringEncoding = {
    stdio: 'inherit',
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...(isDryRun ? { npm_config_dry_run: 'true' } : {}),
    },
  };
  let packages = listNpmPackages().filter(
    (packageConfig) => !EXCLUDE_RELEASE_PACKAGES.includes(packageConfig.name)
  );

  if (useAuxiliaryPackagesOnly) {
    packages = packages.filter(
      (packageConfig) => !MONGOSH_RELEASE_PACKAGES.includes(packageConfig.name)
    );
  }
  // Lerna requires a clean repository for a publish from-package (--force-publish does not have any effect here)
  // we use git update-index --assume-unchanged on files we know have been bumped
  markBumpedFilesAsAssumeUnchangedFn(packages, true);
  try {
    spawnSync(
      LERNA_BIN,
      [
        'publish',
        'from-package',
        '--no-private',
        '--no-changelog',
        '--exact',
        // During mongosh releases we handle the tags manually
        ...(!useAuxiliaryPackagesOnly
          ? ['--no-git-tag-version', '--no-push']
          : []),
        '--force-publish',
        '--yes',
        '--no-verify-access',
      ],
      commandOptions
    );
  } finally {
    markBumpedFilesAsAssumeUnchangedFn(packages, false);
  }

  if (!useAuxiliaryPackagesOnly) {
    const mongoshVersion = packages.find(
      (packageConfig) => packageConfig.name === 'mongosh'
    )?.version;

    if (!mongoshVersion) {
      throw new Error('Mongosh package not found');
    }

    spawnSync(
      'git',
      ['tag', '-a', mongoshVersion, '-m', mongoshVersion],
      commandOptions
    );

    spawnSync('git', ['push', '--follow-tags'], commandOptions);
  }
}

export function markBumpedFilesAsAssumeUnchanged(
  packages: LernaPackageDescription[],
  assumeUnchanged: boolean,
  spawnSync: typeof spawnSyncFn = spawnSyncFn
): void {
  const filesToAssume = [
    path.resolve(PROJECT_ROOT, 'lerna.json'),
    path.resolve(PROJECT_ROOT, 'package.json'),
    path.resolve(PROJECT_ROOT, 'package-lock.json'),
  ];
  for (const { location } of packages) {
    filesToAssume.push(path.resolve(location, 'package.json'));
  }

  for (const f of filesToAssume) {
    spawnSync(
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
  }
}
