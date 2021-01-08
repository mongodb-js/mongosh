import { GithubRepo } from './github-repo';
import Config from './config';
import { redactConfig } from './redact-config';
import { publishNpmPackages } from './npm-packages';

export default async function publish(
  config: Config,
  githubRepo: GithubRepo,
  uploadDownloadCenterConfig: (version: string, awsKey: string, awsSecret: string) => Promise<any>
): Promise<void> {
  console.info(
    'mongosh: beginning publish release with config:',
    redactConfig(config)
  );

  if (!await githubRepo.shouldDoPublicRelease(config)) return;

  await uploadDownloadCenterConfig(
    config.version,
    config.downloadCenterAwsKey || '',
    config.downloadCenterAwsSecret || ''
  );

  await githubRepo.promoteRelease(config);

  // publishNpmPackages();
  console.info('mongosh: finished release process.');
}


