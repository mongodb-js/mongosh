import { Octokit } from '@octokit/rest';
import semver from 'semver';
import compileExec from './compile-exec';
import Config from './config';
import uploadDownloadCenterConfig from './download-center';
import uploadArtifactToEvergreen from './evergreen';
import { GithubRepo } from './github-repo';
import uploadArtifactToDownloadCenter from './upload-artifact';
import { zip, ZipFile } from './zip';

/**
 * Run the release process.
 *
 * @param {Config} config - the configuration, usually config/build.config.js.
 */
export default async function release(config: Config): Promise<void> {
  log('beginning release with config:', safeToLogConfig(config));

  const octokit = new Octokit({
    auth: config.githubToken
  });

  const githubRepo = new GithubRepo(config.repo, octokit);

  // Build the executable.
  const zipFile = await compileAndZipExecutable(config);
  log('created zipfile:', zipFile);

  // Always release internally.
  await releaseIntenally(zipFile, config);
  log('internal release completed.');

  // Only release to public from master and when tagged with the right version.
  if (shouldDoPublicRelease(githubRepo, config)) {
    log('start public release.');

    await releaseToDownloadCenter(zipFile, config);
    await releaseToGithub(zipFile, githubRepo, config);
  }

  log('finished release process.');
}

function log(...message): void {
  console.info('mongosh:', ...message);
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

  return artifact;
}

async function releaseIntenally(artifact: ZipFile, config: Config): Promise<void> {
  await uploadArtifactToEvergreen(
    artifact.path,
    config.evgAwsKey,
    config.evgAwsSecret,
    config.project,
    config.revision
  );
}

async function shouldDoPublicRelease(githubRepo: GithubRepo, config: Config): Promise<boolean> {
  if (config.branch === 'master' ) {
    log('skip public release: is not master');

    return false;
  }

  const commitTag = await githubRepo.getTagByCommitSha(config.revision);

  if (!commitTag) {
    log('skip public release: commit is not tagged');

    return false;
  }

  if (semver.neq(commitTag.name, config.version)) {
    log('skip public release: the commit tag', commitTag.name,
      'is different from the release version', config.version
    );

    return false;
  }

  return true;
}

async function releaseToDownloadCenter(artifact: ZipFile, config: Config): Promise<void> {
  await uploadArtifactToDownloadCenter(
    artifact.path,
    config.downloadCenterAwsKey,
    config.downloadCenterAwsSecret,
    config.project,
    config.revision
  );

  await uploadDownloadCenterConfig(
    config.version,
    config.downloadCenterAwsKey,
    config.downloadCenterAwsSecret
  );
}

async function releaseToGithub(artifact: ZipFile, githubRepo: GithubRepo, config: Config): Promise<void> {
  const githubRelease = {
    name: config.version,
    tag: `v${config.version}`,
    notes: `Release notes [in Jira](${jiraReleaseNotesLink(config.version)})`
  };

  await githubRepo.createReleaseIfNotExists(githubRelease);
  await githubRepo.uploadReleaseAssetIfNotExists(githubRelease, artifact);
}

function jiraReleaseNotesLink(version: string): string {
  return `https://jira.mongodb.org/issues/?jql=project%20%3D%20MONGOSH%20AND%20fixVersion%20%3D%20${version}`;
}
