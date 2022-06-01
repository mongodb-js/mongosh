/* istanbul ignore file */
import path from 'path';
import { promises as fs, constants as fsConstants } from 'fs';
import { downloadMongoDb, DownloadOptions } from '../download-mongodb';
import { PackageVariant, getDistro, getArch } from '../config';

export async function downloadCsfleLibrary(variant: PackageVariant | 'host'): Promise<string> {
  const opts: DownloadOptions = {};
  opts.arch = variant === 'host' ? undefined : getArch(variant);
  opts.distro = variant === 'host' ? undefined : lookupReleaseDistro(variant);
  opts.enterprise = true;
  opts.csfle = true;
  console.info('mongosh: downloading latest csfle shared library for inclusion in package:', JSON.stringify(opts));

  let libdir = '';
  const csfleTmpTargetDir = path.resolve(__dirname, '..', '..', '..', '..', 'tmp', 'csfle-store', variant);
  // Download mongodb for latest server version. Fall back to the 6.0.0-rcX
  // version if no stable version is available.
  let error: Error | undefined;
  for (const version of [ 'stable', '>= 6.0.0-rc5' ]) {
    try {
      libdir = await downloadMongoDb(csfleTmpTargetDir, version, opts);
      break;
    } catch (e: any) {
      error = e;
    }
  }
  if (!libdir) throw error;
  const csfleLibrary = path.join(
    libdir,
    (await fs.readdir(libdir)).find(filename => filename.match(/^mongo_csfle_v1\.(so|dylib|dll)$/)) as string
  );
  // Make sure that the binary exists and is readable.
  await fs.access(csfleLibrary, fsConstants.R_OK);
  console.info('mongosh: downloaded', csfleLibrary);
  return csfleLibrary;
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
      return 'rhel83';
    case 'arm64':
      return 'amazon2';
    case 'x64':
      return 'rhel70';
    default:
      break;
  }
  return '';
}
