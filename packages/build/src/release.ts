import os from 'os';
import Config from './config';
import compileExec from './compile-exec';
import uploadArtifactToEvergreen from './evergreen';
import zip from './zip';

// import { Octokit } from '@octokit/rest';
// import releaseToGithub from './github';
// import uploadArtifactToDownloads from './upload-artifact';
// import uploadDownloadCenterConfig from './download-center';
// import publishMacOs from './macos-sign';
// import Platform from './platform';
// import S3 from 'aws-sdk/clients/s3';

/**
 * Run the release process.
 *
 * @param {Config} config - the configuration, usually config/build.config.js.
 */
const release = async(config: Config): Promise<void> => {
  const platform = os.platform();

  // Build the executable.
  const executable = await compileExec(
    config.input,
    config.execInput,
    config.outputDir,
    platform,
    config.analyticsConfig,
    config.segmentKey
  );

  // Zip the executable.
  const artifact = await zip(executable, config.outputDir, platform, config.version);

  // Sign and notarize the executable and artifact for MacOs.
  // if (platform === Platform.MacOs) {
  //  await publishMacOs(executable, artifact, platform, config);
  // }

  // Create & sign the .rpm (only on linux)
  // Create & sign the .msi (only on win)

  // Upload artifact to S3 for Evergreen.
  await uploadArtifactToEvergreen(
    artifact,
    config.evgAwsKey,
    config.evgAwsSecret,
    config.project,
    config.revision
  );

  // Upload the artifact to downloads.10gen.com
  // TODO: fix the release
  //
  // await uploadArtifactToDownloads(
  //   artifact,
  //   config.downloadCenterAwsKey,
  //   config.downloadCenterAwsSecret,
  //   config.project,
  //   config.revision
  // );

  // // Create release and upload assets to Github. Will return true if the current
  // // version is a new release and the release was created on Github.
  // const octokit = new Octokit({
  //   auth: config.githubToken,
  //   userAgent: `mongosh ${config.version}`
  // });
  //
  // const isNewRelease = await releaseToGithub(config.version, artifact, platform, octokit);

  // if (isNewRelease) {
  //   // Publish the .deb (only on linux)
  //   // Publish the .rpm (only on linux)
  //   // Create PR for Homebrew (only on macos)


  //   // Create download center config and upload.
  //   // Publish to NPM.
  //   //
  //   // These only need to happen once so we only run them on MacOS.
  //   await uploadDownloadCenterConfig(
  //     config.version,
  //     config.downloadCenterAwsKey,
  //     config.downloadCenterAwsSecret
  //   );
  // }

  console.log('mongosh: finished release process.');
};

export default release;
