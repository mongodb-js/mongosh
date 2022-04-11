import { promises as fs } from 'fs';
import assert from 'assert';

(async () => {
  const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
  const { ciRequiredOptionalDependencies } = packageJson.mongosh ?? {};
  for (const [pkg, platforms] of Object.entries(ciRequiredOptionalDependencies ?? {}) as any[]) {
    if (platforms.includes(process.platform)) {
      packageJson.dependencies ??= {};

      console.log(`Marking ${pkg} as non-optional in ${packageJson.name}`);
      assert(packageJson.optionalDependencies[pkg]);
      packageJson.dependencies[pkg] = packageJson.optionalDependencies[pkg];
    }
  }
  await fs.writeFile('package.json', JSON.stringify(packageJson, null, 2) + '\n');
})().catch(err => process.nextTick(() => { throw err; }));