import chai, { expect } from 'chai';
import path from 'path';
import sinon from 'ts-sinon';
import type writeAnalyticsConfigType from './analytics';
import Config from './config';
import type uploadDownloadCenterConfigType from './download-center';
import { GithubRepo } from './github-repo';
import type { publishToHomebrew as publishToHomebrewType } from './homebrew';
import type { publishNpmPackages as publishNpmPackagesType } from './npm-packages';
import publish from './publish';

chai.use(require('sinon-chai'));

function createStubRepo(overrides?: any): GithubRepo {
  return sinon.createStubInstance(GithubRepo, overrides) as unknown as GithubRepo;
}

describe('publish', () => {
  let config: Config;
  let uploadDownloadCenterConfig: typeof uploadDownloadCenterConfigType;
  let publishNpmPackages: typeof publishNpmPackagesType;
  let writeAnalyticsConfig: typeof writeAnalyticsConfigType;
  let publishToHomebrew: typeof publishToHomebrewType;
  let githubRepo: GithubRepo;
  let mongoHomebrewRepo: GithubRepo;

  beforeEach(() => {
    config = {
      version: 'version',
      appleNotarizationBundleId: 'appleNotarizationBundleId',
      input: 'input',
      execInput: 'execInput',
      outputDir: 'outputDir',
      analyticsConfigFilePath: 'analyticsConfigFilePath',
      project: 'project',
      revision: 'revision',
      branch: 'branch',
      evgAwsKey: 'evgAwsKey',
      evgAwsSecret: 'evgAwsSecret',
      downloadCenterAwsKey: 'downloadCenterAwsKey',
      downloadCenterAwsSecret: 'downloadCenterAwsSecret',
      githubToken: 'githubToken',
      segmentKey: 'segmentKey',
      appleNotarizationUsername: 'appleNotarizationUsername',
      appleNotarizationApplicationPassword: 'appleNotarizationApplicationPassword',
      appleCodesignIdentity: 'appleCodesignIdentity',
      isCi: true,
      platform: 'platform',
      buildVariant: 'linux',
      repo: {
        owner: 'owner',
        repo: 'repo',
      },
      execNodeVersion: process.version,
      rootDir: path.resolve(__dirname, '..', '..')
    };

    uploadDownloadCenterConfig = sinon.spy();
    publishNpmPackages = sinon.spy();
    writeAnalyticsConfig = sinon.spy();
    publishToHomebrew = sinon.spy();
    githubRepo = createStubRepo();
    mongoHomebrewRepo = createStubRepo();
  });

  context('if is a public release', () => {
    beforeEach(() => {
      githubRepo = createStubRepo({
        shouldDoPublicRelease: sinon.stub().returns(Promise.resolve(true))
      });
    });

    it('updates the download center config', async() => {
      await publish(
        config,
        githubRepo,
        mongoHomebrewRepo,
        uploadDownloadCenterConfig,
        publishNpmPackages,
        writeAnalyticsConfig,
        publishToHomebrew
      );

      expect(uploadDownloadCenterConfig).to.have.been.calledWith(
        config.version,
        config.downloadCenterAwsKey,
        config.downloadCenterAwsSecret
      );
    });

    it('promotes the release in github', async() => {
      await publish(
        config,
        githubRepo,
        mongoHomebrewRepo,
        uploadDownloadCenterConfig,
        publishNpmPackages,
        writeAnalyticsConfig,
        publishToHomebrew
      );

      expect(githubRepo.promoteRelease).to.have.been.calledWith(config);
    });

    it('writes analytics config and then publishes NPM packages', async() => {
      await publish(
        config,
        githubRepo,
        mongoHomebrewRepo,
        uploadDownloadCenterConfig,
        publishNpmPackages,
        writeAnalyticsConfig,
        publishToHomebrew
      );

      expect(writeAnalyticsConfig).to.have.been.calledOnceWith(
        config.analyticsConfigFilePath,
        config.segmentKey
      );
      expect(publishNpmPackages).to.have.been.calledWith();
      expect(publishNpmPackages).to.have.been.calledAfter(writeAnalyticsConfig as any);
    });
    it('publishes to homebrew', async() => {
      await publish(
        config,
        githubRepo,
        mongoHomebrewRepo,
        uploadDownloadCenterConfig,
        publishNpmPackages,
        writeAnalyticsConfig,
        publishToHomebrew
      );

      expect(publishToHomebrew).to.have.been.calledWith(
        mongoHomebrewRepo,
        config.version
      );
      expect(publishToHomebrew).to.have.been.calledAfter(githubRepo.promoteRelease as any);
    });
  });

  context('if is not a public release', () => {
    beforeEach(() => {
      githubRepo = createStubRepo({
        shouldDoPublicRelease: sinon.stub().returns(Promise.resolve(false))
      });
    });

    it('does not update the download center config', async() => {
      await publish(
        config,
        githubRepo,
        mongoHomebrewRepo,
        uploadDownloadCenterConfig,
        publishNpmPackages,
        writeAnalyticsConfig,
        publishToHomebrew
      );

      expect(uploadDownloadCenterConfig).not.to.have.been.called;
    });

    it('does not promote the release in github', async() => {
      await publish(
        config,
        githubRepo,
        mongoHomebrewRepo,
        uploadDownloadCenterConfig,
        publishNpmPackages,
        writeAnalyticsConfig,
        publishToHomebrew
      );

      expect(githubRepo.promoteRelease).not.to.have.been.called;
    });

    it('does not publish npm packages', async() => {
      await publish(
        config,
        githubRepo,
        mongoHomebrewRepo,
        uploadDownloadCenterConfig,
        publishNpmPackages,
        writeAnalyticsConfig,
        publishToHomebrew
      );

      expect(publishNpmPackages).not.to.have.been.called;
    });

    it('does not publish to homebrew', async() => {
      await publish(
        config,
        githubRepo,
        mongoHomebrewRepo,
        uploadDownloadCenterConfig,
        publishNpmPackages,
        writeAnalyticsConfig,
        publishToHomebrew
      );

      expect(publishToHomebrew).not.to.have.been.called;
    });
  });
});
