import { promises as fs } from 'fs';
import assert from 'assert';
import path from 'path';
import { getPackagesInTopologicalOrder } from '@mongodb-js/monorepo-tools';

(async () => {
  const monorepoRootPath = path.resolve(__dirname, '..');
  // not really relevant that it is in topological order, but it is a convenient
  // way to get all the packages' paths
  const packages = await getPackagesInTopologicalOrder(monorepoRootPath);

  for (const { location } of packages) {
    const packageJsonPath = path.join(location, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    const { ciRequiredOptionalDependencies } = packageJson.mongosh ?? {};
    for (const [pkg, platforms] of Object.entries(ciRequiredOptionalDependencies ?? {}) as any[]) {
      if (platforms.includes(process.platform)) {
        packageJson.dependencies ??= {};

        console.log(`Marking ${pkg} as non-optional in ${packageJson.name}`);
        assert(packageJson.optionalDependencies[pkg]);
        packageJson.dependencies[pkg] = packageJson.optionalDependencies[pkg];
      }
    }
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  }
})().catch(err => process.nextTick(() => { throw err; }));
