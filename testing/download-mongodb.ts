import fetch from 'node-fetch';
import semver from 'semver';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import download from 'download';
import zlib from 'zlib';
import getDownloadURL from 'mongodb-download-url';
const gunzip = promisify(zlib.gunzip);
const gzip = promisify(zlib.gzip);

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
// TODO: upstream all of this into mongodb-download-url :(
async function lookupDownloadUrl(versionInfo: VersionInfo): Promise<string> {
  const knownDistroRegex = /^(?<name>rhel80|debian10)/;
  const { version } = versionInfo;
  const distroId = process.env.DISTRO_ID || '';
  if ((process.platform === 'win32' && semver.lt(version, '4.4.0')) ||
      (process.platform === 'linux' && semver.lt(version, '4.2.0')) ||
      (process.platform !== 'win32' && !knownDistroRegex.test(distroId))) {
    return (await promisify(getDownloadURL)({ version })).url;
  }

  let downloadInfo: DownloadInfo;
  if (process.platform === 'win32') {
    downloadInfo = versionInfo.downloads
      .find((downloadInfo: DownloadInfo) =>
        downloadInfo.target === 'windows' && downloadInfo.edition === 'base') as DownloadInfo;
  } else {
    const distro = distroId.match(knownDistroRegex)!.groups!.name;
    downloadInfo = versionInfo.downloads
      .find((downloadInfo: DownloadInfo) =>
        downloadInfo.target === distro && downloadInfo.edition === 'targeted') as DownloadInfo;
  }
  return downloadInfo.archive.url;
}

// Based on https://github.com/mongodb-labs/drivers-evergreen-tools/blob/master/.evergreen/download-mongodb.sh.
async function lookupAlphaDownloadUrl(): Promise<string> {
  switch (process.platform) {
    case 'darwin':
      return 'http://downloads.10gen.com/osx/mongodb-macos-x86_64-enterprise-latest.tgz';
    case 'linux':
      return 'http://downloads.10gen.com/linux/mongodb-linux-x86_64-enterprise-ubuntu1804-latest.tgz';
    case 'win32':
      return 'http://downloads.10gen.com/windows/mongodb-windows-x86_64-enterprise-latest.zip';
    default:
      throw new Error('Don’t know where to download the latest server build from');
  }
}

// Download mongod + mongos and return the path to a directory containing them.
export async function downloadMongoDb(targetVersionSemverSpecifier = '*'): Promise<string> {
  if (targetVersionSemverSpecifier === 'latest-alpha') {
    return await doDownload('latest-alpha', () => lookupAlphaDownloadUrl());
  }

  let fullJson: FullJSON;
  const fullJSONCachePath = path.resolve(__dirname, '..', 'tmp', 'full.json.gz');
  try {
    fullJson = JSON.parse((await gunzip(await fs.readFile(fullJSONCachePath))).toString());
  } catch {
    const resp = await fetch('https://downloads.mongodb.org/full.json');
    fullJson = await resp.json();
    await fs.writeFile(fullJSONCachePath, await gzip(JSON.stringify(fullJson)));
  }
  const productionVersions = fullJson.versions
    .filter((info: VersionInfo) => info.production_release)
    .filter((info: VersionInfo) => semver.satisfies(info.version, targetVersionSemverSpecifier))
    .sort((a: VersionInfo, b: VersionInfo) => semver.rcompare(a.version, b.version));
  const versionInfo: VersionInfo = productionVersions[0];
  return await doDownload(versionInfo.version, () => lookupDownloadUrl(versionInfo));
}

const downloadPromises: Record<string, Promise<string>> = {};
async function doDownload(version: string, lookupDownloadUrl: () => Promise<string>) {
  const downloadTarget = path.resolve(
    __dirname,
    '..',
    'tmp',
    `mongodb-${process.platform}-${process.env.DISTRO_ID || 'none'}-${process.arch}-${version}`);
  return downloadPromises[downloadTarget] ??= (async() => {
    const bindir = path.resolve(downloadTarget, 'bin');
    try {
      await fs.stat(bindir);
      console.info(`Skipping download because ${downloadTarget} exists`);
      return bindir;
    } catch {}

    await fs.mkdir(downloadTarget, { recursive: true });
    const downloadInfo = await lookupDownloadUrl();
    console.info('Downloading...', downloadInfo);
    await download(downloadInfo, downloadTarget, { extract: true, strip: 1 });

    await fs.stat(bindir); // Make sure it exists.
    return bindir;
  })();
}
