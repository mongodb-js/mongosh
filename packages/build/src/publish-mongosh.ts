import { writeBuildInfo as writeBuildInfoFn } from './build-info';
import { Barque } from './barque';
import type { Config } from './config';
import {
  ALL_PACKAGE_VARIANTS,
  getReleaseVersionFromTag,
  shouldDoPublicRelease as shouldDoPublicReleaseFn,
} from './config';
import { createAndPublishDownloadCenterConfig as createAndPublishDownloadCenterConfigFn } from './download-center';
import { getArtifactUrl as getArtifactUrlFn } from './evergreen';
import { GithubRepo } from '@mongodb-js/devtools-github-repo';
import type { PackageInformationProvider } from './packaging';
import { getPackageFile } from './packaging';
import { PackagePublisher } from './npm-packages';
import { PackageBumper } from './npm-packages/bump';
import { HomebrewPublisher } from './homebrew';
import type { Octokit } from '@octokit/rest';

export async function publishMongosh(config: Config, octokit: Octokit) {
  const githubRepo = new GithubRepo(config.repo, octokit);
  const homebrewCoreRepo = new GithubRepo(
    { owner: 'Homebrew', repo: 'homebrew-core' },
    octokit
  );
  const mongoHomebrewForkRepo = new GithubRepo(
    { owner: 'mongodb-js', repo: 'homebrew-core' },
    octokit
  );

  const homebrewPublisher = new HomebrewPublisher({
    homebrewCore: homebrewCoreRepo,
    homebrewCoreFork: mongoHomebrewForkRepo,
    packageVersion: config.version,
    githubReleaseLink: `https://github.com/${githubRepo.repo.owner}/${githubRepo.repo.repo}/releases/tag/v${config.version}`,
    isDryRun: config.isDryRun || false,
  });

  const publisher = new MongoshPublisher(
    config,
    new Barque(config),
    githubRepo,
    new PackagePublisher(config),
    new PackageBumper(),
    homebrewPublisher
  );

  await publisher.publish();
}

export class MongoshPublisher {
  private readonly getEvergreenArtifactUrl: typeof getArtifactUrlFn;
  private readonly writeBuildInfo: typeof writeBuildInfoFn;
  private readonly createAndPublishDownloadCenterConfig: typeof createAndPublishDownloadCenterConfigFn;
  private readonly shouldDoPublicRelease: typeof shouldDoPublicReleaseFn;

  constructor(
    public config: Config,
    public barque: Barque,
    public mongoshGithubRepo: GithubRepo,
    public packagePublisher: PackagePublisher,
    public packageBumper: PackageBumper,
    public homebrewPublisher: HomebrewPublisher,
    {
      getEvergreenArtifactUrl = getArtifactUrlFn,
      writeBuildInfo = writeBuildInfoFn,
      createAndPublishDownloadCenterConfig = createAndPublishDownloadCenterConfigFn,
      shouldDoPublicRelease = shouldDoPublicReleaseFn,
    } = {}
  ) {
    this.getEvergreenArtifactUrl = getEvergreenArtifactUrl;
    this.writeBuildInfo = writeBuildInfo;
    this.createAndPublishDownloadCenterConfig =
      createAndPublishDownloadCenterConfig;
    this.shouldDoPublicRelease = shouldDoPublicRelease;
  }

  async publish(): Promise<void> {
    const { config, mongoshGithubRepo } = this;

    if (!this.shouldDoPublicRelease(config)) {
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
      await this.mongoshGithubRepo.getMostRecentDraftTagForRelease(
        releaseVersion
      );
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

    this.packageBumper.bumpAuxiliaryPackages();
    await this.packageBumper.bumpMongoshReleasePackages(releaseVersion);
    this.packageBumper.commitBumpedPackages();

    this.packagePublisher.pushTags();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await this.publishArtifactsToBarque(releaseVersion, latestDraftTag.name);

    await this.createAndPublishDownloadCenterConfig(
      config.outputDir,
      config.packageInformation as PackageInformationProvider,
      config.downloadCenterAwsKey || '',
      config.downloadCenterAwsSecret || '',
      config.downloadCenterAwsKeyNew || '',
      config.downloadCenterAwsSecretNew || '',
      config.downloadCenterAwsSessionTokenNew || '',
      config.injectedJsonFeedFile || '',
      !!config.isDryRun,
      config.ctaConfig
    );

    await mongoshGithubRepo.promoteRelease(config);

    // ensures the segment api key to be present in the published packages
    await this.writeBuildInfo(config, 'packaged');

    this.packagePublisher.publishToNpm();

    await this.homebrewPublisher.publish();

    console.info('mongosh: finished release process.');
  }

  async publishArtifactsToBarque(
    releaseVersion: string,
    mostRecentDraftTag: string
  ): Promise<void> {
    const { barque } = this;
    const { project, isDryRun, packageInformation } = this.config;

    if (!project) {
      throw new Error('project not specified');
    }
    if (!packageInformation) {
      throw new Error('packageInformation not specified');
    }

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
        isDryRun || false
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
