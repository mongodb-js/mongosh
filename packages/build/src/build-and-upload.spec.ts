import buildAndUpload from './build-and-upload';
import { GithubRepo } from './github-repo';
import { TarballFile } from './tarball';
import chai, { expect } from 'chai';
import { Barque } from './barque';
import Config from './config';
import sinon from 'ts-sinon';

chai.use(require('sinon-chai'));

function createStubRepo(overrides?: any): GithubRepo {
  return sinon.createStubInstance(GithubRepo, overrides) as unknown as GithubRepo;
}

function createStubBarque(overrides?: any): Barque {
  return sinon.createStubInstance(Barque, overrides) as unknown as Barque;
}

describe('buildAndRelease', () => {
  let config: Config;
  let tarballFile: TarballFile;
  let compileAndZipExecutable: (Config) => Promise<TarballFile>;
  let uploadToEvergreen: (artifact: string, awsKey: string, awsSecret: string, project: string, revision: string) => Promise<void>;
  let uploadToDownloadCenter: (artifact: string, awsKey: string, awsSecret: string) => Promise<void>;
  let barque: Barque;
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
    barque = createStubBarque();
    uploadToEvergreen = sinon.spy();
    uploadToDownloadCenter = sinon.spy();
    githubRepo = createStubRepo();
  });

  [true, false].forEach((isPublicRelease) => {
    it(`uploads the artifact to evergreen if is ${isPublicRelease ? 'a' : 'not a'} public release`, async () => {
      githubRepo = createStubRepo({
        shouldDoPublicRelease: sinon.stub().returns(Promise.resolve(isPublicRelease))
      });

      barque = createStubBarque({
        releaseToBarque: sinon.stub().returns(Promise.resolve(true))
      });

      await buildAndUpload(
        config,
        githubRepo,
        barque,
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

  it('releases to github if a public release', async () => {
    githubRepo = createStubRepo({
      shouldDoPublicRelease: sinon.stub().returns(Promise.resolve(true))
    });

    barque = createStubBarque({
      releaseToBarque: sinon.stub().returns(Promise.resolve(true))
    });

    await buildAndUpload(
      config,
      githubRepo,
      barque,
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

  it('releases to barque if a public release', async () => {
    githubRepo = createStubRepo({
      shouldDoPublicRelease: sinon.stub().returns(Promise.resolve(true))
    });

    barque = createStubBarque({
      releaseToBarque: sinon.stub().returns(Promise.resolve(true))
    });

    await buildAndUpload(
      config,
      githubRepo,
      barque,
      compileAndZipExecutable,
      uploadToEvergreen,
      uploadToDownloadCenter
    );

    expect(barque.releaseToBarque).to.have.been.called;
  });

  it('releases to downloads centre if a public release', async () => {
    githubRepo = createStubRepo({
      shouldDoPublicRelease: sinon.stub().returns(Promise.resolve(true)),
      releaseToGithub: sinon.stub().returns(Promise.resolve(true))
    } as any);

    barque = createStubBarque({
      releaseToBarque: sinon.stub().returns(Promise.resolve(true))
    });

    await buildAndUpload(
      config,
      githubRepo,
      barque,
      compileAndZipExecutable,
      uploadToEvergreen,
      uploadToDownloadCenter
    );

    expect(githubRepo.releaseToGithub).to.have.been.calledWith(tarballFile, config);
  });
});
