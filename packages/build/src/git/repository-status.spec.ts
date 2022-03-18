import { expect } from 'chai';
import sinon from 'sinon';
import { getReleaseVersionFromBranch, getRepositoryStatus, RepositoryStatus, verifyGitStatus } from './repository-status';

describe('git repository-status', () => {
  let spawnSync: sinon.SinonStub;

  beforeEach(() => {
    spawnSync = sinon.stub();
  });

  describe('verifyGitStatus', () => {
    let getRepositoryStatus: sinon.SinonStub;
    let spawnSync: sinon.SinonStub;

    beforeEach(()=> {
      getRepositoryStatus = sinon.stub();
      spawnSync = sinon.stub();
    });

    [ 'master', 'main', 'release/v0.8.0', 'release/v0.8.x' ].forEach(branchName => {
      it(`accepts a clean repository on ${branchName}`, () => {
        const status: RepositoryStatus = {
          branch: {
            local: branchName,
            tracking: `origin/${branchName}`,
            diverged: false
          },
          clean: true,
          hasUnpushedTags: false
        };
        getRepositoryStatus.returns(status);
        const returnedStatus = verifyGitStatus('root', getRepositoryStatus, spawnSync);
        expect(returnedStatus).to.equal(status);
        expect(spawnSync).to.have.been.calledWith('git', ['fetch', '--tags'], sinon.match.object);
      });
    });

    it('fails if it cannot determine branch', () => {
      const status: RepositoryStatus = {
        clean: true,
        hasUnpushedTags: false
      };
      getRepositoryStatus.returns(status);
      try {
        verifyGitStatus('root', getRepositoryStatus, spawnSync);
      } catch (e: any) {
        expect(e.message).to.contain('Could not determine local repository information');
        return;
      }
      expect.fail('Expected error');
    });

    it('fails for a forbidden branch', () => {
      const status: RepositoryStatus = {
        branch: {
          local: 'somebranch',
          tracking: 'origin/somebranch',
          diverged: false
        },
        clean: true,
        hasUnpushedTags: false
      };
      getRepositoryStatus.returns(status);
      try {
        verifyGitStatus('root', getRepositoryStatus, spawnSync);
      } catch (e: any) {
        expect(e.message).to.contain('The current branch does not match');
        return;
      }
      expect.fail('Expected error');
    });

    it('fails if tracking branch is missing', () => {
      const status: RepositoryStatus = {
        branch: {
          local: 'main',
          tracking: undefined,
          diverged: false
        },
        clean: true,
        hasUnpushedTags: false
      };
      getRepositoryStatus.returns(status);
      try {
        verifyGitStatus('root', getRepositoryStatus, spawnSync);
      } catch (e: any) {
        expect(e.message).to.contain('The branch you are on is not tracking any remote branch.');
        return;
      }
      expect.fail('Expected error');
    });

    it('fails if repository is not clean', () => {
      const status: RepositoryStatus = {
        branch: {
          local: 'main',
          tracking: 'origin/main',
          diverged: false
        },
        clean: false,
        hasUnpushedTags: false
      };
      getRepositoryStatus.returns(status);
      try {
        verifyGitStatus('root', getRepositoryStatus, spawnSync);
      } catch (e: any) {
        expect(e.message).to.contain('Your local repository is not clean or diverged from the remote branch');
        return;
      }
      expect.fail('Expected error');
    });

    it('fails if repository diverged from remote', () => {
      const status: RepositoryStatus = {
        branch: {
          local: 'main',
          tracking: 'origin/main',
          diverged: true
        },
        clean: true,
        hasUnpushedTags: false
      };
      getRepositoryStatus.returns(status);
      try {
        verifyGitStatus('root', getRepositoryStatus, spawnSync);
      } catch (e: any) {
        expect(e.message).to.contain('Your local repository is not clean or diverged from the remote branch');
        return;
      }
      expect.fail('Expected error');
    });

    it('fails if repository has unpushed tags', () => {
      const status: RepositoryStatus = {
        branch: {
          local: 'main',
          tracking: 'origin/main',
          diverged: false
        },
        clean: true,
        hasUnpushedTags: true
      };
      getRepositoryStatus.returns(status);
      try {
        verifyGitStatus('root', getRepositoryStatus, spawnSync);
      } catch (e: any) {
        expect(e.message).to.contain('You have local tags that are not pushed to the remote');
        return;
      }
      expect.fail('Expected error');
    });
  });

  describe('getRepositoryStatus', () => {
    [
      'master',
      'main',
      'release/v0.7.x',
      'release/another-branch',
      'release/v0.7.9'
    ].forEach(branch => {
      it('parses a clean repository correctly', () => {
        spawnSync.returns({
          stdout: `## ${branch}...origin/${branch}\n`
        });
        spawnSync.onSecondCall().returns({
          stdout: 'Everything up-to-date'
        });

        const status = getRepositoryStatus('somePath', spawnSync);
        expect(status).to.deep.equal({
          branch: {
            local: branch,
            tracking: `origin/${branch}`,
            diverged: false
          },
          clean: true,
          hasUnpushedTags: false
        });
      });
    });

    it('detectes pending file changes', () => {
      spawnSync.onFirstCall().returns({
        stdout: [
          '## main...origin/main',
          'A  packages/build/src/helpers/index.ts',
          'A  packages/build/src/helpers/spawn-sync.spec.ts',
          '?? packages/build/src/helpers/test',
        ].join('\n')
      });
      spawnSync.onSecondCall().returns({
        stdout: 'Everything up-to-date'
      });

      const status = getRepositoryStatus('somePath', spawnSync);
      expect(status).to.deep.equal({
        branch: {
          local: 'main',
          tracking: 'origin/main',
          diverged: false
        },
        clean: false,
        hasUnpushedTags: false
      });
    });

    it('detectes diverging branches', () => {
      spawnSync.returns({
        stdout: [
          '## main...origin/something [ahead 5, behind 3]',
          'A  packages/build/src/helpers/index.ts',
          'A  packages/build/src/helpers/spawn-sync.spec.ts',
          '?? packages/build/src/helpers/test',
        ].join('\n')
      });
      spawnSync.onSecondCall().returns({
        stdout: 'Everything up-to-date'
      });

      const status = getRepositoryStatus('somePath', spawnSync);
      expect(status).to.deep.equal({
        branch: {
          local: 'main',
          tracking: 'origin/something',
          diverged: true
        },
        clean: false,
        hasUnpushedTags: false
      });
    });

    it('detectes missing origin', () => {
      spawnSync.returns({
        stdout: [
          '## main'
        ].join('\n')
      });
      spawnSync.onSecondCall().returns({
        stdout: 'Everything up-to-date'
      });

      const status = getRepositoryStatus('somePath', spawnSync);
      expect(status).to.deep.equal({
        branch: {
          local: 'main',
          tracking: undefined,
          diverged: false
        },
        clean: true,
        hasUnpushedTags: false
      });
    });

    it('detects unpushed tags', () => {
      spawnSync.onFirstCall().returns({
        stdout: [
          '## main...origin/main'
        ].join('\n')
      });
      spawnSync.onSecondCall().returns({
        stdout: [
          'To github.com:mongodb-js/mongosh.git',
          '* [new tag]           vxxx -> vxxx'
        ].join('\n')
      });

      const status = getRepositoryStatus('somePath', spawnSync);
      expect(status).to.deep.equal({
        branch: {
          local: 'main',
          tracking: 'origin/main',
          diverged: false
        },
        clean: true,
        hasUnpushedTags: true
      });
    });
  });

  describe('getReleaseVersionFromDraft', () => {
    it('parses the release branch properly', () => {
      const version = getReleaseVersionFromBranch('release/v0.8.3');
      expect(version).to.deep.equal({
        major: 0,
        minor: 8,
        patch: 3
      });
    });

    it('handles a release branch that is not fully numbered', () => {
      const version = getReleaseVersionFromBranch('release/v0.8.x');
      expect(version).to.deep.equal({
        major: 0,
        minor: 8,
        patch: undefined
      });
    });

    it('returns undefined for non-release branches', () => {
      const version = getReleaseVersionFromBranch('main');
      expect(version).to.be.undefined;
    });
  });
});
