import {
  DownloadCenter as DownloadCenterCls,
  validateConfigSchema,
} from '@mongodb-js/dl-center';
import { major as majorVersion } from 'semver';
import type {
  DownloadCenterConfig,
  PlatformWithPackages,
} from '@mongodb-js/dl-center/dist/download-center-config';
import {
  ARTIFACTS_BUCKET,
  ARTIFACTS_FOLDER,
  ARTIFACTS_URL_PUBLIC_BASE,
  CONFIGURATION_KEY,
  CONFIGURATIONS_BUCKET,
  ARTIFACTS_FALLBACK,
} from './constants';
import type { PackageVariant } from '../config';
import {
  ALL_PACKAGE_VARIANTS,
  getDownloadCenterDistroDescription,
  getArch,
  getDistro,
  getServerLikeArchName,
  getServerLikeTargetList,
  getDownloadCenterPackageType,
} from '../config';
import type { PackageInformationProvider } from '../packaging';
import { getPackageFile } from '../packaging';
import { promises as fs } from 'fs';
import { createHash } from 'crypto';
import { once } from 'events';
import fetch from 'node-fetch';
import path from 'path';
import { promisify } from 'util';
import semver from 'semver';

const delay = promisify(setTimeout);

export async function createAndPublishDownloadCenterConfig(
  packageInformation: PackageInformationProvider,
  awsAccessKeyId: string,
  awsSecretAccessKey: string,
  injectedJsonFeedFile: string,
  isDryRun: boolean,
  DownloadCenter: typeof DownloadCenterCls = DownloadCenterCls,
  publicArtifactBaseUrl: string = ARTIFACTS_URL_PUBLIC_BASE
): Promise<void> {
  const dlcenter = new DownloadCenter({
    bucket: CONFIGURATIONS_BUCKET,
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
  });
  let existingDownloadCenterConfig: DownloadCenterConfig | undefined;
  try {
    existingDownloadCenterConfig = await dlcenter.downloadConfig(
      CONFIGURATION_KEY
    );
  } catch (err: any) {
    console.warn('Failed to get existing download center config', err);
    if (err?.code !== 'NoSuchKey') {
      throw err;
    } else {
      existingDownloadCenterConfig = { ...ARTIFACTS_FALLBACK };
    }
  }

  const getVersionConfig = () =>
    createVersionConfig(packageInformation, publicArtifactBaseUrl);
  const config = existingDownloadCenterConfig
    ? getUpdatedDownloadCenterConfig(
        existingDownloadCenterConfig,
        getVersionConfig
      )
    : createDownloadCenterConfig(getVersionConfig);

  console.warn('Created download center config:');
  console.dir(config, { depth: Infinity });

  validateConfigSchema(config);

  const dlcenterArtifacts = new DownloadCenter({
    bucket: ARTIFACTS_BUCKET,
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
  });
  const jsonFeedArtifactkey = `${ARTIFACTS_FOLDER}/mongosh.json`;
  let existingJsonFeedText;
  try {
    existingJsonFeedText = await dlcenterArtifacts.downloadAsset(
      jsonFeedArtifactkey
    );
  } catch (err: any) {
    console.warn('Failed to get existing JSON feed text', err);
    if (err?.code !== 'NoSuchKey') throw err;
  }

  const existingJsonFeed: JsonFeed | undefined = existingJsonFeedText
    ? JSON.parse(existingJsonFeedText.toString())
    : undefined;
  const injectedJsonFeed: JsonFeed | undefined = injectedJsonFeedFile
    ? JSON.parse(await fs.readFile(injectedJsonFeedFile, 'utf8'))
    : undefined;
  const currentJsonFeedEntry = await createJsonFeedEntry(
    packageInformation,
    publicArtifactBaseUrl
  );
  const currentJsonFeedWrapped = {
    versions: [currentJsonFeedEntry],
  };
  console.warn('Adding new JSON feed entry:');
  console.dir(currentJsonFeedEntry, { depth: Infinity });

  const newJsonFeed = mergeFeeds(
    existingJsonFeed,
    injectedJsonFeed,
    currentJsonFeedWrapped
  );

  if (isDryRun) {
    console.warn('Not uploading download center config in dry-run mode');
    return;
  }

  await Promise.all([
    dlcenter.uploadConfig(CONFIGURATION_KEY, config),
    dlcenterArtifacts.uploadAsset(
      jsonFeedArtifactkey,
      JSON.stringify(newJsonFeed, null, 2)
    ),
  ]);
}

export function getUpdatedDownloadCenterConfig(
  downloadedConfig: DownloadCenterConfig,
  getVersionConfig: () => ReturnType<typeof createVersionConfig>
): DownloadCenterConfig {
  const versionConfig = getVersionConfig();
  const toBeReleasedVersion = versionConfig.version;
  const currentVersions = [...downloadedConfig.versions];
  const matchingMajorVersionIdx = currentVersions.findIndex(({ version }) => {
    return majorVersion(toBeReleasedVersion) === majorVersion(version);
  });

  if (matchingMajorVersionIdx === -1) {
    currentVersions.push(versionConfig);
  } else {
    currentVersions[matchingMajorVersionIdx] = versionConfig;
  }

  currentVersions.sort((a, b) => semver.rcompare(a.version, b.version));

  return {
    ...downloadedConfig,
    versions: currentVersions,
    release_notes_link: `https://github.com/mongodb-js/mongosh/releases/tag/v${versionConfig.version}`,
  };
}

