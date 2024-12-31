import { spawnSync } from '../helpers';
import {
  IGNORE_BUMP_PACKAGES,
  MONGOSH_RELEASE_PACKAGES,
  PROJECT_ROOT,
} from './constants';

import { promises as fs } from 'fs';
import path from 'path';
import { getPackagesInTopologicalOrder } from '@mongodb-js/monorepo-tools';

/** This bumps only the main mongosh release packages to the set version. */
export async function bumpMongosh(version: string): Promise<void> {
  console.info(`mongosh: Bumping package versions to ${version}`);
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
}

/** Bump packages without setting a new version of mongosh. */
export function bumpNpmPackages() {
  spawnSync('bump-monorepo-packages', [], {
    stdio: 'inherit',
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      SKIP_BUMP_PACKAGES: [
        ...IGNORE_BUMP_PACKAGES,
        ...MONGOSH_RELEASE_PACKAGES,
      ].join(','),
    },
  });
}
