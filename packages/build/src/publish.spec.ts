import { GithubRepo } from './github-repo';
import publish from './publish';
import chai, { expect } from 'chai';
import Config from './config';
import path from 'path';
import sinon from 'ts-sinon';

chai.use(require('sinon-chai'));

function createStubRepo(overrides?: any): GithubRepo {
  return sinon.createStubInstance(GithubRepo, overrides) as unknown as GithubRepo;
}

describe('publish', () => {
  let config: Config;
  let uploadDownloadCenterConfig: (version: string, awsKey: string, awsSecret: string) => Promise<any>;
  let publishNpmPackages: (config: Config) => Promise<void>;
  let githubRepo: GithubRepo;

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
    githubRepo = createStubRepo();
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
        uploadDownloadCenterConfig,
        publishNpmPackages
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
        uploadDownloadCenterConfig,
        publishNpmPackages
      );

      expect(githubRepo.promoteRelease).to.have.been.calledWith(config);
    });

    it('publishes NPM packages', async() => {
      await publish(
        config,
        githubRepo,
        uploadDownloadCenterConfig,
        publishNpmPackages
      );

      expect(publishNpmPackages).to.have.been.calledWith();
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
        uploadDownloadCenterConfig,
        publishNpmPackages
      );

      expect(uploadDownloadCenterConfig).not.to.have.been.called;
    });

    it('does not promote the release in github', async() => {
      await publish(
        config,
        githubRepo,
        uploadDownloadCenterConfig,
        publishNpmPackages
      );

      expect(githubRepo.promoteRelease).not.to.have.been.called;
    });

    it('does not publish npm packages', async() => {
      await publish(
        config,
        githubRepo,
        uploadDownloadCenterConfig,
        publishNpmPackages
      );

      expect(publishNpmPackages).not.to.have.been.called;
    });
  });
});
