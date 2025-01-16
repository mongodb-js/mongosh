import { writeBuildInfo as writeBuildInfoType } from './build-info';
import { Barque } from './barque';
import type { Config } from './config';
import {
  ALL_PACKAGE_VARIANTS,
  getReleaseVersionFromTag,
  shouldDoPublicRelease as shouldDoPublicReleaseFn,
} from './config';
import { createAndPublishDownloadCenterConfig as createAndPublishDownloadCenterConfigFn } from './download-center';
import { getArtifactUrl as getArtifactUrlFn } from './evergreen';
import type { GithubRepo } from '@mongodb-js/devtools-github-repo';
import { publishToHomebrew as publishToHomebrewFn } from './homebrew';
import type { PackageInformationProvider } from './packaging';
import { getPackageFile } from './packaging';
import { NpmPublisher } from './npm-packages';

export class MongoshPublisher {
  createAndPublishDownloadCenterConfig = createAndPublishDownloadCenterConfigFn;
  writeBuildInfo = writeBuildInfoType;
  publishToHomebrew = publishToHomebrewFn;
  shouldDoPublicRelease = shouldDoPublicReleaseFn;
  getEvergreenArtifactUrl = getArtifactUrlFn;

  config: Config;
  mongoshGithubRepo: GithubRepo;
  mongoHomebrewForkRepo: GithubRepo;
  homebrewCoreRepo: GithubRepo;
  npmPublisher: NpmPublisher;

  constructor(
    config: Config,
    githubRepo: GithubRepo,
    mongoHomebrewForkRepo: GithubRepo,
    homebrewCoreRepo: GithubRepo
  ) {
    this.config = config;
    this.npmPublisher = new NpmPublisher(config);
    this.mongoshGithubRepo = githubRepo;
    this.mongoHomebrewForkRepo = mongoHomebrewForkRepo;
    this.homebrewCoreRepo = homebrewCoreRepo;
  }

  async publish() {
    if (this.config.useAuxiliaryPackagesOnly === false) {
      const barque = new Barque(this.config);
      await this.publishMongosh(barque);
    } else {
      await this.publishAuxiliaryPackages();
    }
  }

  async publishAuxiliaryPackages() {
    if (!this.config.useAuxiliaryPackagesOnly) {
      throw new Error(
        'This should only be used when publishing auxiliary packages'
      );
    }
    await this.npmPublisher.publish();
  }

  async publishMongosh(barque: Barque): Promise<void> {
    const config = this.config;
    if (!this.shouldDoPublicRelease(config)) {
      console.warn(
        'mongosh: Not triggering publish - configuration does not match a public release!'
      );
      return;
    }

    const releaseVersion = getReleaseVersionFromTag(config.triggeringGitTag);
    const latestDraftTag =
      await this.mongoshGithubRepo.getMostRecentDraftTagForRelease(
        releaseVersion
      );
    if (!latestDraftTag || !releaseVersion) {
      throw new Error(
        `Could not find prior draft tag for release version: ${
          releaseVersion ?? 'unknown'
        }`
      );
    }
    if (latestDraftTag.sha !== config.revision) {
      throw new Error(
        `Version mismatch - latest draft tag was for revision ${
          latestDraftTag.sha
        }, current revision is ${config.revision ?? 'unknown'}`
      );
    }

    console.info(
      'mongosh: Re-using artifacts from most recent draft tag',
      latestDraftTag.name
    );

    await this.publishArtifactsToBarque(
      barque,
      config.project as string,
      releaseVersion,
      latestDraftTag.name,
      config.packageInformation as PackageInformationProvider,
      !!config.isDryRun
    );

    await this.createAndPublishDownloadCenterConfig(
      config.outputDir,
      config.packageInformation as PackageInformationProvider,
      config.downloadCenterAwsKey || '',
      config.downloadCenterAwsSecret || '',
      config.injectedJsonFeedFile || '',
      !!config.isDryRun
    );

    await this.mongoshGithubRepo.promoteRelease(config);

    // ensures the segment api key to be present in the published packages
    await this.writeBuildInfo(config, 'packaged');

    await this.npmPublisher.publish();

    await this.publishToHomebrew(
      this.homebrewCoreRepo,
      this.mongoHomebrewForkRepo,
      config.version,
      `https://github.com/${this.mongoshGithubRepo.repo.owner}/${this.mongoshGithubRepo.repo.repo}/releases/tag/v${config.version}`,
      !!config.isDryRun
    );

    console.info('mongosh: finished release process.');
  }

  async publishArtifactsToBarque(
    barque: Barque,
    project: string,
    releaseVersion: string,
    mostRecentDraftTag: string,
    packageInformation: PackageInformationProvider,
    isDryRun: boolean
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
      const packageUrl = this.getEvergreenArtifactUrl(
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
}
