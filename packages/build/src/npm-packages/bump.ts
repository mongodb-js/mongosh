import {
  EXCLUDE_RELEASE_PACKAGES,
  MONGOSH_RELEASE_PACKAGES,
  PROJECT_ROOT,
} from './constants';
import { promises as fs } from 'fs';
import path from 'path';
import { spawnSync as spawnSyncFn } from '../helpers';
import { getPackagesInTopologicalOrder as getPackagesInTopologicalOrderFn } from '@mongodb-js/monorepo-tools';

export class PackageBumper {
  private readonly getPackagesInTopologicalOrder: typeof getPackagesInTopologicalOrderFn;
  private readonly spawnSync: typeof spawnSyncFn;

  constructor({
    getPackagesInTopologicalOrder = getPackagesInTopologicalOrderFn,
    spawnSync = spawnSyncFn,
  } = {}) {
    this.getPackagesInTopologicalOrder = getPackagesInTopologicalOrder;
    this.spawnSync = spawnSync;
  }

  /** Bumps only the main mongosh release packages to the set version. */
  public async bumpMongoshReleasePackages(version: string): Promise<void> {
    if (!version) {
      console.warn(
        'mongosh: Release version not specified. Skipping mongosh bump.'
      );
      return;
    }

    console.info(`mongosh: Bumping mongosh release packages to ${version}`);
    const monorepoRootPath = PROJECT_ROOT;
    const packages = await this.getPackagesInTopologicalOrder(monorepoRootPath);

    const bumpedPackages = MONGOSH_RELEASE_PACKAGES;

    const locations = [monorepoRootPath, ...packages.map((p) => p.location)];

    for (const location of locations) {
      const packageJsonPath = path.join(location, 'package.json');
      const packageJson = JSON.parse(
        await fs.readFile(packageJsonPath, 'utf8')
      );

      if (
        bumpedPackages.includes(packageJson.name as string) &&
        location !== monorepoRootPath
      ) {
        packageJson.version = version;
      }
      for (const grouping of [
        'dependencies',
        'devDependencies',
        'optionalDependencies',
        'peerDependencies',
      ]) {
        if (!packageJson[grouping]) {
          continue;
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        for (const name of Object.keys(packageJson[grouping])) {
          if (!bumpedPackages.includes(name)) {
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

    await this.updateShellApiMongoshVersion(version);

    // Update package-lock.json
    this.spawnSync('npm', ['install', '--package-lock-only'], {
      stdio: 'inherit',
      cwd: monorepoRootPath,
      encoding: 'utf8',
      env: {
        ...process.env,
        PUPPETEER_SKIP_CHROME_DOWNLOAD: 'true',
      },
    });
  }

  /** Updates the shell-api constant to match the mongosh version. */
  public async updateShellApiMongoshVersion(version: string) {
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
  public bumpAuxiliaryPackages() {
    this.spawnSync('bump-monorepo-packages', [], {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        LAST_BUMP_COMMIT_MESSAGE: 'chore(release): bump packages',
        SKIP_BUMP_PACKAGES: [
          ...EXCLUDE_RELEASE_PACKAGES,
          ...MONGOSH_RELEASE_PACKAGES,
        ].join(','),
      },
    });
  }

  public commitBumpedPackages() {
    this.spawnSync('git', ['add', '.'], {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    });

    this.spawnSync('git', ['commit', '-m', 'chore(release): bump packages'], {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    });
  }
}
