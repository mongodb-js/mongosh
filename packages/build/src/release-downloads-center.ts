import uploadDownloadCenterConfig from './download-center';
import uploadArtifactToDownloadCenter from './upload-artifact';
import runOnlyOnOnePlatform from './execute-once';
import { TarballFile } from './tarball';
import Config from './config';

// Upload tarballs and Downloads Center config file.
// Config file only gets uploaded once.
const releaseToDownloadCenter = async(artifact: TarballFile, config: Config): Promise<void> => {
  await uploadArtifactToDownloadCenter(
    artifact.path,
    config.downloadCenterAwsKey,
    config.downloadCenterAwsSecret,
    config.project,
    config.revision
  );

  await runOnlyOnOnePlatform('upload to download center', config, async() => {
    await uploadDownloadCenterConfig(
      config.version,
      config.downloadCenterAwsKey,
      config.downloadCenterAwsSecret
    );
  });
};

export default releaseToDownloadCenter;
