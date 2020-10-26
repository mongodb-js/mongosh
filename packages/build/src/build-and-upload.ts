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
  compileAndZipExecutable: (config: Config) => Promise<TarballFile>,
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

  for (const key of [
    'evgAwsKey', 'evgAwsSecret', 'project', 'revision', 'downloadCenterAwsKey', 'downloadCenterAwsSecret'
  ]) {
    if (typeof (config as any)[key] !== 'string') {
      throw new Error(`Missing build config key: ${key}`);
    }
  }

  // Always release internally to evergreen
  await uploadToEvergreen(
    tarballFile.path,
    config.evgAwsKey as string,
    config.evgAwsSecret as string,
    config.project as string,
    config.revision as string
  );
  console.info('mongosh: internal release completed.');

  const evergreenTarball = getArtifactUrl(
    config.project as string, config.revision as string, tarballFile.path);

  // Only release to public from master and when tagged with the right version.
  if (await githubRepo.shouldDoPublicRelease(config)) {
    console.info('mongosh: start public release.');

    await uploadToDownloadCenter(
      tarballFile.path,
      config.downloadCenterAwsKey as string,
      config.downloadCenterAwsSecret as string
    );

    await barque.releaseToBarque(evergreenTarball);
    console.info('mongosh: submitting to barque complete');

    await githubRepo.releaseToGithub(tarballFile, config);
  }

  console.info('mongosh: finished release process.');
}

