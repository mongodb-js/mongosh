import tar from 'tar';
import path from 'path';
import AdmZip from 'adm-zip';
import pkgDeb from 'pkg-deb';
import BuildVariant from './build-variant';

/**
 * Get the path to the tarball.
 *
 * @param {string} outputDir - The output directory.
 * @param {string} platform - The platform.
 * @param {string} version - The version.
 *
 * @returns {string} The path.
 */
export const tarballPath = (outputDir: string, platform: string, version: string): string => {
  if (platform === BuildVariant.Linux) {
    return path.join(outputDir, `mongosh-${version}-${platform}.tgz`);
  } else if (platform === BuildVariant.Debian) {
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
 * Create a tarball archive for posix.
 *
 * @param {string} outputDir - The output directory.
 * @param {string} filename - the tarball filename.
 */
export const tarballPosix = async(outputDir: string, filename: string): Promise<void> => {
  const options = { gtarball: true, file: filename, cwd: outputDir, filter: filterOut };
  await tar.c(options, [ '.' ]);
};

export const tarballDebian = async(
  input: string,
  outputDir: string,
  version: string,
  rootDir: string
): Promise<void> => {
  const options = {
    version: version,
    name: 'mongosh',
    dest: outputDir,
    src: rootDir, // pkg-deb will look for package.json in src to get info
    input: input,
    // for debugging pkgDeb, uncomment the next line:
    // loggger: console.log,
    arch: 'amd64'
  }

  console.log('Writing debian package')
  await pkgDeb(options)
}

/**
 * Create a tarball archive for windows.
 *
 * @param {string} input - The file to tarball.
 * @param {string} filename - the tarball filename.
 */
export const tarballWindows = (input: string, filename: string): void => {
  const admZip = new AdmZip();
  admZip.addLocalFile(input);
  admZip.writeZip(filename);
};

export type TarballFile = { path: string; contentType: string };

/**
 * Create a gtarballped tarball or zip for the provided options.
 *
 * @param {string} input - The file location to tarball.
 * @param {string} outputDir - Where to save the tarball.
 * @param {string} buildVariant- The build variant.
 * @param {string} version - The version.
 *
 * @returns {TarballFile} The path and type of the tarball.
 */
export async function tarball(
  input: string,
  outputDir: string,
  buildVariant: string,
  version: string,
  rootDir: string
): Promise<TarballFile> {
  const filename = tarballPath(outputDir, buildVariant, version);

  console.info('mongosh: tarballping:', filename);

  if (buildVariant === BuildVariant.Linux) {
    await tarballPosix(outputDir, filename);

    return {
      path: filename,
      contentType: 'application/gzip'
    };
  } else if (buildVariant === BuildVariant.Debian) {
    await tarballDebian(input, outputDir, version, rootDir);

    return {
      path: filename,
      // this might have to be application/gtarball MIME type
      contentType: 'application/vnd.debian.binary-package'
    }
  } else {
    tarballWindows(input, filename);

    return {
      path: filename,
      contentType: 'application/zip'
    };
  }
}
