import tar from 'tar';
import path from 'path';
import AdmZip from 'adm-zip';
import pkgDeb from 'pkg-deb';
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
export const zipPath = (outputDir: string, platform: string, version: string): string => {
  if (platform === Platform.Linux) {
    return path.join(outputDir, `mongosh-${version}-${platform}.tgz`);
  } else if (platform === Platform.Debian) {
    // debian packages are required to be separated by _ and have arch in the
    // name: https://www.debian.org/doc/manuals/debian-faq/pkg-basics.en.html
    // sometimes there is also revision number, but we can add that later.
    return path.join(outputDir, `mongosh_${version}_amd64.deb`);
  } else {
    return path.join(outputDir, `mongosh-${version}-${platform}.zip`);
  }
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

export const zipDebian = async(input: string, outputDir: string, version: string, rootDir: string): Promise<void> => {
  const options = {
    version: version,
    name: 'mongosh',
    dest: outputDir,
    src: rootDir, // pkg-deb will look for package.json in src to get info
    input: input,
    arch: 'amd64'
  }

  console.log('Writing debian package')
  await pkgDeb(options)
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
  version: string,
  rootDir: string
): Promise<ZipFile> {
  const filename = zipPath(outputDir, platform, version);

  console.info('mongosh: zipping:', filename);

  if (platform === Platform.Linux) {
    await zipPosix(outputDir, filename);

    return {
      path: filename,
      contentType: 'application/gzip'
    };
  } else if (platform === Platform.Debian) {
    await zipDebian(input, outputDir, version, rootDir);

    return {
      path: filename,
      // this might have to be application/gzip MIME type
      contentType: 'application/vnd.debian.binary-package'
    }
  }

  zipWindows(input, filename);

  return {
    path: filename,
    contentType: 'application/zip'
  };
}
