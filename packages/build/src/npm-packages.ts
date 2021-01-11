import { execFileSync } from 'child_process';
import path from 'path';
import writeAnalyticsConfig from './analytics';
import Config from './config';

const PLACEHOLDER_VERSION = '0.0.0-dev.0';
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const LERNA_BIN = path.resolve(PROJECT_ROOT, 'node_modules', '.bin', 'lerna');

export function bumpNpmPackages(version: string): void {
  if (!version || version === PLACEHOLDER_VERSION) {
    return;
  }

  execFileSync(LERNA_BIN, [
    'version',
    version,
    '--no-changelog',
    '--no-push',
    '--exact',
    '--no-git-tag-version',
    '--force-publish',
    '--yes'
  ], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit'
  });
}

export async function publishNpmPackages(config: Config): Promise<void> {
  // ensures the segment api key to be present in the published packages
  await writeAnalyticsConfig(
    config.analyticsConfigFilePath,
    config.segmentKey
  );

  const packages = listNpmPackages();

  const versions = Array.from(new Set(packages.map(({ version }) => version)));

  if (versions.length !== 1) {
    throw new Error(`Refusing to publish packages with multiple versions: ${versions}`);
  }

  if (versions[0] === PLACEHOLDER_VERSION) {
    throw new Error('Refusing to publish packages with placeholder version');
  }

  execFileSync(LERNA_BIN, [
    'publish',
    'from-package',
    '--no-changelog',
    '--no-push',
    '--exact',
    '--no-git-tag-version',
    '--force-publish',
    '--yes'
  ], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit'
  });
}

function listNpmPackages(): {version: string}[] {
  const lernaListOutput = execFileSync(
    LERNA_BIN, [
      '--json',
    ], { cwd: PROJECT_ROOT }
  ).toString();

  const packages = JSON.parse(lernaListOutput);
  return packages;
}
