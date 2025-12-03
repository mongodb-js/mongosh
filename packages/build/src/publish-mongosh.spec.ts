import * as chai from 'chai';
import { expect } from 'chai';
import sinon from 'sinon';
import { Barque } from './barque';
import { type Config } from './config';
import { GithubRepo } from '@mongodb-js/devtools-github-repo';
import { HomebrewPublisher } from './homebrew';
import { PackageBumper, PackagePublisher } from './npm-packages';
import { MongoshPublisher } from './publish-mongosh';
import { dummyConfig } from '../test/helpers';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

function createStubRepo(overrides?: any): GithubRepo {
  return sinon.createStubInstance(
    GithubRepo,
    overrides
  ) as unknown as GithubRepo;
}

function createStubBarque(overrides?: any): Barque {
  return sinon.createStubInstance(Barque, overrides) as unknown as Barque;
}

describe('MongoshPublisher', function () {
  let config: Config;
  let createAndPublishDownloadCenterConfig: sinon.SinonStub;
  let publishToNpm: sinon.SinonStub;
  let writeBuildInfo: sinon.SinonStub;
  let publishToHomebrew: sinon.SinonStub;
  let barque: Barque;
  let spawnSync: sinon.SinonStub;
  let shouldDoPublicRelease: sinon.SinonStub;

  let testPublisher: MongoshPublisher;

  const setupMongoshPublisher = (
    config: Config,
    {
      githubRepo = createStubRepo(),
      homebrewCore = createStubRepo(),
      homebrewCoreFork = createStubRepo(),
    } = {}
  ) => {
    barque = createStubBarque({
      releaseToBarque: sinon.stub().resolves(['package-url']),
      waitUntilPackagesAreAvailable: sinon.stub().resolves(),
    });

    spawnSync = sinon.stub().resolves();

    const packagePublisher = new PackagePublisher(config, {
      spawnSync,
    });
    publishToNpm = sinon.stub(packagePublisher, 'publishToNpm');

    const packageBumper = new PackageBumper({
      spawnSync,
    });

    const bumpMongoshReleasePackages = sinon.stub(
      packageBumper,
      'bumpMongoshReleasePackages'
    );
    bumpMongoshReleasePackages.resolves();

    const bumpAuxiliaryPackages = sinon.stub(
      packageBumper,
      'bumpAuxiliaryPackages'
    );
    bumpAuxiliaryPackages.resolves();

    const homebrewPublisher = new HomebrewPublisher({
      ...config,
      homebrewCore,
      homebrewCoreFork,
      packageVersion: config.version,
      githubReleaseLink: 'test-link',
    });
    publishToHomebrew = sinon.stub(homebrewPublisher, 'publish');

    writeBuildInfo = sinon.stub();
    writeBuildInfo.resolves();

    shouldDoPublicRelease = sinon.stub();
    shouldDoPublicRelease.returns(true);

    createAndPublishDownloadCenterConfig = sinon.stub();

    testPublisher = new MongoshPublisher(
      config,
      barque,
      githubRepo,
      packagePublisher,
      packageBumper,
      homebrewPublisher,
      {
        writeBuildInfo,
        shouldDoPublicRelease,
        createAndPublishDownloadCenterConfig,
      }
    );

    const pushTags = sinon.stub(packagePublisher, 'pushTags');
    pushTags.resolves();
  };

  beforeEach(function () {
    config = { ...dummyConfig };
  });

  context('if is a public release', function () {
    let githubRepo: GithubRepo;

    beforeEach(function () {
      config.triggeringGitTag = 'v0.7.0';
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

      setupMongoshPublisher(config, { githubRepo });

      shouldDoPublicRelease.returns(true);
    });

    context('validates configuration', function () {
      it('fails if no draft tag is found', async function () {
        const githubRepo = createStubRepo({
          getMostRecentDraftTagForRelease: sinon.stub().resolves(undefined),
        });
        setupMongoshPublisher(config, { githubRepo });
        try {
          await testPublisher.publish();
        } catch (e: any) {
          return expect(e.message).to.contain('Could not find prior draft tag');
        }
        expect.fail('Expected error');
      });

      it('fails if draft tag SHA does not match revision', async function () {
        const githubRepo = createStubRepo({
          getMostRecentDraftTagForRelease: sinon
            .stub()
            .resolves({ name: 'v0.7.0-draft.42', sha: 'wrong' }),
        });
        setupMongoshPublisher(config, { githubRepo });
        try {
          await testPublisher.publish();
        } catch (e: any) {
          return expect(e.message).to.contain('Version mismatch');
        }
        expect.fail('Expected error');
      });
    });

    it('publishes artifacts to barque', async function () {
      await testPublisher.publish();

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
      await testPublisher.publish();

      expect(createAndPublishDownloadCenterConfig).to.have.been.calledWith(
        config.outputDir,
        config.packageInformation,
        config.downloadCenterAwsKeyConfig,
        config.downloadCenterAwsSecretConfig,
        config.downloadCenterAwsKeyArtifacts,
        config.downloadCenterAwsSecretArtifacts,
        config.downloadCenterAwsSessionTokenArtifacts
      );
    });

    it('promotes the release in github', async function () {
      await testPublisher.publish();

      expect(githubRepo.promoteRelease).to.have.been.calledWith(config);
    });

    it('writes analytics config and then publishes NPM packages', async function () {
      await testPublisher.publish();

      expect(writeBuildInfo).to.have.been.calledOnceWith(config);
      expect(publishToNpm).to.have.been.calledWith();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(publishToNpm).to.have.been.calledAfter(writeBuildInfo as any);
    });
    it('publishes to homebrew', async function () {
      await testPublisher.publish();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(testPublisher.homebrewPublisher.publish).to.have.been.called;
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(testPublisher.homebrewPublisher.publish).to.have.been.calledAfter(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        githubRepo.promoteRelease as any
      );
    });
  });

  context('if is not a public release', function () {
    let githubRepo: GithubRepo;
    beforeEach(function () {
      githubRepo = createStubRepo();

      setupMongoshPublisher(config, { githubRepo });
      shouldDoPublicRelease.returns(false);
    });

    it('does not update the download center config', async function () {
      await testPublisher.publish();

      expect(createAndPublishDownloadCenterConfig).not.to.have.been.called;
    });

    it('does not promote the release in github', async function () {
      await testPublisher.publish();

      expect(githubRepo.promoteRelease).not.to.have.been.called;
    });

    it('does not publish npm packages', async function () {
      await testPublisher.publish();

      expect(publishToNpm).not.to.have.been.called;
    });

    it('does not publish to homebrew', async function () {
      await testPublisher.publish();

      expect(publishToHomebrew).not.to.have.been.called;
    });

    it('does not release to barque', async function () {
      await testPublisher.publish();

      expect(barque.releaseToBarque).not.to.have.been.called;
    });
  });
});
