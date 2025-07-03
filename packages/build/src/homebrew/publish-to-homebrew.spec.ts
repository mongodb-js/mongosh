import chai, { expect } from 'chai';
import sinon from 'sinon';
import type { GithubRepo } from '@mongodb-js/devtools-github-repo';
import type { HomebrewPublisherConfig } from './publish-to-homebrew';
import { HomebrewPublisher } from './publish-to-homebrew';

chai.use(require('sinon-chai'));

describe('HomebrewPublisher', function () {
  let homebrewCore: GithubRepo;
  let homebrewCoreFork: GithubRepo;
  let createPullRequest: sinon.SinonStub;
  let npmPackageSha256: sinon.SinonStub;
  let generateFormula: sinon.SinonStub;
  let updateHomebrewFork: sinon.SinonStub;

  let testPublisher: HomebrewPublisher;

  const setupHomebrewPublisher = (
    config: Omit<HomebrewPublisherConfig, 'homebrewCore' | 'homebrewCoreFork'>
  ) => {
    createPullRequest = sinon.stub();

    homebrewCore = {
      repo: {
        owner: 'homebrew',
        repo: 'homebrew-core',
      },
      createPullRequest: createPullRequest as any,
    } as unknown as GithubRepo;
    homebrewCoreFork = {
      repo: {
        owner: 'mongodb-js',
        repo: 'homebrew-core',
      },
    } as unknown as GithubRepo;

    testPublisher = new HomebrewPublisher({
      ...config,
      homebrewCore,
      homebrewCoreFork,
    });

    npmPackageSha256 = sinon.stub(testPublisher, 'npmPackageSha256');
    generateFormula = sinon.stub(testPublisher, 'generateFormula');
    updateHomebrewFork = sinon.stub(testPublisher, 'updateHomebrewFork');
  };

  beforeEach(function () {
    setupHomebrewPublisher({
      packageVersion: '1.0.0',
      githubReleaseLink: 'githubRelease',
      isDryRun: false,
    });
  });

  it('creates and merges a PR on update and cleans up', async function () {
    setupHomebrewPublisher({
      packageVersion: '1.0.0',
      githubReleaseLink: 'githubRelease',
      isDryRun: false,
    });

    npmPackageSha256
      .rejects()
      .withArgs('https://registry.npmjs.org/@mongosh/cli-repl/1.0.0')
      .resolves('sha');

    generateFormula
      .rejects()
      .withArgs({ version: '1.0.0', sha: 'sha' }, homebrewCore)
      .resolves('new formula');

    updateHomebrewFork
      .rejects()
      .withArgs({
        packageVersion: '1.0.0',
        packageSha: 'sha',
        homebrewFormula: 'new formula',
        homebrewCore,
        homebrewCoreFork,
        isDryRun: false,
      })
      .resolves('new-branch');

    createPullRequest
      .rejects()
      .withArgs(
        'mongosh 1.0.0',
        sinon.match.string,
        'mongodb-js:new-branch',
        'main'
      )
      .resolves({ prNumber: 42, url: 'url' });

    await testPublisher.publish();

    expect(npmPackageSha256).to.have.been.called;
    expect(generateFormula).to.have.been.called;
    expect(updateHomebrewFork).to.have.been.called;
    expect(createPullRequest).to.have.been.called;
  });

  it('does not try to push/merge when there is no formula update', async function () {
    setupHomebrewPublisher({
      packageVersion: '1.0.0',
      githubReleaseLink: 'githubRelease',
      isDryRun: false,
    });

    npmPackageSha256
      .rejects()
      .withArgs('https://registry.npmjs.org/@mongosh/cli-repl/1.0.0')
      .resolves('sha');

    generateFormula
      .rejects()
      .withArgs({ version: '1.0.0', sha: 'sha' }, homebrewCore)
      .resolves('formula');

    updateHomebrewFork
      .rejects()
      .withArgs({
        packageVersion: '1.0.0',
        packageSha: 'sha',
        homebrewFormula: 'formula',
        homebrewCore,
        homebrewCoreFork,
        isDryRun: false,
      })
      .resolves(undefined);

    await testPublisher.publish();

    expect(npmPackageSha256).to.have.been.called;
    expect(generateFormula).to.have.been.called;
    expect(updateHomebrewFork).to.have.been.called;
    expect(createPullRequest).to.not.have.been.called;
  });

  it('silently ignores an error while deleting the PR branch', async function () {
    npmPackageSha256
      .rejects()
      .withArgs('https://registry.npmjs.org/@mongosh/cli-repl/1.0.0')
      .resolves('sha');

    generateFormula
      .rejects()
      .withArgs({ version: '1.0.0', sha: 'sha' }, homebrewCore)
      .resolves('new formula');

    updateHomebrewFork
      .rejects()
      .withArgs({
        packageVersion: '1.0.0',
        packageSha: 'sha',
        homebrewFormula: 'new formula',
        homebrewCore,
        homebrewCoreFork,
        isDryRun: false,
      })
      .resolves('new-branch');

    createPullRequest
      .rejects()
      .withArgs(
        'mongosh 1.0.0',
        sinon.match.string,
        'mongodb-js:new-branch',
        'main'
      )
      .resolves({ prNumber: 42, url: 'url' });

    await testPublisher.publish();

    expect(npmPackageSha256).to.have.been.called;
    expect(generateFormula).to.have.been.called;
    expect(updateHomebrewFork).to.have.been.called;
    expect(createPullRequest).to.have.been.called;
  });
});
