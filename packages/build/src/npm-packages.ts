import { SpawnSyncOptionsWithStringEncoding, SpawnSyncReturns } from 'child_process';
import * as spawn from 'cross-spawn';
import path from 'path';

const PLACEHOLDER_VERSION = '0.0.0-dev.0';
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const LERNA_BIN = path.resolve(PROJECT_ROOT, 'node_modules', '.bin', 'lerna');

export interface LernaPackageDescription {
  name: string;
  version: string;
  private: boolean;
  location: string;
}

export function spawnSync(command: string, args: string[], options: SpawnSyncOptionsWithStringEncoding): SpawnSyncReturns<string> {
  const result = spawn.sync(command, args, options);
  if (result.error) {
    console.error('spawn.sync returned error', result.error);
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`Failed to spawn ${command}, args: ${args.join(',')}: ${result.error}`);
  } else if (result.status !== 0) {
    console.error('spawn.sync exited with non-zero', result.status);
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`Spawn exited non-zero for ${command}, args: ${args.join(',')}: ${result.status}`);
  }
  return result;
}

export function bumpNpmPackages(
  version: string,
  spawnSyncFn: typeof spawnSync = spawnSync
): void {
  if (!version || version === PLACEHOLDER_VERSION) {
    console.info('mongosh: Not bumping package version, keeping at placeholder');
    return;
  }

  console.info(`mongosh: Bumping package versions to ${version}`);
  spawnSyncFn(LERNA_BIN, [
    'version',
    version,
    '--no-changelog',
    '--no-push',
    '--exact',
    '--no-git-tag-version',
    '--force-publish',
    '--yes'
  ], {
    stdio: 'inherit',
    cwd: PROJECT_ROOT,
    encoding: 'utf8'
  });
}

export function publishNpmPackages(
  listNpmPackagesFn: typeof listNpmPackages = listNpmPackages,
  markBumpedFilesAsAssumeUnchangedFn: typeof markBumpedFilesAsAssumeUnchanged = markBumpedFilesAsAssumeUnchanged,
  spawnSyncFn: typeof spawnSync = spawnSync
): void {
  const packages = listNpmPackagesFn();

  const versions = Array.from(new Set(packages.map(({ version }) => version)));

  if (versions.length !== 1) {
    throw new Error(`Refusing to publish packages with multiple versions: ${versions}`);
  }

  if (versions[0] === PLACEHOLDER_VERSION) {
    throw new Error('Refusing to publish packages with placeholder version');
  }

  // Lerna requires a clean repository for a publish from-package (--force-publish does not have any effect here)
  // we use git update-index --assume-unchanged on files we know have been bumped
  markBumpedFilesAsAssumeUnchangedFn(packages, true);
  try {
    spawnSyncFn(LERNA_BIN, [
      'publish',
      'from-package',
      '--no-changelog',
      '--no-push',
      '--exact',
      '--no-git-tag-version',
      '--force-publish',
      '--yes'
    ], {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
      encoding: 'utf8'
    });
  } finally {
    markBumpedFilesAsAssumeUnchangedFn(packages, false);
  }
}

export function listNpmPackages(): LernaPackageDescription[] {
  const lernaListOutput = spawnSync(
    LERNA_BIN, [
      'list',
      '--json',
      '--all'
    ],
    {
      cwd: PROJECT_ROOT,
      encoding: 'utf8'
    }
  );

  return JSON.parse(lernaListOutput.stdout);
}

export function markBumpedFilesAsAssumeUnchanged(
  packages: LernaPackageDescription[],
  assumeUnchanged: boolean,
  spawnSyncFn: typeof spawnSync = spawnSync
): void {
  const filesToAssume = [
    'lerna.json'
  ];
  packages.forEach(({ location }) => {
    filesToAssume.push(`${location}/package.json`);
    filesToAssume.push(`${location}/package-lock.json`);
  });

  filesToAssume.forEach(f => {
    spawnSyncFn('git', [
      'update-index',
      assumeUnchanged ? '--assume-unchanged' : '--no-assume-unchanged',
      f
    ], {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
      encoding: 'utf8'
    });
    console.info(`File ${f} is now ${assumeUnchanged ? '' : 'NOT '}assumed to be unchanged`);
  });
}
