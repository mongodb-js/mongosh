import * as chai from 'chai';
import { expect } from 'chai';
import sinon from 'sinon';
import { GithubRepo } from '@mongodb-js/devtools-github-repo';
import { updateHomebrewFork } from './update-homebrew-fork';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

describe('Homebrew update-homebrew-fork', function () {
  let getFileContent: sinon.SinonStub;
  let getBranchDetails: sinon.SinonStub;
  let createBranch: sinon.SinonStub;
  let commitFileUpdateFork: sinon.SinonStub;
  let homebrewCore: GithubRepo;
  let homebrewCoreFork: GithubRepo;

  beforeEach(function () {
    getFileContent = sinon.stub();
    getBranchDetails = sinon.stub();
    homebrewCore = sinon.createStubInstance(GithubRepo, {
      getFileContent: getFileContent as any,
      getBranchDetails: getBranchDetails as any,
    }) as unknown as GithubRepo;

    createBranch = sinon.stub();
    commitFileUpdateFork = sinon.stub();
    homebrewCoreFork = sinon.createStubInstance(GithubRepo, {
      createBranch: createBranch as any,
      commitFileUpdate: commitFileUpdateFork as any,
    }) as unknown as GithubRepo;
  });

  it('writes updated formula and pushes changes', async function () {
    getFileContent.rejects().withArgs('Formula/m/mongosh.rb').resolves({
      blobSha: 'sha1',
      content: 'old formula',
    });
    getBranchDetails
      .rejects()
      .withArgs('master')
      .resolves({
        ref: 'refs/head/master',
        object: {
          sha: 'upstreamSha',
        },
      });

    createBranch
      .rejects()
      .withArgs('mongosh-1.0.0-sha', 'upstreamSha')
      .resolves();
    commitFileUpdateFork
      .rejects(new Error('that went wrong'))
      .withArgs(
        'mongosh 1.0.0',
        'sha1',
        'Formula/m/mongosh.rb',
        'updated formula',
        'mongosh-1.0.0-sha'
      )
      .resolves({
        commitSha: 'commitsha',
      });

    const updated = await updateHomebrewFork({
      packageVersion: '1.0.0',
      packageSha: 'sha',
      homebrewFormula: 'updated formula',
      homebrewCore,
      homebrewCoreFork,
      isDryRun: false,
    });

    expect(updated).to.equal('mongosh-1.0.0-sha');
    expect(getFileContent).to.have.been.calledOnce;
    expect(commitFileUpdateFork).to.have.been.calledOnce;
  });

  it('does not push changes if formula is same', async function () {
    getFileContent.rejects().withArgs('Formula/m/mongosh.rb').resolves({
      blobSha: 'sha1',
      content: 'formula',
    });

    const updated = await updateHomebrewFork({
      packageVersion: '1.0.0',
      packageSha: 'sha',
      homebrewFormula: 'formula',
      homebrewCore,
      homebrewCoreFork,
      isDryRun: false,
    });

    expect(updated).to.equal(undefined);
    expect(getFileContent).to.have.been.calledOnce;
    expect(getBranchDetails).to.not.have.been.called;
    expect(createBranch).to.not.have.been.called;
    expect(commitFileUpdateFork).to.not.have.been.called;
  });
});
