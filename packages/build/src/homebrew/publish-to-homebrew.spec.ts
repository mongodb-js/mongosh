import chai, { expect } from 'chai';
import sinon from 'ts-sinon';
import { GithubRepo } from '../github-repo';
import { publishToHomebrew } from './publish-to-homebrew';

chai.use(require('sinon-chai'));

describe('Homebrew publish-to-homebrew', () => {
  let homebrewCore: GithubRepo;
  let homebrewCoreFork: GithubRepo;
  let createPullRequest: sinon.SinonStub;
  let httpsSha256: sinon.SinonStub;
  let generateFormula: sinon.SinonStub;
  let updateHomebrewFork: sinon.SinonStub;

  beforeEach(() => {
    createPullRequest = sinon.stub();
    httpsSha256 = sinon.stub();
    generateFormula = sinon.stub();
    updateHomebrewFork = sinon.stub();

    homebrewCore = {
      repo: {
        owner: 'homebrew',
        repo: 'homebrew-core'
      },
      createPullRequest: createPullRequest as any
    } as unknown as GithubRepo;
    homebrewCoreFork = {
      repo: {
        owner: 'mongodb-js',
        repo: 'homebrew-core'
      }
    } as unknown as GithubRepo;
  });

  it('creates and merges a PR on update and cleans up', async() => {
    httpsSha256
      .rejects()
      .withArgs('https://registry.npmjs.org/@mongosh/cli-repl/-/cli-repl-1.0.0.tgz')
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
        homebrewCoreFork
      })
      .resolves('new-branch');

    createPullRequest
      .rejects()
      .withArgs('mongosh 1.0.0', sinon.match.string, 'mongodb-js:new-branch', 'master')
      .resolves({ prNumber: 42, url: 'url' });

    await publishToHomebrew(
      homebrewCore,
      homebrewCoreFork,
      '1.0.0',
      'githubRelease',
      httpsSha256,
      generateFormula,
      updateHomebrewFork
    );

    expect(httpsSha256).to.have.been.called;
    expect(generateFormula).to.have.been.called;
    expect(updateHomebrewFork).to.have.been.called;
    expect(createPullRequest).to.have.been.called;
  });

  it('does not try to push/merge when there is no formula update', async() => {
    httpsSha256
      .rejects()
      .withArgs('https://registry.npmjs.org/@mongosh/cli-repl/-/cli-repl-1.0.0.tgz')
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
        homebrewCoreFork
      })
      .resolves(undefined);

    await publishToHomebrew(
      homebrewCore,
      homebrewCoreFork,
      '1.0.0',
      'githubRelease',
      httpsSha256,
      generateFormula,
      updateHomebrewFork
    );

    expect(httpsSha256).to.have.been.called;
    expect(generateFormula).to.have.been.called;
    expect(updateHomebrewFork).to.have.been.called;
    expect(createPullRequest).to.not.have.been.called;
  });

  it('silently ignores an error while deleting the PR branch', async() => {
    httpsSha256
      .rejects()
      .withArgs('https://registry.npmjs.org/@mongosh/cli-repl/-/cli-repl-1.0.0.tgz')
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
        homebrewCoreFork
      })
      .resolves('new-branch');

    createPullRequest
      .rejects()
      .withArgs('mongosh 1.0.0', sinon.match.string, 'mongodb-js:new-branch', 'master')
      .resolves({ prNumber: 42, url: 'url' });

    await publishToHomebrew(
      homebrewCore,
      homebrewCoreFork,
      '1.0.0',
      'githubRelease',
      httpsSha256,
      generateFormula,
      updateHomebrewFork
    );

    expect(httpsSha256).to.have.been.called;
    expect(generateFormula).to.have.been.called;
    expect(updateHomebrewFork).to.have.been.called;
    expect(createPullRequest).to.have.been.called;
  });
});
