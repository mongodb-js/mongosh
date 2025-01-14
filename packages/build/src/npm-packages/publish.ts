import {
  EXCLUDE_RELEASE_PACKAGES,
  LERNA_BIN,
  MONGOSH_RELEASE_PACKAGES,
  PROJECT_ROOT,
} from './constants';
import { spawnSync as spawnSyncFn } from '../helpers/spawn-sync';
import { type SpawnSyncOptionsWithStringEncoding } from 'child_process';
import type { PackageInfo } from '@mongodb-js/monorepo-tools';
import { getPackagesInTopologicalOrder as getPackagesInTopologicalOrderFn } from '@mongodb-js/monorepo-tools';
import {
  getPackageConfigurations,
  markBumpedFilesAsAssumeUnchanged,
} from './helpers';
import { promises as fs } from 'fs';

export async function publishToNpm(
  { isDryRun = false, useAuxiliaryPackagesOnly = false },
  getPackagesInTopologicalOrder: typeof getPackagesInTopologicalOrderFn = getPackagesInTopologicalOrderFn,
  markBumpedFilesAsAssumeUnchangedFn: typeof markBumpedFilesAsAssumeUnchanged = markBumpedFilesAsAssumeUnchanged,
  spawnSync: typeof spawnSyncFn = spawnSyncFn
): Promise<void> {
  const publisher = process.env.MONGOSH_RELEASE_PUBLISHER;
  if (!useAuxiliaryPackagesOnly) {
    if (!publisher) {
      throw new Error(
        'MONGOSH_RELEASE_PUBLISHER is required for publishing mongosh'
      );
    }
  }

  const commandOptions: SpawnSyncOptionsWithStringEncoding = {
    stdio: 'inherit',
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...(isDryRun ? { npm_config_dry_run: 'true' } : {}),
    },
  };

  let packages = (await getPackagesInTopologicalOrder(PROJECT_ROOT)).filter(
    (packageConfig) => !EXCLUDE_RELEASE_PACKAGES.includes(packageConfig.name)
  );

  if (useAuxiliaryPackagesOnly) {
    packages = packages.filter(
      (packageConfig) => !MONGOSH_RELEASE_PACKAGES.includes(packageConfig.name)
    );
  }
  if (publisher) {
    await setReleasePublisher(publisher, packages);
  }
  // Lerna requires a clean repository for a publish from-package
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
      throw new Error('mongosh package not found');
    }

    spawnSync(
      'git',
      ['tag', '-a', `v${mongoshVersion}`, '-m', `v${mongoshVersion}`],
      commandOptions
    );

    spawnSync('git', ['push', '--follow-tags'], commandOptions);
  }
}

export async function setReleasePublisher(
  publisher: string,
  packages: PackageInfo[]
): Promise<void> {
  const packageConfigurations = await getPackageConfigurations(packages);

  for (const [packageJsonPath, packageJson] of packageConfigurations) {
    packageJson.releasePublisher = publisher;

    await fs.writeFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2) + '\n'
    );
  }
}
