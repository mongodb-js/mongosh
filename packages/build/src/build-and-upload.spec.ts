import { GithubRepo } from './github-repo';
import buildAndUpload from './build-and-upload';
import chai, { expect } from 'chai';
import Config from './config';
import sinon from 'ts-sinon';
import { TarballFile } from './tarball';

chai.use(require('sinon-chai'));

function createStubRepo(overrides?: any): GithubRepo {
  return sinon.createStubInstance(GithubRepo, overrides) as unknown as GithubRepo;
}

describe('buildAndRelease', () => {
  let config: Config;
  let tarballFile: TarballFile;
  let compileAndZipExecutable: (Config) => Promise<TarballFile>;
  let uploadToEvergreen: (artifact: string, awsKey: string, awsSecret: string, project: string, revision: string) => Promise<void>;
  let uploadToDownloadCenter: (artifact: string, awsKey: string, awsSecret: string) => Promise<void>;
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
      appleUser: 'appleUser',
      applePassword: 'applePassword',
      appleAppIdentity: 'appleAppIdentity',
      isCi: true,
      platform: 'platform',
      buildVariant: 'linux',
      repo: {
        owner: 'owner',
        repo: 'repo',
      }
    };

    tarballFile = { path: 'path', contentType: 'application/gzip' };
    compileAndZipExecutable = sinon.stub().resolves(tarballFile);
    uploadToEvergreen = sinon.spy();
    uploadToDownloadCenter = sinon.spy();
    githubRepo = createStubRepo();
  });

  [true, false].forEach((isPublicRelease) => {
    it(`uploads the artifact to evergreen if is ${isPublicRelease ? 'a' : 'not a'} public release`, async() => {
      githubRepo = createStubRepo({
        shouldDoPublicRelease: sinon.stub().returns(Promise.resolve(isPublicRelease))
      });

      await buildAndUpload(
        config,
        githubRepo,
        compileAndZipExecutable,
        uploadToEvergreen,
        uploadToDownloadCenter
      );

      expect(uploadToEvergreen).to.have.been.calledWith(
        tarballFile.path,
        config.evgAwsKey,
        config.evgAwsSecret,
        config.project,
        config.revision
      );
    });
  });

  it('releases to github if a public release', async() => {
    githubRepo = createStubRepo({
      shouldDoPublicRelease: sinon.stub().returns(Promise.resolve(true))
    });

    await buildAndUpload(
      config,
      githubRepo,
      compileAndZipExecutable,
      uploadToEvergreen,
      uploadToDownloadCenter
    );

    expect(uploadToDownloadCenter).to.have.been.calledWith(
      tarballFile.path,
      config.downloadCenterAwsKey,
      config.downloadCenterAwsSecret
    );
  });

  it('releases to downloads centre if a public release', async() => {
    githubRepo = createStubRepo({
      shouldDoPublicRelease: sinon.stub().returns(Promise.resolve(true)),
      releaseToGithub: sinon.stub().returns(Promise.resolve(true))
    } as any);

    await buildAndUpload(
      config,
      githubRepo,
      compileAndZipExecutable,
      uploadToEvergreen,
      uploadToDownloadCenter
    );

    expect(githubRepo.releaseToGithub).to.have.been.calledWith(tarballFile, config);
  });
});
