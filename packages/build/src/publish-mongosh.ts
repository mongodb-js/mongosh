import type { writeBuildInfo as writeBuildInfoType } from './build-info';
import type { Barque } from './barque';
import type { Config } from './config';
import {
  ALL_PACKAGE_VARIANTS,
  getReleaseVersionFromTag,
  shouldDoPublicRelease as shouldDoPublicReleaseFn,
} from './config';
import type { createAndPublishDownloadCenterConfig as createAndPublishDownloadCenterConfigFn } from './download-center';
import { getArtifactUrl as getArtifactUrlFn } from './evergreen';
import type { GithubRepo } from '@mongodb-js/devtools-github-repo';
import type { publishToHomebrew as publishToHomebrewType } from './homebrew';
import type { pushTags as pushTagsType } from './npm-packages';
import { type publishToNpm as publishToNpmType } from './npm-packages';
import type { PackageInformationProvider } from './packaging';
import { getPackageFile } from './packaging';
import {
  bumpMongoshReleasePackages as bumpMongoshReleasePackagesFn,
  bumpAuxiliaryPackages as bumpAuxiliaryPackagesFn,
} from './npm-packages';
import { commitBumpedPackages } from './npm-packages/bump';
import { spawnSync as spawnSyncFn } from './helpers';

export async function publishMongosh(
  config: Config,
  mongoshGithubRepo: GithubRepo,
  mongodbHomebrewForkGithubRepo: GithubRepo,
  homebrewCoreGithubRepo: GithubRepo,
  barque: Barque,
  createAndPublishDownloadCenterConfig: typeof createAndPublishDownloadCenterConfigFn,
  publishToNpm: typeof publishToNpmType,
  pushTags: typeof pushTagsType,
  writeBuildInfo: typeof writeBuildInfoType,
  publishToHomebrew: typeof publishToHomebrewType,
  shouldDoPublicRelease: typeof shouldDoPublicReleaseFn = shouldDoPublicReleaseFn,
  getEvergreenArtifactUrl: typeof getArtifactUrlFn = getArtifactUrlFn,
  bumpMongoshReleasePackages: typeof bumpMongoshReleasePackagesFn = bumpMongoshReleasePackagesFn,
  bumpAuxiliaryPackages: typeof bumpAuxiliaryPackagesFn = bumpAuxiliaryPackagesFn,
  spawnSync: typeof spawnSyncFn = spawnSyncFn
): Promise<void> {
  if (!shouldDoPublicRelease(config)) {
    console.warn(
      'mongosh: Not triggering publish - configuration does not match a public release!'
    );
    return;
  }

  if (config.isDryRun) {
    console.warn('Performing dry-run publish only');
  }

  const releaseVersion = getReleaseVersionFromTag(config.triggeringGitTag);
  const latestDraftTag =
    await mongoshGithubRepo.getMostRecentDraftTagForRelease(releaseVersion);
  if (!latestDraftTag || !releaseVersion) {
    throw new Error(
      `Could not find prior draft tag for release version: ${releaseVersion}`
    );
  }
  if (latestDraftTag.sha !== config.revision) {
    throw new Error(
      `Version mismatch - latest draft tag was for revision ${latestDraftTag.sha}, current revision is ${config.revision}`
    );
  }

  console.info(
    'mongosh: Re-using artifacts from most recent draft tag',
    latestDraftTag.name
  );

  bumpAuxiliaryPackages();
  await bumpMongoshReleasePackages(releaseVersion);
  commitBumpedPackages(spawnSync);
  pushTags({
    useAuxiliaryPackagesOnly: false,
    isDryRun: config.isDryRun || false,
  });

  await publishArtifactsToBarque(
    barque,
    config.project as string,
    releaseVersion,
    latestDraftTag.name,
    config.packageInformation as PackageInformationProvider,
    !!config.isDryRun,
    getEvergreenArtifactUrl
  );

  await createAndPublishDownloadCenterConfig(
    config.outputDir,
    config.packageInformation as PackageInformationProvider,
    config.downloadCenterAwsKey || '',
    config.downloadCenterAwsSecret || '',
    config.injectedJsonFeedFile || '',
    !!config.isDryRun,
    config.ctaConfig
  );

  await mongoshGithubRepo.promoteRelease(config);

  // ensures the segment api key to be present in the published packages
  await writeBuildInfo(config, 'packaged');

  publishToNpm({
    isDryRun: config.isDryRun,
  });

  await publishToHomebrew(
    homebrewCoreGithubRepo,
    mongodbHomebrewForkGithubRepo,
    config.version,
    `https://github.com/${mongoshGithubRepo.repo.owner}/${mongoshGithubRepo.repo.repo}/releases/tag/v${config.version}`,
    !!config.isDryRun
  );

  console.info('mongosh: finished release process.');
}

async function publishArtifactsToBarque(
  barque: Barque,
  project: string,
  releaseVersion: string,
  mostRecentDraftTag: string,
  packageInformation: PackageInformationProvider,
  isDryRun: boolean,
  getEvergreenArtifactUrl: typeof getArtifactUrlFn
): Promise<void> {
  const publishedPackages: string[] = [];
  for await (const variant of ALL_PACKAGE_VARIANTS) {
    const variantPackageInfo = packageInformation(variant);
    const packageFile = getPackageFile(variant, () => ({
      ...variantPackageInfo,
      metadata: {
        ...variantPackageInfo.metadata,
        version: releaseVersion,
      },
    }));
    const packageUrl = getEvergreenArtifactUrl(
      project,
      mostRecentDraftTag,
      packageFile.path
    );
    console.info(
      `mongosh: Considering publishing ${variant} artifact to barque ${packageUrl}`
    );
    const packageUrls = await barque.releaseToBarque(
      variant,
      packageUrl,
      isDryRun
    );
    for (const url of packageUrls) {
      console.info(` -> ${url}`);
    }
    publishedPackages.push(...packageUrls);
  }

  if (isDryRun) {
    console.warn('Not waiting for package availability in dry run...');
  } else {
    await barque.waitUntilPackagesAreAvailable(publishedPackages, 300);
  }

  console.info('mongosh: Submitting to barque complete');
}
