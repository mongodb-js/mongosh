import { DownloadCenter as DownloadCenterCls, validateConfigSchema } from '@mongodb-js/dl-center';
import { DownloadCenterConfig } from '@mongodb-js/dl-center/dist/download-center-config';
import { CONFIGURATION_KEY, CONFIGURATIONS_BUCKET } from './constants';
import { PackageVariant, ALL_PACKAGE_VARIANTS, getDownloadCenterDistroDescription, getArch, getDistro } from '../config';
import { getPackageFile, PackageInformationProvider } from '../packaging';

export async function createAndPublishDownloadCenterConfig(
  packageInformation: PackageInformationProvider,
  awsAccessKeyId: string,
  awsSecretAccessKey: string,
  isDryRun: boolean,
  DownloadCenter: typeof DownloadCenterCls = DownloadCenterCls
): Promise<void> {
  const config = createDownloadCenterConfig(packageInformation);

  console.warn('Created download center config:');
  // eslint-disable-next-line no-console
  console.dir(config, { depth: Infinity });

  validateConfigSchema(config);

  if (isDryRun) {
    console.warn('Not uploading download center config in dry-run mode');
    return;
  }

  const dlcenter = new DownloadCenter({
    bucket: CONFIGURATIONS_BUCKET,
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey
  });

  await dlcenter.uploadConfig(CONFIGURATION_KEY, config);
}

export function createDownloadCenterConfig(packageInformation: PackageInformationProvider): DownloadCenterConfig {
  const { version } = packageInformation('linux-x64').metadata;
  return {
    'versions': [
      {
        '_id': version,
        'version': version,
        'platform': ALL_PACKAGE_VARIANTS.map((packageVariant: PackageVariant) => ({
          arch: getArch(packageVariant),
          os: getDistro(packageVariant),
          name: getDownloadCenterDistroDescription(packageVariant),
          download_link: 'https://downloads.mongodb.com/compass/' + getPackageFile(packageVariant, packageInformation).path
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
