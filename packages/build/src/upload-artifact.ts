import fs from 'fs';
import path from 'path';
import S3 from 'aws-sdk/clients/s3';
import upload, { PUBLIC_READ } from './s3';

/**
 * The S3 bucket.
 */
const BUCKET = 'downloads.10gen.com';

/**
 * Upload the provided argument to evergreen s3 bucket.
 *
 * @param {string} artifact - The artifact.
 * @param {string} awsKey - The aws key.
 * @param {string} awsSecret - The aws secret.
 *
 * @returns {Promise} The promise.
 */
const uploadArtifactToDownloads = (artifact: string, awsKey: string, awsSecret: string, project: string, revision: string): Promise<any> => {
  const s3 = new S3({
    accessKeyId: awsKey,
    secretAccessKey: awsSecret
  });
  const uploadParams = {
    ACL: PUBLIC_READ,
    Bucket: BUCKET,
    Key: `compass/${path.basename(artifact)}`,
    Body: fs.createReadStream(artifact)
  };
  console.log(`mongosh: uploading ${artifact} to downloads`);
  return upload(uploadParams, s3);
};

export default uploadArtifactToDownloads;
