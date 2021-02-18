import { expect } from 'chai';
import sinon from 'sinon';
import { getRepositoryStatus, RepositoryStatus, verifyGitStatus } from './repository-status';

describe('local repository-status', () => {
  let spawnSync: sinon.SinonStub;

  beforeEach(() => {
    spawnSync = sinon.stub();
  });

  describe('verifyGitStatus', () => {
    let getRepositoryStatus: sinon.SinonStub;

    beforeEach(()=> {
      getRepositoryStatus = sinon.stub();
    });

    [ 'master', 'main', 'v0.8.0', 'v0.8.x' ].forEach(branchName => {
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
        verifyGitStatus('root', getRepositoryStatus);
        expect(getRepositoryStatus).to.have.been.calledOnce;
      });
    });

    it('fails if it cannot determine branch', () => {
      const status: RepositoryStatus = {
        clean: true,
        hasUnpushedTags: false
      };
      getRepositoryStatus.returns(status);
      try {
        verifyGitStatus('root', getRepositoryStatus);
      } catch (e) {
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
        verifyGitStatus('root', getRepositoryStatus);
      } catch (e) {
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
        verifyGitStatus('root', getRepositoryStatus);
      } catch (e) {
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
        verifyGitStatus('root', getRepositoryStatus);
      } catch (e) {
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
        verifyGitStatus('root', getRepositoryStatus);
      } catch (e) {
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
        verifyGitStatus('root', getRepositoryStatus);
      } catch (e) {
        expect(e.message).to.contain('You have local tags that are not pushed to the remote');
        return;
      }
      expect.fail('Expected error');
    });
  });

  describe('getRepositoryStatus', () => {
    it('parses a clean repository correctly', () => {
      spawnSync.returns({
        stdout: '## master...origin/master\n'
      });
      spawnSync.onSecondCall().returns({
        stdout: 'Everything up-to-date'
      });

      const status = getRepositoryStatus('somePath', spawnSync);
      expect(status).to.deep.equal({
        branch: {
          local: 'master',
          tracking: 'origin/master',
          diverged: false
        },
        clean: true,
        hasUnpushedTags: false
      });
    });

    it('detectes pending file changes', () => {
      spawnSync.onFirstCall().returns({
        stdout: [
          '## master...origin/master',
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
          local: 'master',
          tracking: 'origin/master',
          diverged: false
        },
        clean: false,
        hasUnpushedTags: false
      });
    });

    it('detectes diverging branches', () => {
      spawnSync.returns({
        stdout: [
          '## master...origin/something [ahead 5, behind 3]',
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
          local: 'master',
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
          '## master'
        ].join('\n')
      });
      spawnSync.onSecondCall().returns({
        stdout: 'Everything up-to-date'
      });

      const status = getRepositoryStatus('somePath', spawnSync);
      expect(status).to.deep.equal({
        branch: {
          local: 'master',
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
          '## master...origin/master'
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
          local: 'master',
          tracking: 'origin/master',
          diverged: false
        },
        clean: true,
        hasUnpushedTags: true
      });
    });
  });
});
