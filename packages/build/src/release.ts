import os from 'os';
import Config from './config';
import compileExec from './compile-exec';
import uploadArtifactToEvergreen from './evergreen';
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

  // 1. Build the executable.
  await compileExec(config.input, config.outputDir, platform);

  // 2. Sign the executable for each OS.

  // 3. Zip the executable.
  const artifact = await zip(config.input, config.outputDir, platform, config.version);

  // 4. Create & sign the .deb (only on linux)
  // 5. Create & sign the .rpm (only on linux)
  // 6. Create & sign the .msi (only on win)
  // 
  // If this is a new release tag.
  //
  // 1. Publish the .deb (only on linux)
  // 2. Publish the .rpm (only on linux)
  // 3. Create PR for Homebrew (only on macos)

  // 4. Upload artifacts to S3 for Evergreen and downloads.
  await uploadArtifactToEvergreen(
    artifact,
    config.evgAwsKey,
    config.evgAwsSecret,
    config.project,
    config.revision
  );
  // await uploadArtifactToDownloads();

  // 5. Create Github release.

  // 6. Create download center config and upload. (only on macos)
  // 7. Publish to NPM. (only on macos)
  if (platform === Platform.MacOs) {
    await uploadDownloadCenterConfig(
      config.version,
      config.downloadCenterAwsKey,
      config.downloadCenterAwsSecret
    );
  }
}; 

export default release;
