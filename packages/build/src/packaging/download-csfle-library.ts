/* istanbul ignore file */
import path from 'path';
import { promises as fs, constants as fsConstants } from 'fs';
import { downloadMongoDb, DownloadOptions } from '../download-mongodb';
import { BuildVariant, getDistro, getArch } from '../config';

export async function downloadCsfleLibrary(variant: BuildVariant | 'host'): Promise<string> {
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

// eslint-disable-next-line complexity
function lookupReleaseDistro(variant: BuildVariant): string {
  switch (getArch(variant)) {
    case 'ppc64le':
      return 'rhel81';
    case 's390x':
      return 'rhel72'; // TODO: switch to rhel80 once available
    default:
      break;
  }
  switch (getDistro(variant)) {
    case 'win32':
    case 'win32msi':
      return 'win32';
    case 'darwin':
      return 'darwin';
    case 'linux':
    case 'debian':
      return 'debian92';
    case 'suse':
      return 'suse12';
    case 'amzn1':
      return 'amazon';
    case 'amzn2':
      return 'amazon2';
    case 'rhel7':
      return 'rhel70';
    case 'rhel8':
      switch (getArch(variant)) {
        case 'x64':
          return 'rhel80';
        case 'arm64':
          return 'rhel82';
        default:
          break;
      }
      break;
    default:
      break;
  }
  return '';
}
