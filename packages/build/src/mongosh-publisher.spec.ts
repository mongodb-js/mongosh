/* eslint-disable @typescript-eslint/unbound-method */
import chai, { expect } from 'chai';
import sinon from 'sinon';
import { Barque } from './barque';
import type { Config } from './config';
import { GithubRepo } from '@mongodb-js/devtools-github-repo';
import { dummyConfig } from '../test/helpers';
import { MongoshPublisher } from './mongosh-publisher';

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

describe('NpmPublisher publishMongosh', function () {
  let config: Config;
  let createAndPublishDownloadCenterConfig: sinon.SinonStub;
  let getMostRecentDraftTagForRelease: sinon.SinonStub;
  let publishToNpm: sinon.SinonStub;
  let writeBuildInfo: sinon.SinonStub;
  let publishToHomebrew: sinon.SinonStub;
  let shouldDoPublicRelease: sinon.SinonStub;
  let githubRepo: GithubRepo;
  let mongoHomebrewCoreForkRepo: GithubRepo;
  let homebrewCoreRepo: GithubRepo;
  let barque: Barque;

  let testPublisher: MongoshPublisher;

  beforeEach(function () {
    config = { ...dummyConfig };
    getMostRecentDraftTagForRelease = sinon.stub();
    githubRepo = createStubRepo({
      getMostRecentDraftTagForRelease,
    });
    mongoHomebrewCoreForkRepo = createStubRepo();
    homebrewCoreRepo = createStubRepo();
    barque = createStubBarque({
      releaseToBarque: sinon.stub().resolves(['package-url']),
      waitUntilPackagesAreAvailable: sinon.stub().resolves(),
    });

    testPublisher = new MongoshPublisher(
      config,
      githubRepo,
      homebrewCoreRepo,
      homebrewCoreRepo
    );

    createAndPublishDownloadCenterConfig = sinon
      .stub(testPublisher, 'createAndPublishDownloadCenterConfig')
      .resolves();
    publishToNpm = sinon.stub(testPublisher.npmPublisher, 'publish').resolves();
    writeBuildInfo = sinon.stub(testPublisher, 'writeBuildInfo').resolves();
    publishToHomebrew = sinon
      .stub(testPublisher, 'publishToHomebrew')
      .resolves();
    shouldDoPublicRelease = sinon
      .stub(testPublisher, 'shouldDoPublicRelease')
      .resolves();
  });

  context('if is a public release', function () {
    beforeEach(function () {
      config.triggeringGitTag = 'v0.7.0';
      shouldDoPublicRelease.returns(true);
      getMostRecentDraftTagForRelease.resolves({
        name: 'v0.7.0-draft.42',
        sha: 'revision',
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
        getMostRecentDraftTagForRelease.resolves(undefined);
        try {
          await testPublisher.publishMongosh(barque);
        } catch (e: any) {
          return expect(e.message).to.contain('Could not find prior draft tag');
        }
        expect.fail('Expected error');
      });

      it('fails if draft tag SHA does not match revision', async function () {
        getMostRecentDraftTagForRelease.resolves({
          name: 'v0.7.0-draft.42',
          sha: 'wrong',
        });
        try {
          await testPublisher.publishMongosh(barque);
        } catch (e: any) {
          return expect(e.message).to.contain('Version mismatch');
        }
        expect.fail('Expected error');
      });
    });

    it('publishes artifacts to barque', async function () {
      await testPublisher.publishMongosh(barque);

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
      await testPublisher.publishMongosh(barque);

      expect(createAndPublishDownloadCenterConfig).to.have.been.calledWith(
        config.outputDir,
        config.packageInformation,
        config.downloadCenterAwsKey,
        config.downloadCenterAwsSecret
      );
    });

    it('promotes the release in github', async function () {
      await testPublisher.publishMongosh(barque);

      expect(githubRepo.promoteRelease).to.have.been.calledWith(config);
    });

    it('writes analytics config and then publishes NPM packages', async function () {
      await testPublisher.publishMongosh(barque);

      expect(writeBuildInfo).to.have.been.calledOnceWith(config);
      expect(publishToNpm).to.have.been.calledWith();
      expect(publishToNpm).to.have.been.calledAfter(
        testPublisher.writeBuildInfo as any
      );
    });
    it('publishes to homebrew', async function () {
      await testPublisher.publishMongosh(barque);

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
      shouldDoPublicRelease.returns(false);
    });

    it('does not update the download center config', async function () {
      await testPublisher.publishMongosh(barque);

      expect(
        testPublisher.createAndPublishDownloadCenterConfig
      ).not.to.have.been.called;
    });

    it('does not promote the release in github', async function () {
      await testPublisher.publishMongosh(barque);

      expect(githubRepo.promoteRelease).not.to.have.been.called;
    });

    it('does not publish npm packages', async function () {
      await testPublisher.publishMongosh(barque);

      expect(publishToNpm).not.to.have.been.called;
    });

    it('does not publish to homebrew', async function () {
      await testPublisher.publishMongosh(barque);

      expect(publishToHomebrew).not.to.have.been.called;
    });

    it('does not release to barque', async function () {
      await testPublisher.publishMongosh(barque);

      expect(barque.releaseToBarque).not.to.have.been.called;
    });
  });
});
