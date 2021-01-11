import { GithubRepo } from './github-repo';
import Config from './config';
import { redactConfig } from './redact-config';
import type writeAnalyticsConfigType from './analytics';
import type { publishNpmPackages as publishNpmPackagesType } from './npm-packages';
import type uploadDownloadCenterConfigType from './download-center';

export default async function publish(
  config: Config,
  githubRepo: GithubRepo,
  uploadDownloadCenterConfig: typeof uploadDownloadCenterConfigType,
  publishNpmPackages: typeof publishNpmPackagesType,
  writeAnalyticsConfig: typeof writeAnalyticsConfigType
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

  // ensures the segment api key to be present in the published packages
  await writeAnalyticsConfig(
    config.analyticsConfigFilePath,
    config.segmentKey
  );

  publishNpmPackages();
  console.info('mongosh: finished release process.');
}
