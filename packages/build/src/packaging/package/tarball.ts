import { promises as fs } from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import tar from 'tar';
import { promisify } from 'util';
import { createCompressedArchiveContents } from './helpers';
import { PackageInformation } from './package-information';

/**
 * Create a tarball archive for posix.
 */
export async function createTarballPackage(pkg: PackageInformation, outFile: string): Promise<void> {
  const filename = path.basename(outFile).replace(/\.[^.]+$/, '');
  const tmpDir = await createCompressedArchiveContents(filename, pkg);
  await tar.c({
    gzip: true,
    file: outFile,
    cwd: tmpDir
  }, await fs.readdir(tmpDir));
  await promisify(rimraf)(tmpDir);
}
