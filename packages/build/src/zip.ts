import path from 'path';
import tar from 'tar';
import AdmZip from 'adm-zip';
import Platform from './platform';

/**
 * Get the path to the zip.
 *
 * @param {string} outputDir - The output directory.
 * @param {string} platform - The platform.
 * @param {string} version - The version.
 *
 * @returns {string} The path.
 */
const zipPath = (outputDir: string, platform: string, version: string): string => {
  const ext = (platform === Platform.Linux) ? 'tgz' : 'zip';
  return path.join(outputDir, `mongosh-${version}-${platform}.${ext}`);
};

/**
 * Filter out the archive itself when creating the tarball.
 *
 * @param {string} path - The path.
 *
 * @returns {boolean} If the file should be filtered out.
 */
const filterOut = (path) => {
  return !path.match(/tgz/g)
};

/**
 * Create a zip archive for posix.
 *
 * @param {string} outputDir - The output directory.
 * @param {string} filename - the zip filename.
 */
const zipPosix = async(outputDir: string, filename: string) => {
  const options = { gzip: true, file: filename, cwd: outputDir, filter: filterOut };
  await tar.c(options, [ '.' ]);
};

/**
 * Create a zip archive for windows.
 *
 * @param {string} input - The file to zip.
 * @param {string} filename - the zip filename.
 */
const zipWindows = async(input: string, filename: string) => {
  const admZip = new AdmZip();
  admZip.addLocalFile(input)
  await admZip.writeZip(filename);
};

/**
 * Create a gzipped tarball or zip for the provided options.
 *
 * @param {string} input - The file location to zip.
 * @param {string} outputDir - Where to save the zip.
 * @param {string} platform - The platform.
 * @param {string} version - The version.
 *
 * @returns {string} The filename of the zip.
 */
const zip = async(input: string, outputDir: string, platform: string, version: string): Promise<string> => {
  const filename = zipPath(outputDir, platform, version);
  console.log('mongosh: zipping:', filename);
  if (platform === Platform.Linux) {
    await zipPosix(outputDir, filename);
  } else {
    await zipWindows(input, filename);
  }
  return filename;
};

export default zip;
export { zipPath, zipPosix, zipWindows };
