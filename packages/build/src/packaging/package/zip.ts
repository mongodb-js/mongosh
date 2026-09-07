import path from 'path';
import rimraf from 'rimraf';
import { promisify } from 'util';
import {
  createCompressedArchiveContents,
  execFile as execFileFn,
} from './helpers';
import type { PackageInformation } from './package-information';

/**
 * Create a ZIP archive.
 */
export async function createZipPackage(
  pkg: PackageInformation,
  outFile: string,
  execFile: typeof execFileFn = execFileFn
): Promise<void> {
  // Let's assume that either zip or 7z are installed. That's true for the
  // evergreen macOS and Windows machines, respectively, at this point.
  // In either case, using these has the advantage of preserving executable permissions
  // as opposed to using libraries like adm-zip.
  const filename = path.basename(outFile).replace(/\.[^.]+$/, '');
  const tmpDir = await createCompressedArchiveContents(filename, pkg);
  try {
    await execFile('zip', ['-r', outFile, '.'], { cwd: tmpDir });
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      await execFile('7z', ['a', outFile, '.'], { cwd: tmpDir });
    } else {
      throw err;
    }
  }
  await promisify(rimraf)(tmpDir);
}
