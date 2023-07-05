import S3 from 'aws-sdk/clients/s3';
import download from 'download';
import fs from 'fs';
import path from 'path';

/**
 * The S3 bucket.
 */
const BUCKET = 'mciuploads';

/**
 * Upload the provided argument to evergreen s3 bucket.
 *
 * @param artifact - The artifact.
 * @param awsKey - The aws key.
 * @param awsSecret - The aws secret.
 * @param project - The project the artifact belongs to.
 * @param revisionOrVersion - The hash of the base commit or the release version.
 *
 * @returns Resolves to the artifact URL after upload
 */
export async function uploadArtifactToEvergreen(
  artifact: string,
  awsKey: string,
  awsSecret: string,
  project: string,
  revisionOrVersion: string
): Promise<string> {
  const key = getS3ObjectKey(project, revisionOrVersion, artifact);
  console.info(
    `mongosh: uploading ${artifact} to evergreen bucket:`,
    BUCKET,
    key
  );

  const s3 = new S3({
    accessKeyId: awsKey,
    secretAccessKey: awsSecret,
  });

  await s3
    .upload({
      ACL: 'public-read',
      Bucket: BUCKET,
      Key: key,
      Body: fs.createReadStream(artifact),
    })
    .promise();

  const url = getArtifactUrl(project, revisionOrVersion, artifact);
  console.info(`mongosh: artifact download url: ${url}`);
  return url;
}

export async function downloadArtifactFromEvergreen(
  artifact: string,
  project: string,
  revisionOrVersion: string,
  localDirectory: string
): Promise<string> {
  const artifactUrl = getArtifactUrl(project, revisionOrVersion, artifact);
  console.info(
    `mongosh: downloading to ${localDirectory} from evergreen:`,
    artifactUrl
  );

  const filename = path.basename(artifact);
  await download(artifactUrl, localDirectory, {
    filename,
  });

  return path.join(localDirectory, filename);
}

export function getArtifactUrl(
  project: string,
  revisionOrVersion: string,
  artifact: string
): string {
  const key = getS3ObjectKey(project, revisionOrVersion, artifact);
  return `https://s3.amazonaws.com/${BUCKET}/${key}`;
}

function getS3ObjectKey(
  project: string,
  revisionOrVersion: string,
  artifact: string
) {
  return `${project}/${revisionOrVersion}/${path.basename(artifact)}`;
}
