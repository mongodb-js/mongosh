import path from 'path';
import tar from 'tar';
import AdmZip from 'adm-zip';
import Platform from './platform';
import installer from 'electron-installer-debian';

/**
 * Get the path to the zip.
 *
 * @param {string} outputDir - The output directory.
 * @param {string} platform - The platform.
 * @param {string} version - The version.
 *
 * @returns {string} The path.
 */
export const zipPath = (outputDir: string, platform: string, version: string): string => {
  const ext = 'deb';
  return path.join(outputDir, `mongosh-${version}-debian.${ext}`);
};

/**
 * Filter out the archive itself when creating the tarball.
 *
 * @param {string} path - The path.
 *
 * @returns {boolean} If the file should be filtered out.
 */
const filterOut = (pathToFilter: string): boolean => {
  return !pathToFilter.match(/tgz/g);
};

/**
 * Create a zip archive for posix.
 *
 * @param {string} outputDir - The output directory.
 * @param {string} filename - the zip filename.
 */
export const zipPosix = async(outputDir: string, filename: string): Promise<void> => {
  const options = { gzip: true, file: filename, cwd: outputDir, filter: filterOut };
  await tar.c(options, [ '.' ]);
};

export const zipDebian = async(input: string, filename: string, version: string, outputDir: string): Promise<void> => {
  const options = {
    outputDir: outputDir,
    version: version,
    dest: filename,
    input: input,
    arch: 'amd64'
  }

  console.log('Writing debian package')
  await installer(options)
}

/**
 * Create a zip archive for windows.
 *
 * @param {string} input - The file to zip.
 * @param {string} filename - the zip filename.
 */
export const zipWindows = (input: string, filename: string): void => {
  const admZip = new AdmZip();
  admZip.addLocalFile(input);
  admZip.writeZip(filename);
};

export type ZipFile = { path: string; contentType: string };

/**
 * Create a gzipped tarball or zip for the provided options.
 *
 * @param {string} input - The file location to zip.
 * @param {string} outputDir - Where to save the zip.
 * @param {string} platform - The platform.
 * @param {string} version - The version.
 *
 * @returns {ZipFile} The path and type of the zip.
 */
export async function zip(
  input: string,
  outputDir: string,
  platform: string,
  version: string
): Promise<ZipFile> {
  const filename = zipPath(outputDir, platform, version);

  console.info('mongosh: zipping:', filename);

  // if (platform === Platform.Linux) { await zipPosix(outputDir, filename); return { path: filename,
  //         contentType: 'application/gzip'
  //   };
  // }

  // zipWindows(input, filename);

  console.log('input', input)
  console.log('filename', filename)
  console.log('outputdir', outputDir)

  await zipDebian(input, filename, version, outputDir);

  return {
    path: filename,
    contentType: 'application/zip'
  };
}
