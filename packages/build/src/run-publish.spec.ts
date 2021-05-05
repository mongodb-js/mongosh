import chai, { expect } from 'chai';
import path from 'path';
import sinon from 'ts-sinon';
import type { writeAnalyticsConfig as writeAnalyticsConfigType } from './analytics';
import { Barque } from './barque';
import { Config, shouldDoPublicRelease as shouldDoPublicReleaseFn } from './config';
import { createAndPublishDownloadCenterConfig as createAndPublishDownloadCenterConfigFn } from './download-center';
import { GithubRepo } from './github-repo';
import type { publishToHomebrew as publishToHomebrewType } from './homebrew';
import type { publishNpmPackages as publishNpmPackagesType } from './npm-packages';
import { PackageInformation } from './packaging';
import { runPublish } from './run-publish';

chai.use(require('sinon-chai'));

function createStubRepo(overrides?: any): GithubRepo {
  return sinon.createStubInstance(GithubRepo, overrides) as unknown as GithubRepo;
}

function createStubBarque(overrides?: any): Barque {
  return sinon.createStubInstance(Barque, overrides) as unknown as Barque;
}

describe('publish', () => {
  let config: Config;
  let createAndPublishDownloadCenterConfig: typeof createAndPublishDownloadCenterConfigFn;
  let publishNpmPackages: typeof publishNpmPackagesType;
  let writeAnalyticsConfig: typeof writeAnalyticsConfigType;
  let publishToHomebrew: typeof publishToHomebrewType;
  let shouldDoPublicRelease: typeof shouldDoPublicReleaseFn;
  let githubRepo: GithubRepo;
  let mongoHomebrewRepo: GithubRepo;
  let barque: Barque;

  beforeEach(() => {
    config = {
      version: 'version',
      appleNotarizationBundleId: 'appleNotarizationBundleId',
      input: 'input',
      execInput: 'execInput',
      executablePath: 'executablePath',
      mongocryptdPath: 'mongocryptdPath',
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
      repo: {
        owner: 'owner',
        repo: 'repo',
      },
      packageInformation: {
        metadata: {
          name: 'mongosh',
          rpmName: 'mongodb-mongosh',
          debName: 'mongodb-mongosh',
          version: 'packageVersion',
          description: 'The best shell you ever had.',
          homepage: 'https://mongodb.com',
          maintainer: 'We, us, everyone.'
        }
      } as PackageInformation,
      execNodeVersion: process.version,
      rootDir: path.resolve(__dirname, '..', '..')
    };

    createAndPublishDownloadCenterConfig = sinon.spy();
    publishNpmPackages = sinon.spy();
    writeAnalyticsConfig = sinon.spy();
    publishToHomebrew = sinon.spy();
    shouldDoPublicRelease = sinon.spy();
    githubRepo = createStubRepo();
    mongoHomebrewRepo = createStubRepo();
    barque = createStubBarque({
      releaseToBarque: sinon.stub().resolves(['package-url']),
      waitUntilPackagesAreAvailable: sinon.stub().resolves()
    });
  });

  context('if is a public release', () => {
    beforeEach(() => {
      config.triggeringGitTag = 'v0.7.0';
      shouldDoPublicRelease = sinon.stub().returns(true);
      githubRepo = createStubRepo({
        getMostRecentDraftTagForRelease: sinon.stub().resolves({ name: 'v0.7.0-draft.42', sha: 'revision' })
      });
    });

    context('validates configuration', () => {
      it('fails if no draft tag is found', async() => {
        githubRepo = createStubRepo({
          getMostRecentDraftTagForRelease: sinon.stub().resolves(undefined)
        });
        try {
          await runPublish(
            config,
            githubRepo,
            mongoHomebrewRepo,
            barque,
            createAndPublishDownloadCenterConfig,
            publishNpmPackages,
            writeAnalyticsConfig,
            publishToHomebrew,
            shouldDoPublicRelease
          );
        } catch (e) {
          return expect(e.message).to.contain('Could not find prior draft tag');
        }
        expect.fail('Expected error');
      });

      it('fails if draft tag SHA does not match revision', async() => {
        githubRepo = createStubRepo({
          getMostRecentDraftTagForRelease: sinon.stub().resolves({ name: 'v0.7.0-draft.42', sha: 'wrong' })
        });
        try {
          await runPublish(
            config,
            githubRepo,
            mongoHomebrewRepo,
            barque,
            createAndPublishDownloadCenterConfig,
            publishNpmPackages,
            writeAnalyticsConfig,
            publishToHomebrew,
            shouldDoPublicRelease
          );
        } catch (e) {
          return expect(e.message).to.contain('Version mismatch');
        }
        expect.fail('Expected error');
      });

      it('fails if package name is missing', async() => {
        config.packageInformation = {
          metadata: {}
        } as any;
        try {
          await runPublish(
            config,
            githubRepo,
            mongoHomebrewRepo,
            barque,
            createAndPublishDownloadCenterConfig,
            publishNpmPackages,
            writeAnalyticsConfig,
            publishToHomebrew,
            shouldDoPublicRelease
          );
        } catch (e) {
          return expect(e.message).to.contain('Missing package name');
        }
        expect.fail('Expected error');
      });
    });

    it('publishes artifacts to barque', async() => {
      await runPublish(
        config,
        githubRepo,
        mongoHomebrewRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishNpmPackages,
        writeAnalyticsConfig,
        publishToHomebrew,
        shouldDoPublicRelease
      );

      expect(barque.releaseToBarque).to.have.been.callCount(2);
      expect(barque.releaseToBarque).to.have.been.calledWith(
        'rhel-x64',
        'https://s3.amazonaws.com/mciuploads/project/v0.7.0-draft.42/mongodb-mongosh-0.7.0-x86_64.rpm'
      );
      expect(barque.releaseToBarque).to.have.been.calledWith(
        'debian-x64',
        'https://s3.amazonaws.com/mciuploads/project/v0.7.0-draft.42/mongodb-mongosh_0.7.0_amd64.deb'
      );
      expect(barque.waitUntilPackagesAreAvailable).to.have.been.called;
    });

    it('updates the download center config', async() => {
      await runPublish(
        config,
        githubRepo,
        mongoHomebrewRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishNpmPackages,
        writeAnalyticsConfig,
        publishToHomebrew,
        shouldDoPublicRelease
      );

      expect(createAndPublishDownloadCenterConfig).to.have.been.calledWith(
        config.version,
        config.downloadCenterAwsKey,
        config.downloadCenterAwsSecret
      );
    });

    it('promotes the release in github', async() => {
      await runPublish(
        config,
        githubRepo,
        mongoHomebrewRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishNpmPackages,
        writeAnalyticsConfig,
        publishToHomebrew,
        shouldDoPublicRelease
      );

      expect(githubRepo.promoteRelease).to.have.been.calledWith(config);
    });

    it('writes analytics config and then publishes NPM packages', async() => {
      await runPublish(
        config,
        githubRepo,
        mongoHomebrewRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishNpmPackages,
        writeAnalyticsConfig,
        publishToHomebrew,
        shouldDoPublicRelease
      );

      expect(writeAnalyticsConfig).to.have.been.calledOnceWith(
        config.analyticsConfigFilePath,
        config.segmentKey
      );
      expect(publishNpmPackages).to.have.been.calledWith();
      expect(publishNpmPackages).to.have.been.calledAfter(writeAnalyticsConfig as any);
    });
    it('publishes to homebrew', async() => {
      await runPublish(
        config,
        githubRepo,
        mongoHomebrewRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishNpmPackages,
        writeAnalyticsConfig,
        publishToHomebrew,
        shouldDoPublicRelease
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
      shouldDoPublicRelease = sinon.stub().returns(false);
    });

    it('does not update the download center config', async() => {
      await runPublish(
        config,
        githubRepo,
        mongoHomebrewRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishNpmPackages,
        writeAnalyticsConfig,
        publishToHomebrew,
        shouldDoPublicRelease
      );

      expect(createAndPublishDownloadCenterConfig).not.to.have.been.called;
    });

    it('does not promote the release in github', async() => {
      await runPublish(
        config,
        githubRepo,
        mongoHomebrewRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishNpmPackages,
        writeAnalyticsConfig,
        publishToHomebrew,
        shouldDoPublicRelease
      );

      expect(githubRepo.promoteRelease).not.to.have.been.called;
    });

    it('does not publish npm packages', async() => {
      await runPublish(
        config,
        githubRepo,
        mongoHomebrewRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishNpmPackages,
        writeAnalyticsConfig,
        publishToHomebrew,
        shouldDoPublicRelease
      );

      expect(publishNpmPackages).not.to.have.been.called;
    });

    it('does not publish to homebrew', async() => {
      await runPublish(
        config,
        githubRepo,
        mongoHomebrewRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishNpmPackages,
        writeAnalyticsConfig,
        publishToHomebrew,
        shouldDoPublicRelease
      );

      expect(publishToHomebrew).not.to.have.been.called;
    });

    it('does not release to barque', async() => {
      await runPublish(
        config,
        githubRepo,
        mongoHomebrewRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishNpmPackages,
        writeAnalyticsConfig,
        publishToHomebrew,
        shouldDoPublicRelease
      );

      expect(barque.releaseToBarque).not.to.have.been.called;
    });
  });
});
