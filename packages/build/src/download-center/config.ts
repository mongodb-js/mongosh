import {
  DownloadCenter as DownloadCenterCls,
  validateConfigSchema,
} from '@mongodb-js/dl-center';
import { major as majorVersion } from 'semver';
import type { DownloadCenterConfig } from '@mongodb-js/dl-center/dist/download-center-config';
import { CONFIGURATION_KEY, CONFIGURATIONS_BUCKET } from './constants';
import type { PackageVariant } from '../config';
import {
  ALL_PACKAGE_VARIANTS,
  getDownloadCenterDistroDescription,
  getArch,
  getDistro,
} from '../config';
import type { PackageInformationProvider } from '../packaging';
import { getPackageFile } from '../packaging';

export async function createAndPublishDownloadCenterConfig(
  packageInformation: PackageInformationProvider,
  awsAccessKeyId: string,
  awsSecretAccessKey: string,
  isDryRun: boolean,
  DownloadCenter: typeof DownloadCenterCls = DownloadCenterCls
): Promise<void> {
  const dlcenter = new DownloadCenter({
    bucket: CONFIGURATIONS_BUCKET,
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
  });
  const existingDownloadCenterConfig = await dlcenter.downloadConfig(
    CONFIGURATION_KEY
  );

  const getVersionConfig = () => createVersionConfig(packageInformation);
  const config = existingDownloadCenterConfig
    ? getUpdatedDownloadCenterConfig(
        existingDownloadCenterConfig,
        getVersionConfig
      )
    : createDownloadCenterConfig(getVersionConfig);

  console.warn('Created download center config:');
  console.dir(config, { depth: Infinity });

  validateConfigSchema(config);

  if (isDryRun) {
    console.warn('Not uploading download center config in dry-run mode');
    return;
  }

  await dlcenter.uploadConfig(CONFIGURATION_KEY, config);
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
  packageInformation: PackageInformationProvider
) {
  const { version } = packageInformation('linux-x64').metadata;
  return {
    _id: version,
    version: version,
    platform: ALL_PACKAGE_VARIANTS.map((packageVariant: PackageVariant) => ({
      arch: getArch(packageVariant),
      os: getDistro(packageVariant),
      name: getDownloadCenterDistroDescription(packageVariant),
      download_link:
        'https://downloads.mongodb.com/compass/' +
        getPackageFile(packageVariant, packageInformation).path,
    })),
  };
}
