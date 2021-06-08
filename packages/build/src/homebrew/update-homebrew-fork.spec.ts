import chai, { expect } from 'chai';
import sinon from 'ts-sinon';
import { GithubRepo } from '../github-repo';
import { updateHomebrewFork } from './update-homebrew-fork';

chai.use(require('sinon-chai'));

describe('Homebrew update-homebrew-fork', () => {
  let getFileContent: sinon.SinonStub;
  let commitFileUpdate: sinon.SinonStub;
  let githubRepo: GithubRepo;

  beforeEach(() => {
    getFileContent = sinon.stub();
    commitFileUpdate = sinon.stub();
    githubRepo = sinon.createStubInstance(GithubRepo, {
      getFileContent: getFileContent as any,
      commitFileUpdate: commitFileUpdate as any
    }) as unknown as GithubRepo;
  });

  it('writes updated formula and pushes changes', async() => {
    getFileContent
      .withArgs('Formula/mongosh.rb')
      .resolves({
        blobSha: 'sha1',
        content: 'old formula'
      });
    commitFileUpdate
      .rejects(new Error('that went wrong'))
      .withArgs(
        'mongosh 1.0.0',
        'sha1',
        'Formula/mongosh.rb',
        'updated formula',
        'mongosh-1.0.0-sha'
      )
      .resolves({
        commitSha: 'commitsha'
      });

    const updated = await updateHomebrewFork({
      packageVersion: '1.0.0',
      packageSha: 'sha',
      homebrewFormula: 'updated formula',
      homebrewCoreFork: githubRepo
    });

    expect(updated).to.equal('mongosh-1.0.0-sha');
    expect(getFileContent).to.have.been.calledOnce;
    expect(commitFileUpdate).to.have.been.calledOnce;
  });

  it('does not push changes if formula is same', async() => {
    getFileContent
      .withArgs('Formula/mongosh.rb')
      .resolves({
        blobSha: 'sha1',
        content: 'formula'
      });

    const updated = await updateHomebrewFork({
      packageVersion: '1.0.0',
      packageSha: 'sha',
      homebrewFormula: 'formula',
      homebrewCoreFork: githubRepo
    });

    expect(updated).to.equal(undefined);
    expect(getFileContent).to.have.been.calledOnce;
    expect(commitFileUpdate).to.not.have.been.called;
  });
});
