/* istanbul ignore file */
import path from 'path';
import { promises as fs, constants as fsConstants } from 'fs';
import { downloadMongoDb, DownloadOptions } from '../download-mongodb';
import { PackageVariant, getDistro, getArch } from '../config';

export async function downloadCryptLibrary(variant: PackageVariant | 'host'): Promise<string> {
  const opts: DownloadOptions = {};
  opts.arch = variant === 'host' ? undefined : getArch(variant);
  opts.distro = variant === 'host' ? undefined : lookupReleaseDistro(variant);
  opts.enterprise = true;
  opts.crypt_shared = true;
  console.info('mongosh: downloading latest crypt shared library for inclusion in package:', JSON.stringify(opts));

  const cryptTmpTargetDir = path.resolve(__dirname, '..', '..', '..', '..', 'tmp', 'crypt-store', variant);
  // Download mongodb for latest server version, including rapid releases
  // (for the platforms that they exist for, i.e. for ppc64le/s390x only pick stable releases).
  const versionSpec = (opts.arch || process.arch).match(/ppc64|s390x/)
    ? 'stable' : 'continuous';
  const libdir = await downloadMongoDb(cryptTmpTargetDir, versionSpec, opts);
  const cryptLibrary = path.join(
    libdir,
    (await fs.readdir(libdir)).find(filename => filename.match(/^mongo_crypt_v1\.(so|dylib|dll)$/)) as string
  );
  // Make sure that the binary exists and is readable.
  await fs.access(cryptLibrary, fsConstants.R_OK);
  console.info('mongosh: downloaded', cryptLibrary);
  return cryptLibrary;
}

function lookupReleaseDistro(packageVariant: PackageVariant): string {
  switch (getDistro(packageVariant)) {
    case 'win32':
    case 'win32msi':
      return 'win32';
    case 'darwin':
      return 'darwin';
    default: break;
  }
  // Pick the variant with the lowest supported glibc version.
  switch (getArch(packageVariant)) {
    case 'ppc64le':
      return 'rhel81';
    case 's390x':
      return 'rhel72';
    case 'arm64':
      return 'amazon2';
    case 'x64':
      return 'rhel70';
    default:
      break;
  }
  return '';
}
