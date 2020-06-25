import { GithubRepo } from './github-repo';
import { releaseTasks } from './release';
import chai, { expect } from 'chai';
import Config from './config';
import sinon from 'ts-sinon';

chai.use(require('sinon-chai'));

describe('Release', () => {
  it('always zips file', async() => {
    const uploadToEvergreen = sinon.spy();
    const compileAndZipExecutable = sinon.spy();
    const releaseToDownloadCenter = sinon.spy();
    const githubRepo = sinon.createStubInstance(GithubRepo);
    const config: Config = {};
    releaseTasks(config, githubRepo, compileAndZipExecutable, uploadToEvergreen, releaseToDownloadCenter);
    expect(compileAndZipExecutable).to.have.been.called;
  });

  it('always uploads to evergreen', async() => {
    const uploadToEvergreen = sinon.stub();
    const compileAndZipExecutable = sinon.stub().returns({ path: 'path'});
    const releaseToDownloadCenter = sinon.spy();
    const githubRepo = sinon.createStubInstance(GithubRepo);
    const config: Config = {};
    releaseTasks(config, githubRepo, compileAndZipExecutable, uploadToEvergreen, releaseToDownloadCenter);
    expect(uploadToEvergreen).to.have.been.called;
  });

  it('releases to github if a public release', async() => {
    const uploadToEvergreen = sinon.stub();
    const compileAndZipExecutable = sinon.stub().returns({ path: 'path'});
    const releaseToDownloadCenter = sinon.spy();
    const githubRepo = sinon.createStubInstance(GithubRepo, {
        shouldDoPublicRelease: sinon.stub().returns(Promise.resolve(true))
    });
    const config: Config = {};
    releaseTasks(config, githubRepo, compileAndZipExecutable, uploadToEvergreen, releaseToDownloadCenter);
    expect(releaseToDownloadCenter).to.have.been.called;
  });

  it('releases to downloads centre if a public release', async() => {
    const uploadToEvergreen = sinon.stub();
    const compileAndZipExecutable = sinon.stub().returns({ path: 'path'});
    const releaseToDownloadCenter = sinon.spy();
    const githubRepo = sinon.createStubInstance(GithubRepo, {
        shouldDoPublicRelease: sinon.stub().returns(Promise.resolve(true))
        releaseToGithub: sinon.stub().returns(Promise.resolve(true))
    });
    const config: Config = {};
    releaseTasks(config, githubRepo, compileAndZipExecutable, uploadToEvergreen, releaseToDownloadCenter);
    expect(githubRepo.releaseToGithub).to.have.been.called;
  });
});
