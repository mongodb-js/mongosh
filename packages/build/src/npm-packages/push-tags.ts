import type { SpawnSyncOptionsWithStringEncoding } from 'child_process';
import {
  EXCLUDE_RELEASE_PACKAGES,
  MONGOSH_RELEASE_PACKAGES,
  PROJECT_ROOT,
} from './constants';
import type { LernaPackageDescription } from './list';
import { listNpmPackages as listNpmPackagesFn } from './list';
import { spawnSync as spawnSyncFn } from '../helpers/spawn-sync';

export function pushTags(
  {
    useAuxiliaryPackagesOnly,
    isDryRun,
  }: { useAuxiliaryPackagesOnly: boolean; isDryRun: boolean },
  listNpmPackages: typeof listNpmPackagesFn = listNpmPackagesFn,
  existsVersionTag: typeof existsTag = existsTag,
  spawnSync: typeof spawnSyncFn = spawnSyncFn
) {
  const allReleasablePackages = listNpmPackages().filter(
    (packageConfig) => !EXCLUDE_RELEASE_PACKAGES.includes(packageConfig.name)
  );

  const packages: LernaPackageDescription[] = useAuxiliaryPackagesOnly
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

    if (existsVersionTag(newTag)) {
      console.warn(`${newTag} tag already exists. Skipping...`);
      continue;
    }
    spawnSync('git', ['tag', '-a', newTag, '-m', newTag], commandOptions);
  }

  if (!useAuxiliaryPackagesOnly) {
    const mongoshVersion = packages.find(
      (packageConfig) => packageConfig.name === 'mongosh'
    )?.version;

    if (!mongoshVersion) {
      throw new Error('mongosh package not found');
    }

    const newVersionTag = `v${mongoshVersion}`;

    if (!existsVersionTag(newVersionTag)) {
      console.info(`Creating v${mongoshVersion} tag...`);
      spawnSync(
        'git',
        ['tag', '-a', newVersionTag, '-m', newVersionTag],
        commandOptions
      );
    } else {
      console.warn(`${newVersionTag} tag already exists. Skipping...`);
    }
  }

  if (!isDryRun) {
    spawnSync('git', ['push', '--tags'], commandOptions);
  }
}

/** Returns true if the tag exists in the remote repository. */
export function existsTag(tag: string): boolean {
  // rev-parse will return the hash of tagged commit
  // if it exists or throw otherwise.
  try {
    const revParseResult = spawnSyncFn(
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
