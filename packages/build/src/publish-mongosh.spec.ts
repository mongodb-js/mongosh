import chai, { expect } from 'chai';
import sinon from 'sinon';
import type { writeBuildInfo as writeBuildInfoType } from './build-info';
import { Barque } from './barque';
import type {
  Config,
  shouldDoPublicRelease as shouldDoPublicReleaseFn,
} from './config';
import type { createAndPublishDownloadCenterConfig as createAndPublishDownloadCenterConfigFn } from './download-center';
import { GithubRepo } from '@mongodb-js/devtools-github-repo';
import type { publishToHomebrew as publishToHomebrewType } from './homebrew';
import {
  type publishToNpm as publishToNpmType,
  type pushTags as pushTagsType,
} from './npm-packages';
import type {
  bumpMongoshReleasePackages as bumpMongoshReleasePackagesFn,
  bumpAuxiliaryPackages as bumpAuxiliaryPackagesFn,
} from './npm-packages';
import { publishMongosh } from './publish-mongosh';
import { dummyConfig } from '../test/helpers';
import { getArtifactUrl } from './evergreen';

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

describe('publishMongosh', function () {
  let config: Config;
  let createAndPublishDownloadCenterConfig: typeof createAndPublishDownloadCenterConfigFn;
  let publishToNpm: typeof publishToNpmType;
  let writeBuildInfo: typeof writeBuildInfoType;
  let publishToHomebrew: typeof publishToHomebrewType;
  let shouldDoPublicRelease: typeof shouldDoPublicReleaseFn;
  let bumpMongoshReleasePackages: typeof bumpMongoshReleasePackagesFn;
  let bumpAuxiliaryPackages: typeof bumpAuxiliaryPackagesFn;
  let githubRepo: GithubRepo;
  let mongoHomebrewCoreForkRepo: GithubRepo;
  let homebrewCoreRepo: GithubRepo;
  let barque: Barque;
  let pushTags: typeof pushTagsType;
  const getEvergreenArtifactUrl = getArtifactUrl;
  let spawnSync: sinon.SinonStub;

  beforeEach(function () {
    config = { ...dummyConfig };

    createAndPublishDownloadCenterConfig = sinon.spy();
    publishToNpm = sinon.spy();
    writeBuildInfo = sinon.spy();
    publishToHomebrew = sinon.spy();
    shouldDoPublicRelease = sinon.spy();
    pushTags = sinon.spy();
    bumpMongoshReleasePackages = sinon.spy();
    bumpAuxiliaryPackages = sinon.spy();
    spawnSync = sinon.stub().resolves();

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
          await publishMongosh(
            config,
            githubRepo,
            mongoHomebrewCoreForkRepo,
            homebrewCoreRepo,
            barque,
            createAndPublishDownloadCenterConfig,
            publishToNpm,
            pushTags,
            writeBuildInfo,
            publishToHomebrew,
            shouldDoPublicRelease,
            getEvergreenArtifactUrl,
            bumpMongoshReleasePackages,
            bumpAuxiliaryPackages,
            spawnSync
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
          await publishMongosh(
            config,
            githubRepo,
            mongoHomebrewCoreForkRepo,
            homebrewCoreRepo,
            barque,
            createAndPublishDownloadCenterConfig,
            publishToNpm,
            pushTags,
            writeBuildInfo,
            publishToHomebrew,
            shouldDoPublicRelease,
            getEvergreenArtifactUrl,
            bumpMongoshReleasePackages,
            bumpAuxiliaryPackages,
            spawnSync
          );
        } catch (e: any) {
          return expect(e.message).to.contain('Version mismatch');
        }
        expect.fail('Expected error');
      });
    });

    it('publishes artifacts to barque', async function () {
      await publishMongosh(
        config,
        githubRepo,
        mongoHomebrewCoreForkRepo,
        homebrewCoreRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishToNpm,
        pushTags,
        writeBuildInfo,
        publishToHomebrew,
        shouldDoPublicRelease,
        getEvergreenArtifactUrl,
        bumpMongoshReleasePackages,
        bumpAuxiliaryPackages,
        spawnSync
      );

      expect(barque.releaseToBarque).to.have.been.callCount(26);
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
      await publishMongosh(
        config,
        githubRepo,
        mongoHomebrewCoreForkRepo,
        homebrewCoreRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishToNpm,
        pushTags,
        writeBuildInfo,
        publishToHomebrew,
        shouldDoPublicRelease,
        getEvergreenArtifactUrl,
        bumpMongoshReleasePackages,
        bumpAuxiliaryPackages,
        spawnSync
      );

      expect(createAndPublishDownloadCenterConfig).to.have.been.calledWith(
        config.outputDir,
        config.packageInformation,
        config.downloadCenterAwsKey,
        config.downloadCenterAwsSecret
      );
    });

    it('promotes the release in github', async function () {
      await publishMongosh(
        config,
        githubRepo,
        mongoHomebrewCoreForkRepo,
        homebrewCoreRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishToNpm,
        pushTags,
        writeBuildInfo,
        publishToHomebrew,
        shouldDoPublicRelease,
        getEvergreenArtifactUrl,
        bumpMongoshReleasePackages,
        bumpAuxiliaryPackages,
        spawnSync
      );

      expect(githubRepo.promoteRelease).to.have.been.calledWith(config);
    });

    it('writes analytics config and then publishes NPM packages', async function () {
      await publishMongosh(
        config,
        githubRepo,
        mongoHomebrewCoreForkRepo,
        homebrewCoreRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishToNpm,
        pushTags,
        writeBuildInfo,
        publishToHomebrew,
        shouldDoPublicRelease,
        getEvergreenArtifactUrl,
        bumpMongoshReleasePackages,
        bumpAuxiliaryPackages,
        spawnSync
      );

      expect(writeBuildInfo).to.have.been.calledOnceWith(config);
      expect(publishToNpm).to.have.been.calledWith();
      expect(publishToNpm).to.have.been.calledAfter(writeBuildInfo as any);
    });
    it('publishes to homebrew', async function () {
      await publishMongosh(
        config,
        githubRepo,
        mongoHomebrewCoreForkRepo,
        homebrewCoreRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishToNpm,
        pushTags,
        writeBuildInfo,
        publishToHomebrew,
        shouldDoPublicRelease,
        getEvergreenArtifactUrl,
        bumpMongoshReleasePackages,
        bumpAuxiliaryPackages,
        spawnSync
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
      await publishMongosh(
        config,
        githubRepo,
        mongoHomebrewCoreForkRepo,
        homebrewCoreRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishToNpm,
        pushTags,
        writeBuildInfo,
        publishToHomebrew,
        shouldDoPublicRelease,
        getEvergreenArtifactUrl,
        bumpMongoshReleasePackages,
        bumpAuxiliaryPackages,
        spawnSync
      );

      expect(createAndPublishDownloadCenterConfig).not.to.have.been.called;
    });

    it('does not promote the release in github', async function () {
      await publishMongosh(
        config,
        githubRepo,
        mongoHomebrewCoreForkRepo,
        homebrewCoreRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishToNpm,
        pushTags,
        writeBuildInfo,
        publishToHomebrew,
        shouldDoPublicRelease,
        getEvergreenArtifactUrl,
        bumpMongoshReleasePackages,
        bumpAuxiliaryPackages,
        spawnSync
      );

      expect(githubRepo.promoteRelease).not.to.have.been.called;
    });

    it('does not publish npm packages', async function () {
      await publishMongosh(
        config,
        githubRepo,
        mongoHomebrewCoreForkRepo,
        homebrewCoreRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishToNpm,
        pushTags,
        writeBuildInfo,
        publishToHomebrew,
        shouldDoPublicRelease,
        getEvergreenArtifactUrl,
        bumpMongoshReleasePackages,
        bumpAuxiliaryPackages,
        spawnSync
      );

      expect(publishToNpm).not.to.have.been.called;
    });

    it('does not publish to homebrew', async function () {
      await publishMongosh(
        config,
        githubRepo,
        mongoHomebrewCoreForkRepo,
        homebrewCoreRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishToNpm,
        pushTags,
        writeBuildInfo,
        publishToHomebrew,
        shouldDoPublicRelease,
        getEvergreenArtifactUrl,
        bumpMongoshReleasePackages,
        bumpAuxiliaryPackages,
        spawnSync
      );

      expect(publishToHomebrew).not.to.have.been.called;
    });

    it('does not release to barque', async function () {
      await publishMongosh(
        config,
        githubRepo,
        mongoHomebrewCoreForkRepo,
        homebrewCoreRepo,
        barque,
        createAndPublishDownloadCenterConfig,
        publishToNpm,
        pushTags,
        writeBuildInfo,
        publishToHomebrew,
        shouldDoPublicRelease,
        getEvergreenArtifactUrl,
        bumpMongoshReleasePackages,
        bumpAuxiliaryPackages,
        spawnSync
      );

      expect(barque.releaseToBarque).not.to.have.been.called;
    });
  });
});
