/* istanbul ignore file */
import path from 'path';
import { promises as fs, constants as fsConstants } from 'fs';
import type { DownloadOptions } from '@mongodb-js/mongodb-downloader';
import { downloadMongoDbWithVersionInfo } from '@mongodb-js/mongodb-downloader';
import type { PackageVariant } from '../config';
import { getDistro, getArch } from '../config';

export async function downloadCryptLibrary(
  variant: PackageVariant | 'host',
  versionSpec = ''
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

  if (!versionSpec) {
    // A 9.0 library is required to analyze the GA Queryable Encryption query
    // type names. Switch back to 'continuous' and drop the overrides below once
    // 9.0 is GA and lands in the default feed.
    versionSpec = '9.0.0-rc1';

    // Release candidates past rc0 only exist in cloud.json, and the version list
    // cache is keyed by cache path rather than by feed URL, so a list already
    // cached from the default feed would be reused and the candidate not found.
    opts.versionListUrl = 'https://downloads.mongodb.org/cloud.json';
    opts.cacheTimeMs = 0;
  }

  const { downloadedBinDir: libdir, version } =
    await downloadMongoDbWithVersionInfo({
      directory: cryptTmpTargetDir,
      version: versionSpec,
      downloadOptions: opts,
      useLockfile: false,
    });
  const cryptLibrary = path.join(
    libdir,
    (await fs.readdir(libdir)).find((filename) =>
      /^mongo_crypt_v1\.(so|dylib|dll)$/.exec(filename)
    ) as string
  );
  // Make sure that the binary exists and is readable.
  await fs.access(cryptLibrary, fsConstants.R_OK);
  console.info(
    `mongosh: downloaded ${cryptLibrary} version ${version} (requested: ${versionSpec})`
  );
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
