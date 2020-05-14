import os from 'os';
import Config from './config';
import compileExec from './compile-exec';
import uploadArtifactToEvergreen from './evergreen';
import uploadArtifactToDownloads from './upload-artifact';
import uploadDownloadCenterConfig from './download-center';
import Platform from './platform';
import zip from './zip';
import S3 from 'aws-sdk/clients/s3';

/**
 * Run the release process.
 *
 * @param {Config} config - the configuration, usually config/build.config.js.
 */
const release = async(config: Config) => {
  const platform = os.platform();

  // - Build the executable.
  await compileExec(config.input, config.outputDir, platform);

  // - Sign the executable for each OS.

  // - Zip the executable.
  const artifact = await zip(config.input, config.outputDir, platform, config.version);

  // - Create & sign the .deb (only on linux)
  // - Create & sign the .rpm (only on linux)
  // - Create & sign the .msi (only on win)
  // -
  // - this is a new release tag.
  //
  // - Publish the .deb (only on linux)
  // - Publish the .rpm (only on linux)
  // - Create PR for Homebrew (only on macos)

  // - Upload artifacts to S3 for Evergreen and downloads.
  await uploadArtifactToEvergreen(
    artifact,
    config.evgAwsKey,
    config.evgAwsSecret,
    config.project,
    config.revision
  );
  await uploadArtifactToDownloads(
    artifact,
    config.downloadsAwsKey,
    config.downloadsAwsSecret,
    config.project,
    config.revision
  );

  // - Create Github release.

  // - Create download center config and upload.
  // - Publish to NPM.
  //
  // These only need to happen once so we only run them on MacOS.
  if (platform === Platform.MacOs) {
    await uploadDownloadCenterConfig(
      config.version,
      config.downloadCenterAwsKey,
      config.downloadCenterAwsSecret
    );
  }
}; 

export default release;
