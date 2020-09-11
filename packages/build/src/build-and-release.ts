import { GithubRepo } from './github-repo';
import Config from './config';
import { TarballFile } from './tarball';
import { redactConfig } from './redact-config';

export default async function buildAndRelease(
  config: Config,
  githubRepo: GithubRepo,
  compileAndZipExecutable: (Config) => Promise<TarballFile>,
  uploadToEvergreen: (artifact: string, awsKey: string, awsSecret: string, project: string, revision: string) => Promise<void>,
  releaseToDownloadCenter: (TarballFile, Config) => Promise<void>): Promise<void> {
  console.log(
    'mongosh: beginning release with config:',
    redactConfig(config)
  );

  // Build the executable.
  const tarballFile = await compileAndZipExecutable(config);
  console.log('mongosh: created tarball:', tarballFile);

  if (config.dryRun) return;

  // Always release internally to evergreen
  await uploadToEvergreen(
    tarballFile.path,
    config.evgAwsKey,
    config.evgAwsSecret,
    config.project,
    config.revision
  );
  console.log('mongosh: internal release completed.');

  // Only release to public from master and when tagged with the right version.
  if (await githubRepo.shouldDoPublicRelease(config)) {
    console.log('mongosh: start public release.');

    await releaseToDownloadCenter(tarballFile, config);
    await githubRepo.releaseToGithub(tarballFile, config);
  }

  console.log('mongosh: finished release process.');
}

