/* eslint-disable no-return-assign, no-empty */
/* istanbul ignore file */
import { promises as fs } from 'fs';
import path from 'path';
import download from 'download';
import getDownloadURL from 'mongodb-download-url';

// Download mongod + mongos and return the path to a directory containing them.
export async function downloadMongoDb(tmpdir: string, targetVersionSemverSpecifier = '*'): Promise<string> {
  let wantsEnterprise = true;
  async function lookupDownloadUrl(): Promise<string> {
    return (await getDownloadURL({
      version: targetVersionSemverSpecifier,
      enterprise: wantsEnterprise
    })).url;
  }

  await fs.mkdir(tmpdir, { recursive: true });
  if (targetVersionSemverSpecifier === 'latest-alpha') {
    return await doDownload(tmpdir, 'latest-alpha', lookupDownloadUrl);
  }

  if (/-community$/.test(targetVersionSemverSpecifier)) {
    wantsEnterprise = false;
    targetVersionSemverSpecifier = targetVersionSemverSpecifier.replace(/-community$/, '');
  }

  return await doDownload(
    tmpdir,
    targetVersionSemverSpecifier + (wantsEnterprise ? '-enterprise' : '-community'),
    () => lookupDownloadUrl());
}

const downloadPromises: Record<string, Promise<string>> = {};
async function doDownload(tmpdir: string, version: string, lookupDownloadUrl: () => Promise<string>) {
  const downloadTarget = path.resolve(
    tmpdir,
    `mongodb-${process.platform}-${process.env.DISTRO_ID || 'none'}-${process.arch}-${version}`
      .replace(/[^a-zA-Z0-9_-]/g, ''));
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
