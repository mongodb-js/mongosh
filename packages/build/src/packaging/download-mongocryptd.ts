/* istanbul ignore file */
import path from 'path';
import { promises as fs, constants as fsConstants } from 'fs';
import { downloadMongoDb, DownloadOptions } from '../download-mongodb';
import { BuildVariant, getDistro, getArch } from '../config';

export async function downloadMongocrypt(variant: BuildVariant): Promise<string> {
  const opts: DownloadOptions = {};
  opts.arch = getArch(variant);
  opts.distro = lookupReleaseDistro(variant);
  opts.enterprise = true;
  opts.cryptd = true;
  console.info('mongosh: downloading latest mongocryptd for inclusion in package:', JSON.stringify(opts));

  const bindir = await downloadMongoDb(
    path.resolve(__dirname, '..', '..', '..', '..', 'tmp', 'mongocryptd-store', variant),
    '*',
    opts); // Download mongodb for latest server version.
  let mongocryptd = path.join(bindir, 'mongocryptd');
  if (opts.distro === 'win32') {
    mongocryptd += '.exe';
  }
  // Make sure that the binary exists and is executable.
  await fs.access(mongocryptd, fsConstants.X_OK);
  console.info('mongosh: downloaded', mongocryptd);
  return mongocryptd;
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
