/* istanbul ignore file */
import path from 'path';
import { promises as fs, constants as fsConstants } from 'fs';
import { downloadMongoDb, DownloadOptions } from '../download-mongodb';
import { BuildVariant, getDistro, getArch } from '../config';

export async function downloadCryptLibrary(variant: BuildVariant | 'host'): Promise<string> {
  const opts: DownloadOptions = {};
  opts.arch = variant === 'host' ? undefined : getArch(variant);
  opts.distro = variant === 'host' ? undefined : lookupReleaseDistro(variant);
  opts.enterprise = true;
  opts.crypt_shared = true;
  console.info('mongosh: downloading latest crypt shared library for inclusion in package:', JSON.stringify(opts));

  let libdir = '';
  const cryptTmpTargetDir = path.resolve(__dirname, '..', '..', '..', '..', 'tmp', 'crypt-store', variant);
  // Download mongodb for latest server version. Fall back to the 6.0.0-rcX
  // version if no stable version is available.
  let error: Error | undefined;
  for (const version of [ 'stable', '>= 6.0.0-rc5' ]) {
    try {
      libdir = await downloadMongoDb(cryptTmpTargetDir, version, opts);
      break;
    } catch (e: any) {
      error = e;
    }
  }
  if (!libdir) throw error;
  const cryptLibrary = path.join(
    libdir,
    (await fs.readdir(libdir)).find(filename => filename.match(/^mongo_crypt_v1\.(so|dylib|dll)$/)) as string
  );
  // Make sure that the binary exists and is readable.
  await fs.access(cryptLibrary, fsConstants.R_OK);
  console.info('mongosh: downloaded', cryptLibrary);
  return cryptLibrary;
}

function lookupReleaseDistro(variant: BuildVariant): string {
  switch (getDistro(variant)) {
    case 'win32':
    case 'win32msi':
      return 'win32';
    case 'darwin':
      return 'darwin';
    default: break;
  }
  switch (getArch(variant)) {
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
