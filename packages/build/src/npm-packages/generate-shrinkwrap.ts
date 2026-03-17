import path from 'path';
import { promises as fs } from 'fs';
import os from 'os';
import { spawnSync as spawnSyncFn } from '../helpers/spawn-sync';

/**
 * Generates an npm-shrinkwrap.json file for a given package directory.
 *
 * This is needed so that when a package is installed from npm (e.g. by Homebrew),
 * the exact dependency versions that were tested are used, rather than whatever
 * versions happen to be resolved at install time.
 *
 * The approach:
 * 1. Create a temporary directory
 * 2. Copy the package.json there
 * 3. Run `npm install --package-lock-only` to resolve all dependencies
 * 4. Run `npm shrinkwrap` to generate npm-shrinkwrap.json
 * 5. Copy the resulting npm-shrinkwrap.json back to the package directory
 */
export async function generateShrinkwrap(
  packageDir: string,
  { spawnSync = spawnSyncFn } = {}
): Promise<void> {
  const packageJsonPath = path.join(packageDir, 'package.json');
  const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageJsonContent);

  console.info(
    `mongosh: Generating npm-shrinkwrap.json for ${packageJson.name} in ${packageDir}`
  );

  const tmpDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'mongosh-shrinkwrap-')
  );

  try {
    // Copy package.json to temp directory, stripping devDependencies since
    // Homebrew (and other consumers) only install production dependencies,
    // and devDependencies can cause peer dependency conflicts during resolution.
    const { devDependencies, ...prodPackageJson } = packageJson;
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify(prodPackageJson, null, 2)
    );

    // Run npm install --package-lock-only to generate a package-lock.json
    // with resolved dependency versions
    spawnSync('npm', ['install', '--package-lock-only', '--ignore-scripts'], {
      stdio: 'inherit',
      cwd: tmpDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        // Avoid any workspace-related behavior
        npm_config_workspaces: 'false',
      },
    });

    // Run npm shrinkwrap to convert package-lock.json to npm-shrinkwrap.json
    spawnSync('npm', ['shrinkwrap'], {
      stdio: 'inherit',
      cwd: tmpDir,
      encoding: 'utf8',
    });

    // Copy the generated npm-shrinkwrap.json back to the package directory
    const shrinkwrapPath = path.join(tmpDir, 'npm-shrinkwrap.json');
    const targetPath = path.join(packageDir, 'npm-shrinkwrap.json');
    await fs.copyFile(shrinkwrapPath, targetPath);

    console.info(
      `mongosh: Successfully generated npm-shrinkwrap.json for ${packageJson.name}`
    );
  } finally {
    // Clean up temp directory
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Generates npm-shrinkwrap.json files for the mongosh release packages
 * (mongosh and @mongosh/cli-repl) so that npm install uses locked
 * dependency versions.
 */
export async function generateShrinkwrapForReleasePackages(
  projectRoot: string,
  { spawnSync = spawnSyncFn } = {}
): Promise<void> {
  const packageDirs = [
    path.join(projectRoot, 'packages', 'cli-repl'),
    path.join(projectRoot, 'packages', 'mongosh'),
  ];

  for (const packageDir of packageDirs) {
    await generateShrinkwrap(packageDir, { spawnSync });
  }
}
