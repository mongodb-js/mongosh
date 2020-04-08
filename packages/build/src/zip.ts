import path from 'path';
import tar from 'tar';
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
  const ext = (platform === Platform.Windows) ? 'zip' : 'tgz';
  return path.join(outputDir, `mongosh-${version}-${platform}.${ext}`);
};

/**
 * Create a gzipped tarball or zip for the provided options.
 *
 * @param {string} input - The file location to zip.
 * @param {string} outputDir - Where to save the zip.
 * @param {string} platform - The platform.
 * @param {string} version - The version.
 */
const zip = async(input: string, outputDir: string, platform: string, version: string) => {
  const filename = zipPath(outputDir, platform, version);
  console.log('mongosh: zipping:', filename);
  await tar.c(
    {
      gzip: true,
      file: filename,
      cwd: outputDir
    },
    [input]
  );
};

export default zip;
export { zipPath };
