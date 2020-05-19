import path from 'path';
import { promises as fs } from 'fs';
import handlebars from 'handlebars';
import S3 from 'aws-sdk/clients/s3';
import upload, { PUBLIC_READ } from './s3';

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
          "download_link": "https://downloads.mongodb.com/compass/mongosh-{{version}}-win.zip"
        },
        {
          "arch": "x64",
          "os": "linux",
          "name": "Linux 64-bit",
          "download_link": "https://downloads.mongodb.com/compass/mongosh-{{version}}-linux.tgz"
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
  console.log('mongosh: created download center template:', rendered);
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
  console.log('mongosh: uploading config to download center');
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
const uploadDownloadCenterConfig = (version: string, awsKey: string, awsSecret: string): Promise<any> => {
  const s3 = new S3({
    accessKeyId: awsKey,
    secretAccessKey: awsSecret
  });
  const config = createDownloadCenterConfig(version);
  return uploadToDownloadCenter(s3, config);
}

export default uploadDownloadCenterConfig;
export { createDownloadCenterConfig, uploadToDownloadCenter };
