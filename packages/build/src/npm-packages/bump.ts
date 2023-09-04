import { promises as fs } from 'fs';
import path from 'path';
import { PLACEHOLDER_VERSION } from './constants';
import { getPackagesInTopologicalOrder } from '@mongodb-js/monorepo-tools';

export async function bumpNpmPackages(version: string): Promise<void> {
  if (!version || version === PLACEHOLDER_VERSION) {
    console.info(
      'mongosh: Not bumping package version, keeping at placeholder'
    );
    return;
  }

  console.info(`mongosh: Bumping package versions to ${version}`);
  const monorepoRootPath = path.resolve(__dirname, '..', '..', '..', '..');
  const packages = await getPackagesInTopologicalOrder(monorepoRootPath);

  const locations = [monorepoRootPath, ...packages.map((p) => p.location)];

  for (const location of locations) {
    const packageJsonPath = path.join(location, 'package.json');
    console.log({ packageJsonPath });
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

      for (const [name, currentVersion] of Object.entries(
        packageJson[grouping]
      )) {
        if (currentVersion !== PLACEHOLDER_VERSION) {
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
