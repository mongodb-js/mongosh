/* eslint-disable no-return-assign, no-empty */
/* istanbul ignore file */
import fetch from 'node-fetch';
import tar from 'tar';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import download from 'download';
import { pipeline } from 'stream';
import getDownloadURL from 'mongodb-download-url';
import type { Options as DownloadOptions } from 'mongodb-download-url';

export type { DownloadOptions };

// Download mongod + mongos and return the path to a directory containing them.
export async function downloadMongoDb(tmpdir: string, targetVersionSemverSpecifier = '*', options: DownloadOptions = {}): Promise<string> {
  let wantsEnterprise = options.enterprise ?? true;
  async function lookupDownloadUrl(): Promise<string> {
    return (await getDownloadURL({
      version: targetVersionSemverSpecifier,
      enterprise: wantsEnterprise,
      ...options
    })).url;
  }

  await fs.mkdir(tmpdir, { recursive: true });
  if (targetVersionSemverSpecifier === 'latest-alpha') {
    return await doDownload(tmpdir, !!options.crypt_shared, 'latest-alpha', lookupDownloadUrl);
  }

  if (/-community$/.test(targetVersionSemverSpecifier)) {
    wantsEnterprise = false;
    targetVersionSemverSpecifier = targetVersionSemverSpecifier.replace(/-community$/, '');
  }

  return await doDownload(
    tmpdir,
    !!options.crypt_shared,
    targetVersionSemverSpecifier + (wantsEnterprise ? '-enterprise' : '-community'),
    () => lookupDownloadUrl());
}

const downloadPromises: Record<string, Promise<string>> = {};
async function doDownload(
  tmpdir: string,
  isCryptLibrary: boolean,
  version: string,
  lookupDownloadUrl: () => Promise<string>) {
  const downloadTarget = path.resolve(
    tmpdir,
    `mongodb-${process.platform}-${process.env.DISTRO_ID || 'none'}-${process.arch}-${version}`
      .replace(/[^a-zA-Z0-9_-]/g, ''));
  return downloadPromises[downloadTarget] ??= (async() => {
    const bindir = path.resolve(
      downloadTarget,
      isCryptLibrary && process.platform !== 'win32' ? 'lib' : 'bin');
    try {
      await fs.stat(bindir);
      console.info(`Skipping download because ${downloadTarget} exists`);
      return bindir;
    } catch {}

    await fs.mkdir(downloadTarget, { recursive: true });
    const url = await lookupDownloadUrl();
    console.info('Downloading...', url);

    async function downloadAndExtract(withExtraStripDepth = 0): Promise<void> {
      if (url.match(/\.tgz$|\.tar(\.[^.]+)?$/)) {
        // the server's tarballs can contain hard links, which the (unmaintained?)
        // `download` package is unable to handle (https://github.com/kevva/decompress/issues/93)
        const response = await fetch(url);
        await promisify(pipeline)(
          response.body,
          tar.x({ cwd: downloadTarget, strip: isCryptLibrary ? 0 : 1 })
        );
      } else {
        await download(url, downloadTarget, { extract: true, strip: isCryptLibrary ? 0 : 1 });
      }

      try {
        await fs.stat(bindir); // Make sure it exists.
      } catch (err) {
        if (withExtraStripDepth === 0 && url.includes('macos')) {
          // The server team changed how macos release artifacts are packed
          // and added a `./` prefix to paths in the tarball,
          // which seems like it shouldn't change anything but does
          // in fact require an increased path strip depth.
          console.info('Retry due to miscalculated --strip-components depth');
          return await downloadAndExtract(1);
        }
        throw err;
      }
    }

    await downloadAndExtract();
    return bindir;
  })();
}
