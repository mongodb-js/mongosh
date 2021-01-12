import path from 'path';
import type writeAnalyticsConfigType from './analytics';
import Config from './config';
import type uploadDownloadCenterConfigType from './download-center';
import { GithubRepo } from './github-repo';
import type { publishToHomebrew as publishToHomebrewType } from './homebrew';
import type { publishNpmPackages as publishNpmPackagesType } from './npm-packages';
import { redactConfig } from './redact-config';

export default async function publish(
  config: Config,
  mongoshGithubRepo: GithubRepo,
  mongoHomebrewGithubRepo: GithubRepo,
  uploadDownloadCenterConfig: typeof uploadDownloadCenterConfigType,
  publishNpmPackages: typeof publishNpmPackagesType,
  writeAnalyticsConfig: typeof writeAnalyticsConfigType,
  publishToHomebrew: typeof publishToHomebrewType
): Promise<void> {
  console.info(
    'mongosh: beginning publish release with config:',
    redactConfig(config)
  );

  if (!await mongoshGithubRepo.shouldDoPublicRelease(config)) return;

  await uploadDownloadCenterConfig(
    config.version,
    config.downloadCenterAwsKey || '',
    config.downloadCenterAwsSecret || ''
  );

  await mongoshGithubRepo.promoteRelease(config);

  // ensures the segment api key to be present in the published packages
  await writeAnalyticsConfig(
    config.analyticsConfigFilePath,
    config.segmentKey
  );

  publishNpmPackages();

  await publishToHomebrew(
    path.resolve(config.rootDir, 'tmp'),
    mongoHomebrewGithubRepo,
    config.version
  );

  console.info('mongosh: finished release process.');
}
