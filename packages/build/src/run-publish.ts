import type { writeAnalyticsConfig as writeAnalyticsConfigType } from './analytics';
import { Barque } from './barque';
import {
  BuildVariant,
  Config,
  getReleaseVersionFromTag,
  shouldDoPublicRelease as shouldDoPublicReleaseFn
} from './config';
import { createAndPublishDownloadCenterConfig as createAndPublishDownloadCenterConfigFn } from './download-center';
import { getArtifactUrl as getArtifactUrlFn } from './evergreen';
import { GithubRepo } from './github-repo';
import type { publishToHomebrew as publishToHomebrewType } from './homebrew';
import type { publishNpmPackages as publishNpmPackagesType } from './npm-packages';
import { getTarballFile } from './tarball';

export async function runPublish(
  config: Config,
  mongoshGithubRepo: GithubRepo,
  mongoHomebrewGithubRepo: GithubRepo,
  barque: Barque,
  createAndPublishDownloadCenterConfig: typeof createAndPublishDownloadCenterConfigFn,
  publishNpmPackages: typeof publishNpmPackagesType,
  writeAnalyticsConfig: typeof writeAnalyticsConfigType,
  publishToHomebrew: typeof publishToHomebrewType,
  shouldDoPublicRelease: typeof shouldDoPublicReleaseFn = shouldDoPublicReleaseFn,
  getEvergreenArtifactUrl: typeof getArtifactUrlFn = getArtifactUrlFn
): Promise<void> {
  if (!shouldDoPublicRelease(config)) {
    console.warn('mongosh: Not triggering publish - configuration does not match a public release!');
    return;
  }

  const releaseVersion = getReleaseVersionFromTag(config.triggeringGitTag);
  const latestDraftTag = await mongoshGithubRepo.getMostRecentDraftTagForRelease(releaseVersion);
  if (!latestDraftTag || !releaseVersion) {
    throw new Error(`Could not find prior draft tag for release version: ${releaseVersion}`);
  }
  if (latestDraftTag.sha !== config.revision) {
    throw new Error(`Version mismatch - latest draft tag was for revision ${latestDraftTag.sha}, current revision is ${config.revision}`);
  }

  const packageName = config.packageInformation?.metadata.name;
  if (!packageName) {
    throw new Error('Missing package name from config.packageInformation.metadata');
  }

  console.info('mongosh: Re-using artifacts from most recent draft tag', latestDraftTag.name);

  await publishArtifactsToBarque(
    barque,
    config.project as string,
    releaseVersion,
    latestDraftTag.name,
    packageName,
    getEvergreenArtifactUrl
  );

  await createAndPublishDownloadCenterConfig(
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
    mongoHomebrewGithubRepo,
    config.version
  );

  console.info('mongosh: finished release process.');
}

async function publishArtifactsToBarque(
  barque: Barque,
  project: string,
  releaseVersion: string,
  mostRecentDraftTag: string,
  packageName: string,
  getEvergreenArtifactUrl: typeof getArtifactUrlFn
): Promise<void> {
  const variantsForBarque = [
    BuildVariant.Linux,
    BuildVariant.Debian,
    BuildVariant.Redhat
  ];
  for await (const variant of variantsForBarque) {
    const tarballName = getTarballFile(variant, releaseVersion, packageName);
    const tarballUrl = getEvergreenArtifactUrl(project, mostRecentDraftTag, tarballName.path);
    console.info(`mongosh: Publishing ${variant} artifact to barque ${tarballUrl}`);
    await barque.releaseToBarque(tarballUrl);
  }
  console.info('mongosh: Submitting to barque complete');
}
