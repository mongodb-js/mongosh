import { promises as fs } from 'fs';
import rimraf from 'rimraf';
import tar from 'tar';
import { promisify } from 'util';
import { createTarballContents } from './helpers';
import { PackageInformation } from './package-information';

/**
 * Create a tarball archive for posix.
 */
export async function tarballPosix(pkg: PackageInformation, outFile: string): Promise<void> {
  const tmpDir = await createTarballContents(pkg);
  await tar.c({
    gzip: true,
    file: outFile,
    cwd: tmpDir
  }, await fs.readdir(tmpDir));
  await promisify(rimraf)(tmpDir);
}
