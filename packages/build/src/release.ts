import { Octokit } from '@octokit/rest';
import { promises as fs, constants as fsConstants } from 'fs';
import os from 'os';
import path from 'path';
import writeAnalyticsConfig from './analytics';
import { Barque } from './barque';
import compileExec from './compile-exec';
import Config from './config';
import doUpload from './do-upload';
import uploadDownloadCenterConfig from './download-center';
import uploadArtifactToEvergreen from './evergreen';
import getReleaseVersionFromTag from './get-release-version-from-tag';
import { GithubRepo } from './github-repo';
import { publishToHomebrew } from './homebrew';
import macOSSignAndNotarize from './macos-sign';
import { bumpNpmPackages, publishNpmPackages } from './npm-packages';
import Platform from './platform';
import publish from './publish';
import { redactConfig } from './redact-config';
import { createTarball, TarballFile } from './tarball';
import uploadToDownloadCenter from './upload-to-download-center';
import { downloadMongocrypt } from './download-mongocryptd';

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
  const mongoHomebrewRepo = new GithubRepo({ owner: 'mongodb', repo: 'homebrew-brew' }, octokit);

  config = {
    ...config,
    version: await getReleaseVersionFromTag(config.triggeringGitTag) || config.version
  };

  // updates the version of internal packages to reflect the tagged one
  bumpNpmPackages(config.version);

  let tarballFile: TarballFile;

  console.info(
    `mongosh: running command '${command}' with config:`,
    redactConfig(config)
  );

  if (command === 'compile') {
    await compileExec(
      config.input,
      config.execInput,
      config.executablePath,
      config.execNodeVersion,
      config.analyticsConfigFilePath ?? '',
      config.segmentKey ?? '');
  } else if (command === 'package') {
    await fs.copyFile(await downloadMongocrypt(), config.mongocryptdPath, fsConstants.COPYFILE_FICLONE);
    const runCreateTarball = async(): Promise<TarballFile> => {
      return await createTarball(
        config.outputDir,
        config.buildVariant ?? '',
        config.packageInformation as (Required<Config>['packageInformation'])
      );
    };

    // Zip the executable, or, on macOS, do it as part of the
    // notarization/signing step.
    if (os.platform() === Platform.MacOs) {
      tarballFile = await macOSSignAndNotarize([
        config.executablePath,
        config.mongocryptdPath
      ], config, runCreateTarball);
    } else {
      tarballFile = await runCreateTarball();
    }
    await fs.writeFile(path.join(config.outputDir, '.artifact_metadata'), JSON.stringify(tarballFile));
  } else if (command === 'upload') {
    const barque = new Barque(config);
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
      mongoHomebrewRepo,
      uploadDownloadCenterConfig,
      publishNpmPackages,
      writeAnalyticsConfig,
      publishToHomebrew
    );
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
}
