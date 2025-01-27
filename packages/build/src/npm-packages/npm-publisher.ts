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
import { getPackageConfigurations } from './helpers';
import fs from 'fs/promises';
import path from 'path';

export type NpmPublisherConfig = {
  isDryRun?: boolean;
  publisher?: string;
  useAuxiliaryPackagesOnly?: boolean;
};

export class NpmPublisher {
  getPackagesInTopologicalOrder = getPackagesInTopologicalOrderFn;
  spawnSync = spawnSyncFn;
  config: NpmPublisherConfig;

  constructor(config: NpmPublisherConfig) {
    if (!config.useAuxiliaryPackagesOnly && !config.publisher) {
      throw new Error('Publisher is required for publishing mongosh');
    }

    this.config = config;
  }

  async publish(): Promise<void> {
    const { useAuxiliaryPackagesOnly, isDryRun, publisher } = this.config;

    const commandOptions: SpawnSyncOptionsWithStringEncoding = {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        ...(isDryRun ? { npm_config_dry_run: 'true' } : {}),
      },
    };

    let packages = (
      await this.getPackagesInTopologicalOrder(PROJECT_ROOT)
    ).filter(
      (packageConfig) => !EXCLUDE_RELEASE_PACKAGES.includes(packageConfig.name)
    );

    if (useAuxiliaryPackagesOnly) {
      packages = packages.filter(
        (packageConfig) =>
          !MONGOSH_RELEASE_PACKAGES.includes(packageConfig.name)
      );
    }
    if (publisher) {
      await this.setReleasePublisher(publisher, packages);
    }
    // Lerna requires a clean repository for a publish from-package
    // we use git update-index --assume-unchanged on files we know have been bumped
    this.markBumpedFilesAsAssumeUnchanged(packages, true);
    try {
      this.spawnSync(
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
      this.markBumpedFilesAsAssumeUnchanged(packages, false);
    }

    if (!useAuxiliaryPackagesOnly) {
      const mongoshVersion = packages.find(
        (packageConfig) => packageConfig.name === 'mongosh'
      )?.version;

      if (!mongoshVersion) {
        throw new Error('mongosh package not found');
      }

      this.spawnSync(
        'git',
        ['tag', '-a', `v${mongoshVersion}`, '-m', `v${mongoshVersion}`],
        commandOptions
      );

      this.spawnSync('git', ['push', '--follow-tags'], commandOptions);
    }
  }

  async setReleasePublisher(
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

  markBumpedFilesAsAssumeUnchanged(
    packages: PackageInfo[],
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
        `File ${f} is now ${
          assumeUnchanged ? '' : 'NOT '
        }assumed to be unchanged`
      );
    }
  }
}
