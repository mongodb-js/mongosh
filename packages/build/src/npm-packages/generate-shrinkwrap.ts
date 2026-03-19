import path from 'path';
import { promises as fs } from 'fs';
import { execFileSync } from 'child_process';
import os from 'os';

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
    execFileSync(
      'npm',
      ['install', '--package-lock-only', '--ignore-scripts'],
      {
        cwd: tmpDir,
        stdio: 'pipe',
        encoding: 'utf8',
      }
    );

    // Read the pruned lockfile and post-process it
    const prunedContent = await fs.readFile(
      path.join(tmpDir, 'package-lock.json'),
      'utf8'
    );
    const pruned = JSON.parse(prunedContent);

    // Post-process: remove dev entries, workspace paths, and convert links
    const cleanedPackages: Record<string, Record<string, unknown>> = {
      '': pruned.packages[''],
    };
    let depCount = 0;

    for (const [key, entry] of Object.entries<Record<string, unknown>>(
      pruned.packages
    )) {
      if (key === '') continue;

      // Skip dev-only entries
      if (entry.dev) continue;

      // Skip workspace path entries (e.g. "packages/cli-repl", "configs/...")
      if (!key.startsWith('node_modules/')) continue;

      // Convert workspace links to registry-compatible entries
      if (entry.link && entry.resolved) {
        const workspacePath = entry.resolved as string;
        const workspaceEntry = pruned.packages[workspacePath] as
          | Record<string, unknown>
          | undefined;
        if (workspaceEntry) {
          const converted: Record<string, unknown> = {
            version: workspaceEntry.version,
          };
          if (workspaceEntry.license)
            converted.license = workspaceEntry.license;
          if (workspaceEntry.engines)
            converted.engines = workspaceEntry.engines;
          if (workspaceEntry.bin) converted.bin = workspaceEntry.bin;
          if (workspaceEntry.dependencies)
            converted.dependencies = workspaceEntry.dependencies;
          if (workspaceEntry.optionalDependencies)
            converted.optionalDependencies =
              workspaceEntry.optionalDependencies;
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
  const packageDirs = [
    path.join(projectRoot, 'packages', 'cli-repl'),
    path.join(projectRoot, 'packages', 'mongosh'),
  ];

  for (const packageDir of packageDirs) {
    await generateShrinkwrap(packageDir, projectRoot);
  }
}
