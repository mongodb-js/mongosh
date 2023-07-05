import chai, { expect } from 'chai';
import sinon from 'ts-sinon';
import type { writeBuildInfo as writeBuildInfoType } from './build-info';
import { Barque } from './barque';
import type {
  Config,
  shouldDoPublicRelease as shouldDoPublicReleaseFn,
} from './config';
import type { createAndPublishDownloadCenterConfig as createAndPublishDownloadCenterConfigFn } from './download-center';
import { GithubRepo } from '@mongodb-js/devtools-github-repo';
import type { publishToHomebrew as publishToHomebrewType } from './homebrew';
import type { publishNpmPackages as publishNpmPackagesType } from './npm-packages';
import { runPublish } from './run-publish';
import { dummyConfig } from '../test/helpers';

chai.use(require('sinon-chai'));

function createStubRepo(overrides?: any): GithubRepo {
  return sinon.createStubInstance(
    GithubRepo,
    overrides
  ) as unknown as GithubRepo;
}

function createStubBarque(overrides?: any): Barque {
  return sinon.createStubInstance(Barque, overrides) as unknown as Barque;
}

describe('publish', function () {
  let config: Config;
  let createAndPublishDownloadCenterConfig: typeof createAndPublishDownloadCenterConfigFn;
  let publishNpmPackages: typeof publishNpmPackagesType;
  let writeBuildInfo: typeof writeBuildInfoType;
  let publishToHomebrew: typeof publishToHomebrewType;
  let shouldDoPublicRelease: typeof shouldDoPublicReleaseFn;
  let githubRepo: GithubRepo;
  let mongoHomebrewCoreForkRepo: GithubRepo;
  let homebrewCoreRepo: GithubRepo;
  let barque: Barque;

  beforeEach(function () {
    config = { ...dummyConfig };

    createAndPublishDownloadCenterConfig = sinon.spy();
    publishNpmPackages = sinon.spy();
    writeBuildInfo = sinon.spy();
    publishToHomebrew = sinon.spy();
    shouldDoPublicRelease = sinon.spy();
    githubRepo = createStubRepo();
    mongoHomebrewCoreForkRepo = createStubRepo();
    homebrewCoreRepo = createStubRepo();
    barque = createStubBarque({
      releaseToBarque: sinon.stub().resolves(['package-url']),
      waitUntilPackagesAreAvailable: sinon.stub().resolves(),
    });
  });

  context('if is a public release', function () {
    beforeEach(function () {
      config.triggeringGitTag = 'v0.7.0';
      shouldDoPublicRelease = sinon.stub().returns(true);
      githubRepo = createStubRepo({
        getMostRecentDraftTagForRelease: sinon
          .stub()
          .resolves({ name: 'v0.7.0-draft.42', sha: 'revision' }),
      });
      Object.assign(githubRepo, {
        repo: {
          owner: 'mongodb-js',
          repo: 'mongosh',
        },
      });
    });

    context('validates configuration', function () {
      it('fails if no draft tag is found', async function () {
        githubRepo = createStubRepo({
          getMostRecentDraftTagForRelease: sinon.stub().resolves(undefined),
        });
        try {
          await runPublish(
            config,
            githubRepo,
            mongoHomebrewCoreForkRepo,
            homebrewCoreRepo,
            barque,
            createAndPublishDownloadCenterConfig,
            publishNpmPackages,
            writeBuildInfo,
            publishToHomebrew,
            shouldDoPublicRelease
          );
        } catch (e: any) {
          return expect(e.message).to.contain('Could not find prior draft tag');
        }
        expect.fail('Expected error');
      });

      it('fails if draft tag SHA does not match revision', async function () {
        githubRepo = createStubRepo({
          getMostRecentDraftTagForRelease: sinon
            .stub()
            .resolves({ name: 'v0.7.0-draft.42', sha: 'wrong' }),
        });
        try {
          await runPublish(
            config,
            githubRepo,
            mongoHomebrewCoreForkRepo,
            homebrewCoreRepo,
            barque,
            createAndPublishDownloadCenterConfig,
            publishNpmPackages,
            writeBuildInfo,
            publishToHomebrew,
            shouldDoPublicRelease
          );
        } catch (e: any) {
          return expect(e.message).to.contain('Version mismatch');
        }
        expect.fail('Expected error');
      });
    });

    it('publishes artifacts to barque', async function () {
      await runPublish(
        config,
        githubRepo,
        mongoHomebrewCoreForkRepo,
        homebrewCoreRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishNpmPackages,
        writeBuildInfo,
        publishToHomebrew,
        shouldDoPublicRelease
      );

      expect(barque.releaseToBarque).to.have.been.callCount(23);
      expect(barque.releaseToBarque).to.have.been.calledWith(
        'rpm-x64',
        'https://s3.amazonaws.com/mciuploads/project/v0.7.0-draft.42/mongodb-mongosh-0.7.0.x86_64.rpm'
      );
      expect(barque.releaseToBarque).to.have.been.calledWith(
        'deb-x64',
        'https://s3.amazonaws.com/mciuploads/project/v0.7.0-draft.42/mongodb-mongosh_0.7.0_amd64.deb'
      );
      expect(barque.releaseToBarque).to.have.been.calledWith(
        'rpm-arm64',
        'https://s3.amazonaws.com/mciuploads/project/v0.7.0-draft.42/mongodb-mongosh-0.7.0.aarch64.rpm'
      );
      expect(barque.waitUntilPackagesAreAvailable).to.have.been.called;
    });

    it('updates the download center config', async function () {
      await runPublish(
        config,
        githubRepo,
        mongoHomebrewCoreForkRepo,
        homebrewCoreRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishNpmPackages,
        writeBuildInfo,
        publishToHomebrew,
        shouldDoPublicRelease
      );

      expect(createAndPublishDownloadCenterConfig).to.have.been.calledWith(
        config.packageInformation,
        config.downloadCenterAwsKey,
        config.downloadCenterAwsSecret
      );
    });

    it('promotes the release in github', async function () {
      await runPublish(
        config,
        githubRepo,
        mongoHomebrewCoreForkRepo,
        homebrewCoreRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishNpmPackages,
        writeBuildInfo,
        publishToHomebrew,
        shouldDoPublicRelease
      );

      expect(githubRepo.promoteRelease).to.have.been.calledWith(config);
    });

    it('writes analytics config and then publishes NPM packages', async function () {
      await runPublish(
        config,
        githubRepo,
        mongoHomebrewCoreForkRepo,
        homebrewCoreRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishNpmPackages,
        writeBuildInfo,
        publishToHomebrew,
        shouldDoPublicRelease
      );

      expect(writeBuildInfo).to.have.been.calledOnceWith(config);
      expect(publishNpmPackages).to.have.been.calledWith();
      expect(publishNpmPackages).to.have.been.calledAfter(
        writeBuildInfo as any
      );
    });
    it('publishes to homebrew', async function () {
      await runPublish(
        config,
        githubRepo,
        mongoHomebrewCoreForkRepo,
        homebrewCoreRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishNpmPackages,
        writeBuildInfo,
        publishToHomebrew,
        shouldDoPublicRelease
      );

      expect(publishToHomebrew).to.have.been.calledWith(
        homebrewCoreRepo,
        mongoHomebrewCoreForkRepo,
        config.version
      );
      expect(publishToHomebrew).to.have.been.calledAfter(
        githubRepo.promoteRelease as any
      );
    });
  });

  context('if is not a public release', function () {
    beforeEach(function () {
      shouldDoPublicRelease = sinon.stub().returns(false);
    });

    it('does not update the download center config', async function () {
      await runPublish(
        config,
        githubRepo,
        mongoHomebrewCoreForkRepo,
        homebrewCoreRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishNpmPackages,
        writeBuildInfo,
        publishToHomebrew,
        shouldDoPublicRelease
      );

      expect(createAndPublishDownloadCenterConfig).not.to.have.been.called;
    });

    it('does not promote the release in github', async function () {
      await runPublish(
        config,
        githubRepo,
        mongoHomebrewCoreForkRepo,
        homebrewCoreRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishNpmPackages,
        writeBuildInfo,
        publishToHomebrew,
        shouldDoPublicRelease
      );

      expect(githubRepo.promoteRelease).not.to.have.been.called;
    });

    it('does not publish npm packages', async function () {
      await runPublish(
        config,
        githubRepo,
        mongoHomebrewCoreForkRepo,
        homebrewCoreRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishNpmPackages,
        writeBuildInfo,
        publishToHomebrew,
        shouldDoPublicRelease
      );

      expect(publishNpmPackages).not.to.have.been.called;
    });

    it('does not publish to homebrew', async function () {
      await runPublish(
        config,
        githubRepo,
        mongoHomebrewCoreForkRepo,
        homebrewCoreRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishNpmPackages,
        writeBuildInfo,
        publishToHomebrew,
        shouldDoPublicRelease
      );

      expect(publishToHomebrew).not.to.have.been.called;
    });

    it('does not release to barque', async function () {
      await runPublish(
        config,
        githubRepo,
        mongoHomebrewCoreForkRepo,
        homebrewCoreRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishNpmPackages,
        writeBuildInfo,
        publishToHomebrew,
        shouldDoPublicRelease
      );

      expect(barque.releaseToBarque).not.to.have.been.called;
    });
  });
});
