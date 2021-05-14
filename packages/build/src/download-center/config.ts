import { DownloadCenter as DownloadCenterCls } from '@mongodb-js/dl-center';
import { DownloadCenterConfig } from '@mongodb-js/dl-center/dist/download-center-config';
import { CONFIGURATION_KEY, CONFIGURATIONS_BUCKET } from './constants';
import { BuildVariant, ALL_BUILD_VARIANTS, getDownloadCenterDistroDescription, getArch, getDistro } from '../config';
import { getPackageFile, PackageInformation } from '../packaging';

export async function createAndPublishDownloadCenterConfig(
  packageInformation: PackageInformation,
  awsAccessKeyId: string,
  awsSecretAccessKey: string,
  DownloadCenter: typeof DownloadCenterCls = DownloadCenterCls
): Promise<void> {
  const config = createDownloadCenterConfig(packageInformation);

  const dlcenter = new DownloadCenter({
    bucket: CONFIGURATIONS_BUCKET,
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey
  });

  await dlcenter.uploadConfig(CONFIGURATION_KEY, config);
}

export function createDownloadCenterConfig(packageInformation: PackageInformation): DownloadCenterConfig {
  const { version } = packageInformation.metadata;
  return {
    'versions': [
      {
        '_id': version,
        'version': version,
        'platform': ALL_BUILD_VARIANTS.map((buildVariant: BuildVariant) => ({
          arch: getArch(buildVariant),
          os: getDistro(buildVariant),
          name: getDownloadCenterDistroDescription(buildVariant),
          download_link: 'https://downloads.mongodb.com/compass/' + getPackageFile(buildVariant, packageInformation).path
        }))
      }
    ],
    'manual_link': 'https://docs.mongodb.org/manual/products/mongosh',
    'release_notes_link': `https://github.com/mongodb-js/mongosh/releases/tag/v${version}`,
    'previous_releases_link': '',
    'development_releases_link': '',
    'supported_browsers_link': '',
    'tutorial_link': 'test'
  };
}
