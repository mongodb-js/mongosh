import path from 'path';
import { promises as fs } from 'fs';
import os from 'os';
import { spawnSync } from '../helpers/spawn-sync';
import { MONGOSH_RELEASE_PACKAGES } from './constants';

/** Represents an entry in the lockfile v3 `packages` map. */
interface LockfilePackageEntry {
  version?: string;
  resolved?: string;
  integrity?: string;
  dev?: boolean;
  link?: boolean;
  license?: string;
  engines?: Record<string, string>;
  bin?: Record<string, string>;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * Generates an npm-shrinkwrap.json file for a given package directory by
 * letting npm prune the monorepo's root package-lock.json down to just the
 * production dependencies needed by the target package.
 *
 * The strategy:
 * 1. Copy the root package-lock.json to a temp directory alongside a
 *    production-only package.json for the target package.
 * 2. Modify the lockfile's root entry ("") to match the target package.
 * 3. Run `npm install --package-lock-only` so npm prunes the lockfile to
 *    only the dependencies reachable from the target package, while
 *    preserving the exact versions from the monorepo's tested lockfile.
 * 4. Post-process: strip dev-only entries, convert workspace links into
 *    registry-compatible entries, and remove workspace path entries.
 *
 * This ensures the shrinkwrap contains exactly the dependency versions that
 * were installed and tested in CI.
 */
export async function generateShrinkwrap(
  packageDir: string,
  projectRoot: string
): Promise<void> {
  const lockfilePath = path.join(projectRoot, 'package-lock.json');
  const lockfileContent = await fs.readFile(lockfilePath, 'utf8');
  const lockfile = JSON.parse(lockfileContent);

  const packageJsonPath = path.join(packageDir, 'package.json');
  const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageJsonContent);

  console.info(
    `mongosh: Generating npm-shrinkwrap.json for ${packageJson.name} from lockfile`
  );

  // Create a temp directory for npm to work in
  const tmpDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'mongosh-shrinkwrap-')
  );

  try {
    // Write a production-only package.json
    const prodPkg = {
      name: packageJson.name,
      version: packageJson.version,
      license: packageJson.license,
      ...(packageJson.dependencies && {
        dependencies: packageJson.dependencies,
      }),
      ...(packageJson.optionalDependencies && {
        optionalDependencies: packageJson.optionalDependencies,
      }),
      ...(packageJson.bin && { bin: packageJson.bin }),
      ...(packageJson.engines && { engines: packageJson.engines }),
    };
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify(prodPkg, null, 2)
    );

    // Copy the lockfile with a modified root entry matching the target package
    lockfile.name = packageJson.name;
    lockfile.version = packageJson.version;
    lockfile.packages[''] = { ...prodPkg };
    await fs.writeFile(
      path.join(tmpDir, 'package-lock.json'),
      JSON.stringify(lockfile, null, 2)
    );

    // Let npm prune the lockfile to only the reachable dependencies
    spawnSync('npm', ['install', '--package-lock-only', '--ignore-scripts'], {
      cwd: tmpDir,
      stdio: 'pipe',
      encoding: 'utf8',
    });

    // Read the pruned lockfile and post-process it
    const prunedContent = await fs.readFile(
      path.join(tmpDir, 'package-lock.json'),
      'utf8'
    );
    const pruned = JSON.parse(prunedContent);

    // Post-process: remove dev entries, workspace paths, and convert links
    const packages = pruned.packages as Record<string, LockfilePackageEntry>;
    const cleanedPackages: Record<string, LockfilePackageEntry> = {
      '': packages[''],
    };
    let depCount = 0;

    for (const [key, entry] of Object.entries(packages)) {
      if (key === '') continue;

      // Skip dev-only entries
      if (entry.dev) continue;

      // Skip workspace path entries (e.g. "packages/cli-repl", "configs/...")
      if (!key.startsWith('node_modules/')) continue;

      // Convert workspace links to registry-compatible entries
      // Copy all fields from the workspace path entry (version, license,
      // dependencies, peerDependencies, engines, bin, etc.) so we preserve
      // the same metadata/semantics as npm's lockfile entries.
      if (entry.link && entry.resolved) {
        const workspaceEntry = packages[entry.resolved];
        if (workspaceEntry) {
          // Skip dev-only workspace packages (the link entry itself may not
          // be marked dev, but the resolved workspace path entry can be).
          if (workspaceEntry.dev) continue;
          const { dev: _dev, link: _link, ...converted } = workspaceEntry;
          cleanedPackages[key] = converted;
          depCount++;
          continue;
        }
      }

      cleanedPackages[key] = entry;
      depCount++;
    }

    const shrinkwrap = {
      name: pruned.name,
      version: pruned.version,
      lockfileVersion: pruned.lockfileVersion,
      requires: true,
      packages: cleanedPackages,
    };

    const targetPath = path.join(packageDir, 'npm-shrinkwrap.json');
    await fs.writeFile(targetPath, JSON.stringify(shrinkwrap, null, 2) + '\n');

    console.info(
      `mongosh: Successfully generated npm-shrinkwrap.json for ${packageJson.name} ` +
        `(${depCount} dependencies)`
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Generates npm-shrinkwrap.json files for the mongosh release packages
 * (mongosh and @mongosh/cli-repl) so that npm install uses locked
 * dependency versions.
 */
export async function generateShrinkwrapForReleasePackages(
  projectRoot: string
): Promise<void> {
  for (const packageName of MONGOSH_RELEASE_PACKAGES) {
    const dirName = packageName.replace(/^@mongosh\//, '');
    const packageDir = path.join(projectRoot, 'packages', dirName);
    await generateShrinkwrap(packageDir, projectRoot);
  }
}
