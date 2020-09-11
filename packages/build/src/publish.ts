import { GithubRepo } from './github-repo';
import Config from './config';
import { redactConfig } from './redact-config';

export default async function publish(
  config: Config,
  githubRepo: GithubRepo,
  uploadDownloadCenterConfig: (version: string, awsKey: string, awsSecret: string) => Promise<any>
): Promise<void> {
  if (config.dryRun) return;

  console.log(
    'mongosh: beginning publish release with config:',
    redactConfig(config)
  );

  if (!await githubRepo.shouldDoPublicRelease(config)) return;

  await uploadDownloadCenterConfig(
    config.version,
    config.downloadCenterAwsKey,
    config.downloadCenterAwsSecret
  );

  await githubRepo.promoteRelease(config);

  console.log('mongosh: finished release process.');
}


