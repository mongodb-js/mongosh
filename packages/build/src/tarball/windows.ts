import { constants, promises as fs } from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import { promisify } from 'util';
import { createTarballContents, execFile as execFileFn, generateDirFromTemplate, sanitizeVersion } from './helpers';
import { PackageInformation } from './package-information';

const { COPYFILE_FICLONE } = constants;

/**
 * Create a ZIP archive for windows.
 */
export async function tarballWindows(
  pkg: PackageInformation,
  outFile: string,
  execFile: typeof execFileFn = execFileFn
): Promise<void> {
  // Let's assume that either zip or 7z are installed. That's true for the
  // evergreen macOS and Windows machines, respectively, at this point.
  // In either case, using these has the advantage of preserving executable permissions
  // as opposed to using libraries like adm-zip.
  const tmpDir = await createTarballContents(pkg);
  try {
    await execFile('zip', ['-r', outFile, '.'], { cwd: tmpDir });
  } catch (err) {
    if (err.code === 'ENOENT') {
      await execFile('7z', ['a', outFile, '.'], { cwd: tmpDir });
    } else {
      throw err;
    }
  }
  await promisify(rimraf)(tmpDir);
}


/**
 * Create an MSI installer.
 */
export async function tarballWindowsMSI(
  pkg: PackageInformation,
  templateDir: string,
  outFile: string,
  execFile: typeof execFileFn = execFileFn
): Promise<void> {
  console.info('mongosh: writing msi package');

  const filenames = [...new Set([
    ...pkg.binaries.map(({ sourceFilePath }) => path.basename(sourceFilePath)),
    ...pkg.binaries.map(({ license }) => license.packagedFilePath),
    ...pkg.otherDocFilePaths.map(({ packagedFilePath }) => packagedFilePath)
  ])];
  const msiComponentList =
        filenames.map(f => `<Component><File Source="$(var.BuildFolder)\\${f}"/></Component>`).join('\n');
  const version = sanitizeVersion(pkg.metadata.version, 'msi');

  const dir = await generateDirFromTemplate(templateDir, {
    ...pkg.metadata,
    msiComponentList,
    version
  });

  // Copy all files that we want to ship into the BUILD directory.
  for (const { sourceFilePath } of pkg.binaries) {
    await fs.copyFile(sourceFilePath, path.join(dir, 'BUILD', path.basename(sourceFilePath)), COPYFILE_FICLONE);
  }
  for (const { sourceFilePath, packagedFilePath } of pkg.binaries.map(({ license }) => license)) {
    await fs.copyFile(sourceFilePath, path.join(dir, 'BUILD', packagedFilePath), COPYFILE_FICLONE);
  }
  for (const { sourceFilePath, packagedFilePath } of pkg.otherDocFilePaths) {
    await fs.copyFile(sourceFilePath, path.join(dir, 'BUILD', packagedFilePath), COPYFILE_FICLONE);
  }

  const WIX = process.env.WIX;
  await execFile(`${WIX}\\bin\\candle.exe`, [
    '-out', 'obj\\Release\\',
    '-arch', 'x64',
    '-ext', `${WIX}\\bin\\WixUIExtension.dll`,
    'MongoshUI.wxs', 'Product.wxs'
  ], {
    cwd: dir
  });

  await execFile(`${WIX}\\bin\\light.exe`, [
    '-out', `bin\\Release\\${path.basename(outFile)}`,
    '-cultures:en-US',
    '-ext', `${WIX}\\bin\\WixUIExtension.dll`,
    '-loc', 'MongoshUI.en-US.wxl',
    'obj\\Release\\MongoshUI.wixobj',
    'obj\\Release\\Product.wixobj'
  ], {
    cwd: dir
  });

  await fs.rename(path.join(dir, 'bin', 'Release', path.basename(outFile)), outFile);

  await promisify(rimraf)(dir);
}
