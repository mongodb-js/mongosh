import chai, { expect } from 'chai';
import sinon from 'ts-sinon';
import { GithubRepo } from '../github-repo';
import { publishToHomebrew } from './publish-to-homebrew';

chai.use(require('sinon-chai'));

describe('Homebrew publish-to-homebrew', () => {
  let githubRepo: GithubRepo;
  let createPullRequest: sinon.SinonStub;
  let mergePullRequest: sinon.SinonStub;
  let deleteBranch: sinon.SinonStub;
  let httpsSha256: sinon.SinonStub;
  let generateFormula: sinon.SinonStub;
  let updateMongoDBTap: sinon.SinonStub;

  beforeEach(() => {
    createPullRequest = sinon.stub();
    mergePullRequest = sinon.stub();
    deleteBranch = sinon.stub();
    httpsSha256 = sinon.stub();
    generateFormula = sinon.stub();
    updateMongoDBTap = sinon.stub();

    githubRepo = sinon.createStubInstance(GithubRepo, {
      createPullRequest: createPullRequest as any,
      mergePullRequest: mergePullRequest as any,
      deleteBranch: deleteBranch as any
    }) as unknown as GithubRepo;
  });

  it('creates and merges a PR on update and cleans up', async() => {
    httpsSha256
      .rejects()
      .withArgs('https://registry.npmjs.org/@mongosh/cli-repl/-/cli-repl-1.0.0.tgz')
      .resolves('sha');

    generateFormula
      .returns('XXXX')
      .withArgs({ version: '1.0.0', sha: 'sha' })
      .returns('new formula');

    updateMongoDBTap
      .rejects()
      .withArgs({
        packageVersion: '1.0.0',
        packageSha: 'sha',
        homebrewFormula: 'new formula',
        mongoHomebrewGithubRepo: githubRepo
      })
      .resolves('new-branch');

    createPullRequest
      .rejects()
      .withArgs('mongosh 1.0.0', 'new-branch', 'master')
      .resolves({ prNumber: 42, url: 'url' });

    mergePullRequest
      .rejects()
      .withArgs(42)
      .resolves();

    deleteBranch
      .rejects()
      .withArgs('new-branch')
      .resolves();

    await publishToHomebrew(
      githubRepo,
      '1.0.0',
      httpsSha256,
      generateFormula,
      updateMongoDBTap
    );

    expect(httpsSha256).to.have.been.called;
    expect(generateFormula).to.have.been.called;
    expect(updateMongoDBTap).to.have.been.called;
    expect(createPullRequest).to.have.been.called;
    expect(mergePullRequest).to.have.been.called;
    expect(deleteBranch).to.have.been.called;
  });

  it('does not try to push/merge when there is no formula update', async() => {
    httpsSha256
      .rejects()
      .withArgs('https://registry.npmjs.org/@mongosh/cli-repl/-/cli-repl-1.0.0.tgz')
      .resolves('sha');

    generateFormula
      .returns('XXXX')
      .withArgs({ version: '1.0.0', sha: 'sha' })
      .returns('formula');

    updateMongoDBTap
      .rejects()
      .withArgs({
        packageVersion: '1.0.0',
        packageSha: 'sha',
        homebrewFormula: 'formula',
        mongoHomebrewGithubRepo: githubRepo
      })
      .resolves(undefined);

    await publishToHomebrew(
      githubRepo,
      '1.0.0',
      httpsSha256,
      generateFormula,
      updateMongoDBTap
    );

    expect(httpsSha256).to.have.been.called;
    expect(generateFormula).to.have.been.called;
    expect(updateMongoDBTap).to.have.been.called;
    expect(createPullRequest).to.not.have.been.called;
    expect(mergePullRequest).to.not.have.been.called;
    expect(deleteBranch).to.not.have.been.called;
  });

  it('silently ignores an error while deleting the PR branch', async() => {
    httpsSha256
      .rejects()
      .withArgs('https://registry.npmjs.org/@mongosh/cli-repl/-/cli-repl-1.0.0.tgz')
      .resolves('sha');

    generateFormula
      .returns('XXXX')
      .withArgs({ version: '1.0.0', sha: 'sha' })
      .returns('new formula');

    updateMongoDBTap
      .rejects()
      .withArgs({
        packageVersion: '1.0.0',
        packageSha: 'sha',
        homebrewFormula: 'new formula',
        mongoHomebrewGithubRepo: githubRepo
      })
      .resolves('new-branch');

    createPullRequest
      .rejects()
      .withArgs('mongosh 1.0.0', 'new-branch', 'master')
      .resolves({ prNumber: 42, url: 'url' });

    mergePullRequest
      .rejects()
      .withArgs(42)
      .resolves();

    deleteBranch.rejects();

    await publishToHomebrew(
      githubRepo,
      '1.0.0',
      httpsSha256,
      generateFormula,
      updateMongoDBTap
    );

    expect(httpsSha256).to.have.been.called;
    expect(generateFormula).to.have.been.called;
    expect(updateMongoDBTap).to.have.been.called;
    expect(createPullRequest).to.have.been.called;
    expect(mergePullRequest).to.have.been.called;
    expect(deleteBranch).to.have.been.called;
  });
});
