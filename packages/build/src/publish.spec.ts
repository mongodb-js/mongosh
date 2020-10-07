import { GithubRepo } from './github-repo';
import publish from './publish';
import chai, { expect } from 'chai';
import Config from './config';
import sinon from 'ts-sinon';

chai.use(require('sinon-chai'));

function createStubRepo(overrides?: any): GithubRepo {
  return sinon.createStubInstance(GithubRepo, overrides) as unknown as GithubRepo;
}

describe('publish', () => {
  let config: Config;
  let uploadDownloadCenterConfig: (version: string, awsKey: string, awsSecret: string) => Promise<any>;
  let githubRepo: GithubRepo;

  beforeEach(() => {
    config = {
      version: 'version',
      bundleId: 'bundleId',
      input: 'input',
      execInput: 'execInput',
      outputDir: 'outputDir',
      analyticsConfig: 'analyticsConfig',
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
      }
    };

    uploadDownloadCenterConfig = sinon.spy();
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
        uploadDownloadCenterConfig
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
        uploadDownloadCenterConfig
      );

      expect(githubRepo.promoteRelease).to.have.been.calledWith(config);
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
        uploadDownloadCenterConfig
      );

      expect(uploadDownloadCenterConfig).not.to.have.been.called;
    });

    it('does not promote the release in github', async() => {
      await publish(
        config,
        githubRepo,
        uploadDownloadCenterConfig
      );

      expect(githubRepo.promoteRelease).not.to.have.been.called;
    });
  });
});
