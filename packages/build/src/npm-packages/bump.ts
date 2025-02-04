import { spawnSync } from '../helpers';
import {
  EXCLUDE_RELEASE_PACKAGES,
  MONGOSH_RELEASE_PACKAGES,
  PROJECT_ROOT,
} from './constants';

import { promises as fs } from 'fs';
import path from 'path';
import { getPackagesInTopologicalOrder } from '@mongodb-js/monorepo-tools';

/** Bumps only the main mongosh release packages to the set version. */
export async function bumpMongoshReleasePackages(
  version: string
): Promise<void> {
  if (!version) {
    console.warn(
      'mongosh: Release version not specified. Skipping mongosh bump.'
    );
    return;
  }

  console.info(`mongosh: Bumping mongosh release packages to ${version}`);
  const monorepoRootPath = path.resolve(__dirname, '..', '..', '..', '..');
  const packages = await getPackagesInTopologicalOrder(monorepoRootPath);

  const workspaceNames = packages
    .map((p) => p.name)
    .filter((name) => MONGOSH_RELEASE_PACKAGES.includes(name));

  const locations = [monorepoRootPath, ...packages.map((p) => p.location)];

  for (const location of locations) {
    const packageJsonPath = path.join(location, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

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
        if (!workspaceNames.includes(name)) {
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
      LAST_BUMP_COMMIT_MESSAGE: 'chore(release): bump auxiliary packages',
      SKIP_BUMP_PACKAGES: [
        ...EXCLUDE_RELEASE_PACKAGES,
        ...MONGOSH_RELEASE_PACKAGES,
      ].join(','),
    },
  });
}

export function commitBumpedPackages() {
  spawnSync('git', ['add', '.'], {
    stdio: 'inherit',
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
  });

  spawnSync('git', ['commit', '-m', 'chore(release): bump packages'], {
    stdio: 'inherit',
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
  });
}
