import { promises as fs, constants } from 'fs';
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

  // Copy MAN file in tmpDir
  const { sourceFilePath: manualSource, packagedFilePath: manualName } = pkg.manualFile;
  await fs.copyFile(manualSource, path.join(tmpDir, filename, manualName), constants.COPYFILE_FICLONE);

  await tar.c({
    gzip: true,
    file: outFile,
    cwd: tmpDir
  }, await fs.readdir(tmpDir));
  await promisify(rimraf)(tmpDir);
}
