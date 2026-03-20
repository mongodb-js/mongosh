import {
  EXCLUDE_RELEASE_PACKAGES,
  LERNA_BIN,
  MONGOSH_RELEASE_PACKAGES,
  PROJECT_ROOT,
} from './constants';
import { spawnSync as spawnSyncFn } from '../helpers/spawn-sync';
import { type SpawnSyncOptionsWithStringEncoding } from 'child_process';
import type { LernaPackageDescription, PackagePublisherConfig } from './types';

export class PackagePublisher {
  readonly config: PackagePublisherConfig;
  private readonly spawnSync: typeof spawnSyncFn;

  constructor(
    config: PackagePublisherConfig,
    { spawnSync = spawnSyncFn } = {}
  ) {
    this.config = config;
    this.spawnSync = spawnSync;
  }

  public publishToNpm(): void {
    const commandOptions: SpawnSyncOptionsWithStringEncoding = {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        ...(this.config.isDryRun ? { npm_config_dry_run: 'true' } : {}),
      },
    };

    // There seems to be a bug where lerna does not run prepublish topologically
    // during the publish step, causing build errors. This ensures all packages are topologically
    // compiled beforehand.
    this.spawnSync(LERNA_BIN, ['run', 'prepublish', '--sort'], commandOptions);

    // Lerna requires a clean repository for a publish from-package
    // we use git update-index --assume-unchanged on files we know have been bumped
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
  }

  public listNpmPackages(): LernaPackageDescription[] {
    const lernaListOutput = this.spawnSync(
      LERNA_BIN,
      ['list', '--json', '--all'],
      {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
      }
    );

    return JSON.parse(lernaListOutput.stdout);
  }

  public pushTags() {
    const allReleasablePackages = this.listNpmPackages().filter(
      (packageConfig) => !EXCLUDE_RELEASE_PACKAGES.includes(packageConfig.name)
    );

    const packages: LernaPackageDescription[] = this.config
      .useAuxiliaryPackagesOnly
      ? allReleasablePackages.filter(
          (packageConfig) =>
            !MONGOSH_RELEASE_PACKAGES.includes(packageConfig.name)
        )
      : allReleasablePackages;

    const commandOptions: SpawnSyncOptionsWithStringEncoding = {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
      },
    };

    for (const packageInfo of packages) {
      const { name, version } = packageInfo;
      const newTag = `${name}@${version}`;

      if (this.existsTag(newTag)) {
        console.warn(`${newTag} tag already exists. Skipping...`);
        continue;
      }
      this.spawnSync(
        'git',
        ['tag', '-a', newTag, '-m', newTag],
        commandOptions
      );
    }

    if (!this.config.useAuxiliaryPackagesOnly) {
      const mongoshVersion = packages.find(
        (packageConfig) => packageConfig.name === 'mongosh'
      )?.version;

      if (!mongoshVersion) {
        throw new Error('mongosh package not found');
      }

      if (!this.config.isDryRun) {
        // Push the tag separately for mongosh to trigger the merge-release-tag.yml workflow
        // Since GitHub Actions only runs create tag workflows when no more than 3 tags are created.
        // https://docs.github.com/en/actions/reference/events-that-trigger-workflows#create
        this.spawnSync(
          'git',
          ['push', 'origin', `refs/tags/mongosh@${mongoshVersion}`],
          commandOptions
        );
      }
    }

    if (!this.config.isDryRun) {
      this.spawnSync('git', ['push', '--tags'], commandOptions);
    }
  }
  /** Returns true if the tag exists in the remote repository. */
  public existsTag(tag: string): boolean {
    // rev-parse will return the hash of tagged commit
    // if it exists or throw otherwise.
    try {
      const revParseResult = this.spawnSync(
        'git',
        ['rev-parse', '--quiet', '--verify', `refs/tags/${tag}`],
        {
          cwd: PROJECT_ROOT,
          encoding: 'utf8',
          stdio: 'pipe',
        }
      );
      return revParseResult.status === 0;
    } catch (error) {
      return false;
    }
  }
}