export function createDownloadCenterConfig(
  getVersionConfig: () => ReturnType<typeof createVersionConfig>
): DownloadCenterConfig {
  const versionConfig = getVersionConfig();
  return {
    versions: [versionConfig],
    manual_link: 'https://docs.mongodb.org/manual/products/mongosh',
    release_notes_link: `https://github.com/mongodb-js/mongosh/releases/tag/v${versionConfig.version}`,
    previous_releases_link: '',
    development_releases_link: '',
    supported_browsers_link: '',
    tutorial_link: 'test',
  };
}

export function createVersionConfig(
  packageInformation: PackageInformationProvider,
  publicArtifactBaseUrl: string = ARTIFACTS_URL_PUBLIC_BASE
) {
  const { version } = packageInformation('linux-x64').metadata;
  const platformMap: Map<string, PlatformWithPackages> = new Map();

  for (const packageVariant of ALL_PACKAGE_VARIANTS) {
    const platformName = getDownloadCenterDistroDescription(packageVariant);
    const currentPlatform = platformMap.get(platformName) || {
      arch: getArch(packageVariant),
      os: getDownloadCenterDistroDescription(packageVariant),
      packages: { links: [] },
    };

    currentPlatform.packages.links.push({
      name: getDownloadCenterPackageType(packageVariant),
      download_link:
        publicArtifactBaseUrl +
        getPackageFile(packageVariant, packageInformation).path,
    });

    platformMap.set(platformName, currentPlatform);
  }

  return {
    _id: version,
    version: version,
    platform: [...platformMap.values()],
  };
}

interface JsonFeed {
  versions: JsonFeedVersionEntry[];
}

interface JsonFeedVersionEntry {
  version: string;
  downloads: JsonFeedDownloadEntry[];
}

interface JsonFeedDownloadEntry {
  arch: string;
  distro: string;
  targets: string[];
  sharedOpenssl: string | undefined;
  archive: {
    type: string;
    url: string;
    sha256: string;
    sha1: string;
  };
}

export async function createJsonFeedEntry(
  packageInformation: PackageInformationProvider,
  publicArtifactBaseUrl: string
): Promise<JsonFeedVersionEntry> {
  const { version } = packageInformation('linux-x64').metadata;
  return {
    version: version,
    downloads: await Promise.all(
      ALL_PACKAGE_VARIANTS.map(async (packageVariant: PackageVariant) => {
        const arch = getArch(packageVariant);
        const distro = getDistro(packageVariant);
        const filename = getPackageFile(
          packageVariant,
          packageInformation
        ).path;
        const url = publicArtifactBaseUrl + filename;
        const { sha1, sha256 } = await getHashes(url);

        return {
          arch: getServerLikeArchName(arch),
          distro: distro,
          targets: getServerLikeTargetList(packageVariant),
          sharedOpenssl: url.includes('-openssl11')
            ? 'openssl11'
            : filename.includes('-openssl3')
            ? 'openssl3'
            : undefined,
          archive: {
            type: path.extname(filename).replace(/^\./, ''),
            url: url,
            sha256: sha256,
            sha1: sha1,
          },
        };
      })
    ),
  };
}

function mergeFeeds(...args: (JsonFeed | undefined)[]): JsonFeed {
  const newFeed: JsonFeed = {
    versions: [],
  };
  for (const feed of args) {
    for (const version of feed?.versions ?? []) {
      const index = newFeed.versions.findIndex(
        (v) => v.version === version.version
      );
      if (index === -1) newFeed.versions.unshift(version);
      else newFeed.versions.splice(index, 1, version);
    }
  }
  newFeed.versions.sort((a, b) => semver.rcompare(a.version, b.version));
  return newFeed;
}

async function getHashes(
  url: string,
  retriesLeft = 5
): Promise<{ sha1: string; sha256: string }> {
  if (new URL(url).protocol === 'skip:') return { sha1: '', sha256: '' }; // for testing only
  let is4xxError = false;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      is4xxError ||= response.status >= 400 && response.status < 500;
      throw new Error(`unexpected response ${response.statusText} for ${url}`);
    }
    const sha256 = createHash('sha256');
    const sha1 = createHash('sha1');
    response.body.pipe(sha256);
    response.body.pipe(sha1);
    await Promise.all([once(sha1, 'finish'), once(sha256, 'finish')]);
    return { sha1: sha1.digest('hex'), sha256: sha256.digest('hex') };
  } catch (err) {
    if (is4xxError || retriesLeft === 0) throw err;
    console.error(
      'Got error',
      err,
      'while trying to hash file',
      url,
      ', retrying...'
    );
    await delay(5000);
    return await getHashes(url, retriesLeft - 1);
  }
}
