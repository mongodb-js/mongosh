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
  JSON_FEED_ARTIFACT_KEY,
  ARTIFACTS_URL_PUBLIC_BASE,
  CONFIGURATION_KEY,
  CONFIGURATIONS_BUCKET,
  ARTIFACTS_FALLBACK,
} from './constants';
import type { CTAConfig, GreetingCTADetails, PackageVariant } from '../config';
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
import path from 'path';
import semver from 'semver';
import { hashListFiles } from '../run-download-and-list-artifacts';

async function getCurrentJsonFeed(
  dlcenterArtifacts: DownloadCenterCls
): Promise<JsonFeed | undefined> {
  let existingJsonFeedText;
  try {
    existingJsonFeedText = await dlcenterArtifacts.downloadAsset(
      JSON_FEED_ARTIFACT_KEY
    );
  } catch (err: any) {
    console.warn('Failed to get existing JSON feed text', err);
    if (err?.code !== 'NoSuchKey') throw err;
  }

  return existingJsonFeedText
    ? JSON.parse(existingJsonFeedText.toString())
    : undefined;
}

export async function createAndPublishDownloadCenterConfig(
  outputDir: string,
  packageInformation: PackageInformationProvider,
  awsAccessKeyIdConfig: string,
  awsSecretAccessKeyConfig: string,
  awsAccessKeyIdArtifacts: string,
  awsSecretAccessKeyArtifacts: string,
  awsSessionTokenArtifacts: string,
  injectedJsonFeedFile: string,
  isDryRun: boolean,
  ctaConfig: CTAConfig,
  DownloadCenterConfig: typeof DownloadCenterCls = DownloadCenterCls,
  DownloadCenterArtifacts: typeof DownloadCenterCls = DownloadCenterCls,
  publicArtifactBaseUrl: string = ARTIFACTS_URL_PUBLIC_BASE
): Promise<void> {
  const dlcenterConfig = new DownloadCenterConfig({
    bucket: CONFIGURATIONS_BUCKET,
    accessKeyId: awsAccessKeyIdConfig,
    secretAccessKey: awsSecretAccessKeyConfig,
  });
  let existingDownloadCenterConfig: DownloadCenterConfig | undefined;
  try {
    existingDownloadCenterConfig = await dlcenterConfig.downloadConfig(
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

  const dlcenterArtifacts = new DownloadCenterArtifacts({
    bucket: ARTIFACTS_BUCKET,
    accessKeyId: awsAccessKeyIdArtifacts,
    secretAccessKey: awsSecretAccessKeyArtifacts,
    sessionToken: awsSessionTokenArtifacts,
  });

  const existingJsonFeed = await getCurrentJsonFeed(dlcenterArtifacts);
  const injectedJsonFeed: JsonFeed | undefined = injectedJsonFeedFile
    ? JSON.parse(await fs.readFile(injectedJsonFeedFile, 'utf8'))
    : undefined;
  const currentJsonFeedEntry = await createJsonFeedEntry(
    outputDir,
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

  populateJsonFeedCTAs(newJsonFeed, ctaConfig);

  if (isDryRun) {
    console.warn('Not uploading download center config in dry-run mode');
    return;
  }

  await dlcenterConfig.uploadConfig(CONFIGURATION_KEY, config);

  await dlcenterArtifacts.uploadAsset(
    JSON_FEED_ARTIFACT_KEY,
    JSON.stringify(newJsonFeed, null, 2),
    {
      acl: 'private',
    }
  );
}

export async function updateJsonFeedCTA(
  config: CTAConfig,
  awsAccessKeyId: string,
  awsSecretAccessKey: string,
  awsSessionToken: string,
  isDryRun: boolean,
  DownloadCenter: typeof DownloadCenterCls = DownloadCenterCls
) {
  const dlcenterArtifacts = new DownloadCenter({
    bucket: ARTIFACTS_BUCKET,
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
    sessionToken: awsSessionToken,
  });

  const jsonFeed = await getCurrentJsonFeed(dlcenterArtifacts);
  if (!jsonFeed) {
    throw new Error('No existing JSON feed found');
  }

  populateJsonFeedCTAs(jsonFeed, config);

  const patchedJsonFeed = JSON.stringify(jsonFeed, null, 2);
  if (isDryRun) {
    console.warn('Not uploading JSON feed in dry-run mode');
    console.warn(`Patched JSON feed: ${patchedJsonFeed}`);
    return;
  }

  await dlcenterArtifacts.uploadAsset(JSON_FEED_ARTIFACT_KEY, patchedJsonFeed, {
    acl: 'private',
  });
}

function populateJsonFeedCTAs(jsonFeed: JsonFeed, ctas: CTAConfig) {
  jsonFeed.cta = ctas['*'];
  for (const version of jsonFeed.versions) {
    version.cta = ctas[version.version];
  }
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

export interface JsonFeed {
  versions: JsonFeedVersionEntry[];
  cta?: GreetingCTADetails;
}

interface JsonFeedVersionEntry {
  version: string;
  downloads: JsonFeedDownloadEntry[];
  cta?: GreetingCTADetails;
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
  outputDir: string,
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
        const { sha1, sha256 } = await getHashes(outputDir, filename);

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

    newFeed.cta = feed?.cta ?? newFeed.cta;
  }
  newFeed.versions.sort((a, b) => semver.rcompare(a.version, b.version));
  return newFeed;
}

async function getHashes(
  outputDir: string,
  packagedFilename: string
): Promise<{ sha1: string; sha256: string }> {
  return Object.fromEntries(
    await Promise.all(
      hashListFiles.map(async ({ filename, hash }) => {
        const content = await fs.readFile(
          path.join(outputDir, filename),
          'utf8'
        );
        const line = content
          .split('\n')
          .find((line) => line.trim().startsWith(packagedFilename));
        if (!line) {
          throw new Error(
            `Could not find entry for ${packagedFilename} in ${filename}`
          );
        }
        return [hash, line.trim().split(/\s+/)[1]] as const;
      })
    )
  ) as { sha1: string; sha256: string };
}
