import path from 'path';
import { promises as fs } from 'fs';
import type { PackageInfo } from '@mongodb-js/monorepo-tools';
import { PROJECT_ROOT } from './constants';
import { spawnSync as spawnSyncFn } from '../helpers/spawn-sync';

export async function getPackageConfigurations(
  packages: PackageInfo[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<[path: string, contents: Record<string, any>][]> {
  return Promise.all(
    packages.map(async (packageInfo) => {
      const packageJsonPath = path.join(packageInfo.location, 'package.json');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const packageJsonContents: Record<string, any> = JSON.parse(
        await fs.readFile(packageJsonPath, 'utf8')
      );
      return [packageJsonPath, packageJsonContents];
    })
  );
}

export function markBumpedFilesAsAssumeUnchanged(
  packages: PackageInfo[],
  assumeUnchanged: boolean,
  spawnSync: typeof spawnSyncFn = spawnSyncFn
): void {
  const filesToAssume = [
    path.resolve(PROJECT_ROOT, 'lerna.json'),
    path.resolve(PROJECT_ROOT, 'package.json'),
    path.resolve(PROJECT_ROOT, 'package-lock.json'),
  ];
  for (const { location } of packages) {
    filesToAssume.push(path.resolve(location, 'package.json'));
  }

  for (const f of filesToAssume) {
    spawnSync(
      'git',
      [
        'update-index',
        assumeUnchanged ? '--assume-unchanged' : '--no-assume-unchanged',
        f,
      ],
      {
        stdio: 'inherit',
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
      },
      true
    );
    console.info(
      `File ${f} is now ${assumeUnchanged ? '' : 'NOT '}assumed to be unchanged`
    );
  }
}
