import { redactConfig } from './redact-config';
import { getArtifactUrl } from './evergreen';
import { GithubRepo } from './github-repo';
import { TarballFile } from './tarball';
import { Barque } from './barque';
import Config from './config';

export default async function buildAndUpload(
  config: Config,
  githubRepo: GithubRepo,
  barque: Barque,
  compileAndZipExecutable: (Config) => Promise<TarballFile>,
  uploadToEvergreen: (artifact: string, awsKey: string, awsSecret: string, project: string, revision: string) => Promise<void>,
  uploadToDownloadCenter: (artifact: string, awsKey: string, awsSecret: string) => Promise<void>): Promise<void> {
  console.info(
    'mongosh: beginning release with config:',
    redactConfig(config)
  );

  // Build the executable.
  const tarballFile = await compileAndZipExecutable(config);
  console.info('mongosh: created tarball:', tarballFile);

  if (config.dryRun) return;

  // Always release internally to evergreen
  await uploadToEvergreen(
    tarballFile.path,
    config.evgAwsKey,
    config.evgAwsSecret,
    config.project,
    config.revision
  );
  console.info('mongosh: internal release completed.');

  const evergreenTarball = getArtifactUrl(config.project, config.revision, tarballFile.path);

  // Only release to public from master and when tagged with the right version.
  if (await githubRepo.shouldDoPublicRelease(config)) {
    console.info('mongosh: start public release.');

    await uploadToDownloadCenter(
      tarballFile.path,
      config.downloadCenterAwsKey,
      config.downloadCenterAwsSecret
    );

    await barque.releaseToBarque(evergreenTarball);
    console.info('mongosh: submitting to barque complete');

    await githubRepo.releaseToGithub(tarballFile, config);
  }

  console.info('mongosh: finished release process.');
}

