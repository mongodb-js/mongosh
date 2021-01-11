import compileExec, { executablePath } from './compile-exec';
import { createTarball, TarballFile } from './tarball';
import Platform from './platform';
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import macOSSignAndNotarize from './macos-sign';
import uploadToDownloadCenter from './upload-to-download-center';
import uploadDownloadCenterConfig from './download-center';
import uploadArtifactToEvergreen from './evergreen';
import doUpload from './do-upload';
import { GithubRepo } from './github-repo';
import { Octokit } from '@octokit/rest';
import { Barque } from './barque';
import publish from './publish';
import { redactConfig } from './redact-config';
import Config from './config';
import getReleaseVersionFromTag from './get-release-version-from-tag';
import { bumpNpmPackages, publishNpmPackages } from './npm-packages';
import writeAnalyticsConfig from './analytics';

/**
 * Run the release process.
 * zip, release internally on evergreen, and, if applicable do a public release
 * (download centre and github.
 * @param {Config} config - the configuration, usually config/build.config.js.
 */
export default async function release(
  command: 'compile' | 'package' | 'upload' | 'publish',
  config: Config
): Promise<void> {
  const octokit = new Octokit({
    auth: config.githubToken
  });

  const githubRepo = new GithubRepo(config.repo, octokit);
  const commitTag = await githubRepo.getTagByCommitSha(config.revision);

  config = {
    ...config,
    version: await getReleaseVersionFromTag(commitTag?.name) || config.version
  };

  // updates the version of internal packages to reflect the tagged one
  bumpNpmPackages(config.version);

  const barque = new Barque(config);
  let tarballFile: TarballFile;

  console.info(
    `mongosh: running command '${command}' with config:`,
    redactConfig(config)
  );

  if (command === 'compile') {
    await compileExec(
      config.input,
      config.execInput,
      config.outputDir,
      config.execNodeVersion,
      config.analyticsConfigFilePath ?? '',
      config.segmentKey ?? '');
  } else if (command === 'package') {
    const executable = executablePath(config.outputDir, os.platform());
    const runCreateTarball = async(): Promise<TarballFile> => {
      return await createTarball(
        executable,
        config.outputDir,
        config.buildVariant ?? '',
        config.version,
        config.rootDir
      );
    };

    // Zip the executable, or, on macOS, do it as part of the
    // notarization/signing step.
    if (os.platform() === Platform.MacOs) {
      tarballFile = await macOSSignAndNotarize(executable, config, runCreateTarball);
    } else {
      tarballFile = await runCreateTarball();
    }
    await fs.writeFile(path.join(config.outputDir, '.artifact_metadata'), JSON.stringify(tarballFile));
  } else if (command === 'upload') {
    tarballFile = JSON.parse(await fs.readFile(path.join(config.outputDir, '.artifact_metadata'), 'utf8'));
    await doUpload(
      config,
      githubRepo,
      barque,
      tarballFile,
      uploadArtifactToEvergreen,
      uploadToDownloadCenter);
  } else if (command === 'publish') {
    await publish(
      config,
      githubRepo,
      uploadDownloadCenterConfig,
      publishNpmPackages,
      writeAnalyticsConfig
    );
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
}


