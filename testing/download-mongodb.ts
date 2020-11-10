import fetch from 'node-fetch';
import semver from 'semver';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import download from 'download';
import getDownloadURL from 'mongodb-download-url';

type ArchiveBaseInfo = {
  sha1: string;
  sh256: string;
  url: string;
};

type DownloadInfo = {
  edition: 'enterprise' | 'targeted' | 'base' | 'source' | 'subscription';
  target?: string;
  arch?: string;

  archive: {
    debug_symbols: string;
  } & ArchiveBaseInfo;

  cryptd?: ArchiveBaseInfo;
  shell?: ArchiveBaseInfo;
  packages?: string[];
  msi?: string;
};

type VersionInfo = {
  changes: string;
  notes: string;
  date: string;
  githash: string;

  continuous_release: boolean;
  current: boolean;
  development_release: boolean;
  lts_release: boolean;
  production_release: boolean;
  release_candidate: boolean;
  version: string;

  downloads: DownloadInfo[];
};

type FullJSON = {
  versions: VersionInfo[];
};

// Lookup the download URL for a given mongod version and the currently running
// operating system.
// On Windows, mongodb-download-url does not result in valid URLs for all cases.
// On Linux, getting the exact download variant to pick is hard, so we still
// use mongodb-download-url for that. For macOS, either would probably be fine.
async function lookupDownloadUrl(versionInfo: VersionInfo): Promise<string> {
  if (process.platform !== 'win32') {
    return (await promisify(getDownloadURL)({ version: versionInfo.version })).url;
  }

  const downloadInfo: DownloadInfo = versionInfo.downloads
    .find((downloadInfo: DownloadInfo) =>
      downloadInfo.target === 'windows' && downloadInfo.edition === 'base') as DownloadInfo;
  return downloadInfo.archive.url;
}

// Download mongod + mongos and return the path to a directory containing them.
export async function downloadMongoDb() {
  const resp = await fetch('https://downloads.mongodb.org/full.json');
  const json: FullJSON = await resp.json();
  const productionVersions = json.versions
    .filter((version: VersionInfo) => version.production_release)
    .sort((a: VersionInfo, b: VersionInfo) => semver.rcompare(a.version, b.version));
  const versionInfo: VersionInfo = productionVersions[0];

  const downloadTarget = path.resolve(
    __dirname,
    '..',
    'tmp',
    `mongodb-${process.platform}-${process.arch}-${versionInfo.version}`);
  const bindir = path.resolve(downloadTarget, 'bin');
  try {
    await fs.stat(bindir);
    return bindir;
  } catch {}

  await fs.mkdir(downloadTarget, { recursive: true });
  const downloadInfo = await lookupDownloadUrl(versionInfo);
  console.info('Downloading...', downloadInfo);
  await download(downloadInfo, downloadTarget, { extract: true, strip: 1 });

  await fs.stat(bindir); // Make sure it exists.
  return bindir;
}
