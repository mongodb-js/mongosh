import { DownloadCenter as DownloadCenterCls } from '@mongodb-js/dl-center';
import { DownloadCenterConfig } from '@mongodb-js/dl-center/dist/download-center-config';
import { CONFIGURATION_KEY, CONFIGURATIONS_BUCKET } from './constants';

export async function createAndPublishDownloadCenterConfig(
  version: string,
  awsAccessKeyId: string,
  awsSecretAccessKey: string,
  DownloadCenter: typeof DownloadCenterCls = DownloadCenterCls
): Promise<void> {
  const config = createDownloadCenterConfig(version);

  const dlcenter = new DownloadCenter({
    bucket: CONFIGURATIONS_BUCKET,
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey
  });

  await dlcenter.uploadConfig(CONFIGURATION_KEY, config);
}

export function createDownloadCenterConfig(version: string): DownloadCenterConfig {
  return {
    'versions': [
      {
        '_id': version,
        'version': version,
        'platform': [
          {
            'arch': 'x64',
            'os': 'darwin',
            'name': 'MacOS 64-bit (10.10+)',
            'download_link': `https://downloads.mongodb.com/compass/mongosh-${version}-darwin.zip`
          },
          {
            'arch': 'x64',
            'os': 'win32',
            'name': 'Windows 64-bit (7+)',
            'download_link': `https://downloads.mongodb.com/compass/mongosh-${version}-win32.zip`
          },
          {
            'arch': 'x64',
            'os': 'win32',
            'name': 'Windows 64-bit (7+) (MSI)',
            'download_link': `https://downloads.mongodb.com/compass/mongosh-${version}.msi`
          },
          {
            'arch': 'x64',
            'os': 'linux',
            'name': 'Linux 64-bit',
            'download_link': `https://downloads.mongodb.com/compass/mongosh-${version}-linux.tgz`
          },
          {
            'arch': 'x64',
            'os': 'debian',
            'name': 'Debian 64-bit',
            'download_link': `https://downloads.mongodb.com/compass/mongosh_${version}_amd64.deb`
          },
          {
            'arch': 'x64',
            'os': 'rhel',
            'name': 'Redhat / CentOS / SUSE / Amazon Linux 64-bit',
            'download_link': `https://downloads.mongodb.com/compass/mongosh-${version}-x86_64.rpm`
          }
        ]
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
