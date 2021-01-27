import doUpload from './do-upload';
import { GithubRepo } from './github-repo';
import { TarballFile } from './tarball';
import chai, { expect } from 'chai';
import { Barque } from './barque';
import Config, { shouldDoPublicRelease as shouldDoPublicReleaseFn } from './config';
import sinon from 'ts-sinon';
import path from 'path';

chai.use(require('sinon-chai'));

function createStubRepo(overrides?: any): GithubRepo {
  return sinon.createStubInstance(GithubRepo, overrides) as unknown as GithubRepo;
}

function createStubBarque(overrides?: any): Barque {
  return sinon.createStubInstance(Barque, overrides) as unknown as Barque;
}

describe('do-upload', () => {
  let config: Config;
  let tarballFile: TarballFile;
  let uploadToEvergreen: (artifact: string, awsKey: string, awsSecret: string, project: string, revision: string) => Promise<void>;
  let uploadToDownloadCenter: (artifact: string, awsKey: string, awsSecret: string) => Promise<void>;
  let shouldDoPublicRelease: typeof shouldDoPublicReleaseFn;
  let barque: Barque;
  let githubRepo: GithubRepo;

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
      buildVariant: 'linux',
      repo: {
        owner: 'owner',
        repo: 'repo',
      },
      execNodeVersion: process.version,
      rootDir: path.resolve(__dirname, '..', '..', '..')
    };

    tarballFile = { path: 'path', contentType: 'application/gzip' };
    barque = createStubBarque();
    uploadToEvergreen = sinon.spy();
    uploadToDownloadCenter = sinon.spy();
    shouldDoPublicRelease = sinon.spy();
    githubRepo = createStubRepo();
  });

  [true, false].forEach((isPublicRelease) => {
    it(`uploads the artifact to evergreen if is ${isPublicRelease ? 'a' : 'not a'} public release`, async() => {
      shouldDoPublicRelease = sinon.stub().returns(isPublicRelease);

      barque = createStubBarque({
        releaseToBarque: sinon.stub().returns(Promise.resolve(true))
      });

      await doUpload(
        config,
        githubRepo,
        barque,
        tarballFile,
        uploadToEvergreen,
        uploadToDownloadCenter,
        shouldDoPublicRelease
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
    shouldDoPublicRelease = sinon.stub().returns(true);

    barque = createStubBarque({
      releaseToBarque: sinon.stub().resolves(true)
    });

    await doUpload(
      config,
      githubRepo,
      barque,
      tarballFile,
      uploadToEvergreen,
      uploadToDownloadCenter,
      shouldDoPublicRelease
    );

    expect(uploadToDownloadCenter).to.have.been.calledWith(
      tarballFile.path,
      config.downloadCenterAwsKey,
      config.downloadCenterAwsSecret
    );
  });

  it('does not release to github if not a public release', async() => {
    shouldDoPublicRelease = sinon.stub().returns(false);

    barque = createStubBarque({
      releaseToBarque: sinon.stub().resolves(true)
    });

    await doUpload(
      config,
      githubRepo,
      barque,
      tarballFile,
      uploadToEvergreen,
      uploadToDownloadCenter,
      shouldDoPublicRelease
    );

    expect(uploadToDownloadCenter).to.not.have.been.called;
  });

  it('releases to barque if a public release', async() => {
    shouldDoPublicRelease = sinon.stub().returns(true);

    barque = createStubBarque({
      releaseToBarque: sinon.stub().returns(Promise.resolve(true))
    });

    await doUpload(
      config,
      githubRepo,
      barque,
      tarballFile,
      uploadToEvergreen,
      uploadToDownloadCenter,
      shouldDoPublicRelease
    );

    expect(barque.releaseToBarque).to.have.been.called;
  });

  it('does not releases to barque if not a public release', async() => {
    shouldDoPublicRelease = sinon.stub().returns(false);

    barque = createStubBarque({
      releaseToBarque: sinon.stub().resolves(true)
    });

    await doUpload(
      config,
      githubRepo,
      barque,
      tarballFile,
      uploadToEvergreen,
      uploadToDownloadCenter,
      shouldDoPublicRelease
    );

    expect(barque.releaseToBarque).to.not.have.been.called;
  });

  it('releases to downloads centre if a public release', async() => {
    shouldDoPublicRelease = sinon.stub().returns(true);
    githubRepo = createStubRepo({
      releaseToGithub: sinon.stub().resolves(true)
    } as any);

    barque = createStubBarque({
      releaseToBarque: sinon.stub().resolves(true)
    });

    await doUpload(
      config,
      githubRepo,
      barque,
      tarballFile,
      uploadToEvergreen,
      uploadToDownloadCenter,
      shouldDoPublicRelease
    );

    expect(githubRepo.releaseToGithub).to.have.been.calledWith(tarballFile, config);
  });

  it('does not release to downloads centre if not a public release', async() => {
    shouldDoPublicRelease = sinon.stub().returns(false);
    githubRepo = createStubRepo({
      releaseToGithub: sinon.stub().resolves(true)
    } as any);

    barque = createStubBarque({
      releaseToBarque: sinon.stub().resolves(true)
    });

    await doUpload(
      config,
      githubRepo,
      barque,
      tarballFile,
      uploadToEvergreen,
      uploadToDownloadCenter,
      shouldDoPublicRelease
    );

    expect(githubRepo.releaseToGithub).to.not.have.been.called;
  });
});
