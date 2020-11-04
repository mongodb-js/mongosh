import handlebars from 'handlebars';
import S3 from 'aws-sdk/clients/s3';
import upload, { PUBLIC_READ } from './s3';
import fetch from 'node-fetch';

async function verifyDownloadCenterConfig(downloadCenterJson: Record<string, any>): Promise<void> {
  const errors: Record<string, number> = {};

  for (const version of downloadCenterJson.versions) {
    for (const platform of version.platform) {
      const response = await fetch(platform.download_link, {
        method: 'HEAD'
      });

      if (!response.ok) {
        errors[platform.download_link] = response.status;
      }
    }
  }

  if (Object.keys(errors).length) {
    throw new Error(`Download center urls broken: ${JSON.stringify(errors)}`);
  }
}

/**
 * The filename in the download center.
 */
const FILENAME = 'mongosh.json';

/**
 * Download center bucket name.
 */
const BUCKET = 'info-mongodb-com';

/**
 * Download center directory.
 */
const DIRECTORY = 'com-download-center';

/**
 * The download center JSON template.
 */
const CONFIG = `
{
  "versions": [
    {
      "_id": "{{version}}",
      "version": "{{version}}",
      "platform": [
        {
          "arch": "x64",
          "os": "darwin",
          "name": "MacOS 64-bit (10.10+)",
          "download_link": "https://downloads.mongodb.com/compass/mongosh-{{version}}-darwin.zip"
        },
        {
          "arch": "x64",
          "os": "win32",
          "name": "Windows 64-bit (7+)",
          "download_link": "https://downloads.mongodb.com/compass/mongosh-{{version}}-win32.zip"
        },
        {
          "arch": "x64",
          "os": "linux",
          "name": "Linux 64-bit",
          "download_link": "https://downloads.mongodb.com/compass/mongosh-{{version}}-linux.tgz"
        },
        {
          "arch": "x64",
          "os": "debian",
          "name": "Debian 64-bit",
          "download_link": "https://downloads.mongodb.com/compass/mongosh_{{version}}_amd64.deb"
        },
        {
          "arch": "x64",
          "os": "rhel",
          "name": "Redhat / CentOS / SUSE / Amazon Linux 64-bit",
          "download_link": "https://downloads.mongodb.com/compass/mongosh-{{version}}-x86_64.rpm"
        }
      ]
    }
  ],
  "manual_link": "https://docs.mongodb.org/manual/products/mongosh",
  "release_notes_link": "https://github.com/mongodb-js/mongosh/releases/tag/v{{version}}",
  "previous_releases_link": "",
  "development_releases_link": "",
  "supported_browsers_link": "",
  "tutorial_link": "test"
}`;

/**
 * Create the download center configuration.
 *
 * @param {string} version - The version.
 *
 * @returns {string} The config.
 *
 */
const createDownloadCenterConfig = (version: string): string => {
  const template = handlebars.compile(CONFIG);
  const rendered = template({ version: version });
  console.info('mongosh: created download center template:', rendered);
  return rendered;
};

/**
 * Upload the provided config to S3.
 *
 * @param {string} config - The config.
 */
const uploadToDownloadCenter = (s3: S3, config: string): Promise<any> => {
  const uploadParams = {
    ACL: PUBLIC_READ,
    Bucket: BUCKET,
    Key: `${DIRECTORY}/${FILENAME}`,
    Body: config
  };
  console.info('mongosh: uploading config to download center');
  return upload(uploadParams, s3);
};

/**
 * Upload the download center config to s3.
 *
 * @param {string} version - The app version.
 * @param {string} awsKey - The aws key.
 * @param {string} awsSecret - The aws secret.
 *
 * @returns {Promise} The promise.
 */
const uploadDownloadCenterConfig = async(version: string, awsKey: string, awsSecret: string): Promise<any> => {
  const s3 = new S3({
    accessKeyId: awsKey,
    secretAccessKey: awsSecret
  });
  const config = createDownloadCenterConfig(version);

  await verifyDownloadCenterConfig(JSON.parse(config));

  return await uploadToDownloadCenter(s3, config);
};

export default uploadDownloadCenterConfig;
export {
  createDownloadCenterConfig,
  verifyDownloadCenterConfig,
  uploadToDownloadCenter
};
