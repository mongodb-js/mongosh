import path from 'path';
import { promises as fs } from 'fs';
import type { PackageInfo } from '@mongodb-js/monorepo-tools';

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
