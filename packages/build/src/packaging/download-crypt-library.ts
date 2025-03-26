/* istanbul ignore file */
import path from 'path';
import { promises as fs, constants as fsConstants } from 'fs';
import type { DownloadOptions } from '@mongodb-js/mongodb-downloader';
import { downloadMongoDbWithVersionInfo } from '@mongodb-js/mongodb-downloader';
import type { PackageVariant } from '../config';
import { getDistro, getArch } from '../config';

export async function downloadCryptLibrary(
  variant: PackageVariant | 'host'
): Promise<{ cryptLibrary: string; version: string }> {
  let opts: DownloadOptions = {};
  opts.arch = variant === 'host' ? undefined : getArch(variant);
  opts = {
    ...opts,
    ...(variant === 'host' ? undefined : lookupReleaseDistro(variant)),
  };
  opts.enterprise = true;
  opts.crypt_shared = true;
  console.info(
    'mongosh: downloading latest crypt shared library for inclusion in package:',
    JSON.stringify(opts)
  );

  const cryptTmpTargetDir = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    'tmp',
    'crypt-store',
    variant
  );
  // Download mongodb for latest server version, including rapid releases
  // (for the platforms that they exist for, i.e. for ppc64le/s390x only pick stable releases).
  let versionSpec = 'continuous';
  if (/ppc64|s390x/.test(opts.arch || process.arch)) {
    versionSpec = 'stable';
  }
  if ((opts.platform || process.platform) === 'darwin') {
    versionSpec = '8.0.5'; // TBD(SERVER-101020): Figure out at what point we use a later version.
  }
  const { downloadedBinDir: libdir, version } =
    await downloadMongoDbWithVersionInfo(cryptTmpTargetDir, versionSpec, opts);
  const cryptLibrary = path.join(
    libdir,
    (await fs.readdir(libdir)).find((filename) =>
      /^mongo_crypt_v1\.(so|dylib|dll)$/.exec(filename)
    ) as string
  );
  // Make sure that the binary exists and is readable.
  await fs.access(cryptLibrary, fsConstants.R_OK);
  console.info('mongosh: downloaded', cryptLibrary, 'version', version);
  return { cryptLibrary, version };
}

function lookupReleaseDistro(packageVariant: PackageVariant): {
  platform?: string;
  distro?: string;
} {
  switch (getDistro(packageVariant)) {
    case 'win32':
    case 'win32msi':
      return { platform: 'win32' };
    case 'darwin':
      return { platform: 'darwin' };
    default:
      break;
  }
  // Pick the variant with the lowest supported glibc version.
  switch (getArch(packageVariant)) {
    case 'ppc64le':
      return { platform: 'linux', distro: 'rhel81' };
    case 's390x':
      return { platform: 'linux', distro: 'rhel83' };
    case 'arm64':
    case 'x64':
      return { platform: 'linux', distro: 'rhel8' };
    default:
      break;
  }
  return {};
}
