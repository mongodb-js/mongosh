import releaseToDownloadCenter from './release-downloads-center';
import uploadArtifactToEvergreen from './evergreen';
import { GithubRepo } from './github-repo';
import compileExec from './compile-exec';
import { Octokit } from '@octokit/rest';
import { zip, ZipFile } from './zip';
import Config from './config';

/**
 * Run the release process.
 * zip, release internally on evergreen, and, if applicable do a public release
 * (download centre and github.
 * @param {Config} config - the configuration, usually config/build.config.js.
 */
export default async function release(config: Config): Promise<void> {
  console.log(
    'mongosh: beginning release with config:',
    safeToLogConfig(config)
  );

  const octokit = new Octokit({
    auth: config.githubToken
  });

  const githubRepo = new GithubRepo(config.repo, octokit);

  await releaseTasks(config, githubRepo, compileAndZipExecutable, uploadArtifactToEvergreen, releaseToDownloadCenter);
}

export async function releaseTasks(
  config,
  githubRepo,
  compileAndZipExecutable,
  uploadToEvergreen,
  releaseToDownloadCenter): Promise<void> {
  // Build the executable.
  const zipFile = await compileAndZipExecutable(config);
  console.log('mongosh: created zipfile:', zipFile);

  // Always release internally to evergreen
  await uploadToEvergreen(
    zipFile.path,
    config.evgAwsKey,
    config.evgAwsSecret,
    config.project,
    config.revision);
  console.log('mongosh: internal release completed.');

  // Only release to public from master and when tagged with the right version.
  if (await githubRepo.shouldDoPublicRelease(config)) {
    console.log('mongosh: start public release.');

    await releaseToDownloadCenter(zipFile, config);
    await githubRepo.releaseToGithub(zipFile, config);
  }

  console.log('mongosh: finished release process.');
}

function safeToLogConfig(config: Config): any {
  return {
    version: config.version,
    bundleId: config.bundleId,
    input: config.input,
    execInput: config.execInput,
    outputDir: config.outputDir,
    project: config.project,
    revision: config.revision,
    branch: config.branch,
    isCi: config.isCi,
    platform: config.platform,
    repo: config.repo
  };
}

async function compileAndZipExecutable(config: Config): Promise<ZipFile> {
  const executable = await compileExec(
    config.input,
    config.execInput,
    config.outputDir,
    config.platform,
    config.analyticsConfig,
    config.segmentKey
  );

  // Zip the executable.
  const artifact = await zip(
    executable,
    config.outputDir,
    config.platform,
    config.version
  );

  // add artifcats for .rpm and .deb and .msi
  return artifact;
}