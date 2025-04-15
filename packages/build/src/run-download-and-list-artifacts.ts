import { createWriteStream, promises as fs } from 'fs';
import path from 'path';
import type { Config, PackageVariant } from './config';
import { ALL_PACKAGE_VARIANTS } from './config';
import { getPackageFile } from './packaging';
import { ARTIFACTS_URL_PUBLIC_BASE } from './download-center/constants';
import { createHash } from 'crypto';
import { once } from 'events';
import fetch from 'node-fetch';
import { promisify } from 'util';
const delay = promisify(setTimeout);

export const hashListFiles = [
  { filename: 'SHASUMS1.txt', hash: 'sha1' },
  { filename: 'SHASUMS256.txt', hash: 'sha256' },
] as const;

export async function runDownloadAndListArtifacts(
  config: Config,
  publicArtifactBaseUrl: string = ARTIFACTS_URL_PUBLIC_BASE,
  hashFileWriteMode: 'normal' | 'append-to-hash-file-for-testing' = 'normal'
): Promise<void> {
  const requiredConfigKeys: (keyof Config)[] = ['outputDir'];
  for (const key of requiredConfigKeys) {
    if (typeof config[key] !== 'string') {
      throw new Error(`Missing build config key: ${key}`);
    }
  }

  const packageInformation =
    config.packageInformation as Required<Config>['packageInformation'];

  await fs.mkdir(config.outputDir, { recursive: true });
  const fileList = await Promise.all(
    ALL_PACKAGE_VARIANTS.map(async (packageVariant: PackageVariant) => {
      const packageFilename = getPackageFile(
        packageVariant,
        packageInformation
      ).path;
      for (const [filename, required] of [
        [packageFilename, true],
        [packageFilename + '.sig', false],
      ] as const) {
        const url = publicArtifactBaseUrl + filename;
        const filepath = path.join(config.outputDir, filename);
        try {
          const { sha1, sha256 } = await downloadAndGetHashes(filepath, url);
          console.log('downloaded', filepath);

          return {
            filename,
            sha256,
            sha1,
          };
        } catch (err) {
          if (required) throw err;
        }
      }
      return undefined;
    })
  );

  for (const { filename, hash } of hashListFiles) {
    const filepath = path.join(config.outputDir, filename);
    const contents =
      fileList
        .filter(Boolean)
        .map((file) => `${file?.filename}  ${file?.[hash]}`)
        .join('\n') + '\n';
    await (hashFileWriteMode === 'normal' ? fs.writeFile : fs.appendFile)(
      filepath,
      contents
    );
    console.log('wrote hash list to', filepath);
  }
}

async function downloadAndGetHashes(
  filepath: string,
  url: string,
  retriesLeft = 5
): Promise<{ sha1: string; sha256: string }> {
  if (new URL(url).protocol === 'skip:') return { sha1: '', sha256: '' }; // for testing only
  let is4xxError = false;
  try {
    const outstream = createWriteStream(filepath);
    await once(outstream, 'open');
    const response = await fetch(url);
    if (!response.ok || !response.body) {
      is4xxError ||= response.status >= 400 && response.status < 500;
      throw new Error(`unexpected response ${response.statusText} for ${url}`);
    }
    const sha256 = createHash('sha256');
    const sha1 = createHash('sha1');
    response.body.pipe(sha256);
    response.body.pipe(sha1);
    response.body.pipe(outstream);
    await Promise.all([
      once(sha1, 'finish'),
      once(sha256, 'finish'),
      once(outstream, 'finish'),
    ]);
    return { sha1: sha1.digest('hex'), sha256: sha256.digest('hex') };
  } catch (err) {
    if (is4xxError || retriesLeft === 0) throw err;
    console.error(
      'Got error',
      err,
      'while trying to download and hash file',
      url,
      ', retrying...'
    );
    await delay(5000);
    return await downloadAndGetHashes(filepath, url, retriesLeft - 1);
  }
}
