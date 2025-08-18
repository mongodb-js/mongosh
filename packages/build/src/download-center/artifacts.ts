import { DownloadCenter as DownloadCenterCls } from '@mongodb-js/dl-center';
import * as fs from 'fs';
import path from 'path';
import { ARTIFACTS_BUCKET, ARTIFACTS_FOLDER } from './constants';

export async function uploadArtifactToDownloadCenter(
  filePath: string,
  awsAccessKeyId: string,
  awsSecretAccessKey: string,
  awsSessionToken: string,
  DownloadCenter: typeof DownloadCenterCls = DownloadCenterCls
): Promise<void> {
  const dlcenter = new DownloadCenter({
    bucket: ARTIFACTS_BUCKET,
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
    sessionToken: awsSessionToken,
  });

  await dlcenter.uploadAsset(
    `${ARTIFACTS_FOLDER}/${path.basename(filePath)}`,
    fs.createReadStream(filePath),
    {
      acl: 'private',
    }
  );
}
