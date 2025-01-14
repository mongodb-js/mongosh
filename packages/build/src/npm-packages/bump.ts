import { spawnSync } from '../helpers';
import {
  EXCLUDE_RELEASE_PACKAGES,
  MONGOSH_RELEASE_PACKAGES,
  PROJECT_ROOT,
} from './constants';

import { promises as fs } from 'fs';
import path from 'path';
import { getPackagesInTopologicalOrder } from '@mongodb-js/monorepo-tools';
import { getPackageConfigurations } from './helpers';

/** Bumps only the main mongosh release packages to the set version. */
export async function bumpMongoshReleasePackages(): Promise<void> {
  const version = process.env.MONGOSH_RELEASE_VERSION;
  if (!version) {
    throw new Error(
      'MONGOSH_RELEASE_VERSION version not specified during mongosh bump'
    );
  }

  console.info(`mongosh: Bumping package versions to ${version}`);
  const packages = await getPackagesInTopologicalOrder(PROJECT_ROOT);
  const packageConfigurations = await getPackageConfigurations(packages);

  for (const [packageJsonPath, packageJson] of packageConfigurations) {
    packageJson.version = version;

    for (const grouping of [
      'dependencies',
      'devDependencies',
      'optionalDependencies',
      'peerDependencies',
    ]) {
      if (!packageJson[grouping]) {
        continue;
      }

      for (const name of Object.keys(packageJson[grouping])) {
        if (!MONGOSH_RELEASE_PACKAGES.includes(name)) {
          continue;
        }
        packageJson[grouping][name] = version;
      }
    }

    await fs.writeFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2) + '\n'
    );
  }

  await updateShellApiMongoshVersion(version);
}

/** Updates the shell-api constant to match the mongosh version. */
export async function updateShellApiMongoshVersion(version: string) {
  const shellApiVersionFilePath = path.join(
    __dirname,
    PROJECT_ROOT,
    'packages',
    'shell-api',
    'src',
    'mongosh-version.ts'
  );

  const versionFileContent = await fs.readFile(
    shellApiVersionFilePath,
    'utf-8'
  );

  // Write the updated content back to the mongosh-version file
  await fs.writeFile(
    shellApiVersionFilePath,
    // Replace the version inside MONGOSH_VERSION = '...'
    versionFileContent.replace(
      /MONGOSH_VERSION = '.*'/,
      `MONGOSH_VERSION = '${version}'`
    ),
    'utf-8'
  );
}

/** Bumps auxiliary packages without setting a new version of mongosh. */
export function bumpAuxiliaryPackages() {
  spawnSync('bump-monorepo-packages', [], {
    stdio: 'inherit',
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      SKIP_BUMP_PACKAGES: [
        ...EXCLUDE_RELEASE_PACKAGES,
        ...MONGOSH_RELEASE_PACKAGES,
      ].join(','),
    },
  });
}
