import { expect } from 'chai';
import sinon from 'sinon';
import type { RepositoryStatus } from './repository-status';
import {
  getReleaseVersionFromBranch,
  getReleaseVersionRestrictionFromBranch,
  getRepositoryStatus,
  isReleasableBranch,
  verifyGitStatus,
} from './repository-status';

describe('git repository-status', function () {
  let spawnSync: sinon.SinonStub;

  beforeEach(function () {
    spawnSync = sinon.stub();
  });

  describe('verifyGitStatus', function () {
    let getRepositoryStatus: sinon.SinonStub;
    let spawnSync: sinon.SinonStub;

    beforeEach(function () {
      getRepositoryStatus = sinon.stub();
      spawnSync = sinon.stub();
    });

    ['master', 'main', 'v2.x', 'release/v0.8.0', 'release/v0.8.x'].forEach(
      (branchName) => {
        it(`accepts a clean repository on ${branchName}`, function () {
          const status: RepositoryStatus = {
            branch: {
              local: branchName,
              tracking: `origin/${branchName}`,
              diverged: false,
            },
            clean: true,
            hasUnpushedTags: false,
          };
          getRepositoryStatus.returns(status);
          const returnedStatus = verifyGitStatus(
            'root',
            getRepositoryStatus,
            spawnSync
          );
          expect(returnedStatus).to.equal(status);
          expect(spawnSync).to.have.been.calledWith(
            'git',
            ['fetch', '--tags'],
            sinon.match.object
          );
        });
      }
    );

    it('fails if it cannot determine branch', function () {
      const status: RepositoryStatus = {
        clean: true,
        hasUnpushedTags: false,
      };
      getRepositoryStatus.returns(status);
      try {
        verifyGitStatus('root', getRepositoryStatus, spawnSync);
      } catch (e: any) {
        expect(e.message).to.contain(
          'Could not determine local repository information'
        );
        return;
      }
      expect.fail('Expected error');
    });

    it('fails for a forbidden branch', function () {
      const status: RepositoryStatus = {
        branch: {
          local: 'somebranch',
          tracking: 'origin/somebranch',
          diverged: false,
        },
        clean: true,
        hasUnpushedTags: false,
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

    it('fails if tracking branch is missing', function () {
      const status: RepositoryStatus = {
        branch: {
          local: 'main',
          tracking: undefined,
          diverged: false,
        },
        clean: true,
        hasUnpushedTags: false,
      };
      getRepositoryStatus.returns(status);
      try {
        verifyGitStatus('root', getRepositoryStatus, spawnSync);
      } catch (e: any) {
        expect(e.message).to.contain(
          'The branch you are on is not tracking any remote branch.'
        );
        return;
      }
      expect.fail('Expected error');
    });

    it('fails if repository is not clean', function () {
      const status: RepositoryStatus = {
        branch: {
          local: 'main',
          tracking: 'origin/main',
          diverged: false,
        },
        clean: false,
        hasUnpushedTags: false,
      };
      getRepositoryStatus.returns(status);
      try {
        verifyGitStatus('root', getRepositoryStatus, spawnSync);
      } catch (e: any) {
        expect(e.message).to.contain(
          'Your local repository is not clean or diverged from the remote branch'
        );
        return;
      }
      expect.fail('Expected error');
    });

    it('fails if repository diverged from remote', function () {
      const status: RepositoryStatus = {
        branch: {
          local: 'main',
          tracking: 'origin/main',
          diverged: true,
        },
        clean: true,
        hasUnpushedTags: false,
      };
      getRepositoryStatus.returns(status);
      try {
        verifyGitStatus('root', getRepositoryStatus, spawnSync);
      } catch (e: any) {
        expect(e.message).to.contain(
          'Your local repository is not clean or diverged from the remote branch'
        );
        return;
      }
      expect.fail('Expected error');
    });

    it('fails if repository has unpushed tags', function () {
      const status: RepositoryStatus = {
        branch: {
          local: 'main',
          tracking: 'origin/main',
          diverged: false,
        },
        clean: true,
        hasUnpushedTags: true,
      };
      getRepositoryStatus.returns(status);
      try {
        verifyGitStatus('root', getRepositoryStatus, spawnSync);
      } catch (e: any) {
        expect(e.message).to.contain(
          'You have local tags that are not pushed to the remote'
        );
        return;
      }
      expect.fail('Expected error');
    });
  });

  describe('getRepositoryStatus', function () {
    [
      'master',
      'main',
      'release/v0.7.x',
      'release/another-branch',
      'release/v0.7.9',
    ].forEach((branch) => {
      it('parses a clean repository correctly', function () {
        spawnSync.returns({
          stdout: `## ${branch}...origin/${branch}\n`,
        });
        spawnSync.onSecondCall().returns({
          stdout: 'Everything up-to-date',
        });

        const status = getRepositoryStatus('somePath', spawnSync);
        expect(status).to.deep.equal({
          branch: {
            local: branch,
            tracking: `origin/${branch}`,
            diverged: false,
          },
          clean: true,
          hasUnpushedTags: false,
        });
      });
    });

    it('detectes pending file changes', function () {
      spawnSync.onFirstCall().returns({
        stdout: [
          '## main...origin/main',
          'A  packages/build/src/helpers/index.ts',
          'A  packages/build/src/helpers/spawn-sync.spec.ts',
          '?? packages/build/src/helpers/test',
        ].join('\n'),
      });
      spawnSync.onSecondCall().returns({
        stdout: 'Everything up-to-date',
      });

      const status = getRepositoryStatus('somePath', spawnSync);
      expect(status).to.deep.equal({
        branch: {
          local: 'main',
          tracking: 'origin/main',
          diverged: false,
        },
        clean: false,
        hasUnpushedTags: false,
      });
    });

    it('detectes diverging branches', function () {
      spawnSync.returns({
        stdout: [
          '## main...origin/something [ahead 5, behind 3]',
          'A  packages/build/src/helpers/index.ts',
          'A  packages/build/src/helpers/spawn-sync.spec.ts',
          '?? packages/build/src/helpers/test',
        ].join('\n'),
      });
      spawnSync.onSecondCall().returns({
        stdout: 'Everything up-to-date',
      });

      const status = getRepositoryStatus('somePath', spawnSync);
      expect(status).to.deep.equal({
        branch: {
          local: 'main',
          tracking: 'origin/something',
          diverged: true,
        },
        clean: false,
        hasUnpushedTags: false,
      });
    });

    it('detectes missing origin', function () {
      spawnSync.returns({
        stdout: ['## main'].join('\n'),
      });
      spawnSync.onSecondCall().returns({
        stdout: 'Everything up-to-date',
      });

      const status = getRepositoryStatus('somePath', spawnSync);
      expect(status).to.deep.equal({
        branch: {
          local: 'main',
          tracking: undefined,
          diverged: false,
        },
        clean: true,
        hasUnpushedTags: false,
      });
    });

    it('detects unpushed tags', function () {
      spawnSync.onFirstCall().returns({
        stdout: ['## main...origin/main'].join('\n'),
      });
      spawnSync.onSecondCall().returns({
        stdout: [
          'To github.com:mongodb-js/mongosh.git',
          '* [new tag]           vxxx -> vxxx',
        ].join('\n'),
      });

      const status = getRepositoryStatus('somePath', spawnSync);
      expect(status).to.deep.equal({
        branch: {
          local: 'main',
          tracking: 'origin/main',
          diverged: false,
        },
        clean: true,
        hasUnpushedTags: true,
      });
    });
  });

  describe('getReleaseVersionFromDraft', function () {
    it('parses the release branch properly', function () {
      const version = getReleaseVersionFromBranch('release/v0.8.3');
      expect(version).to.deep.equal({
        major: 0,
        minor: 8,
        patch: 3,
      });
    });

    it('handles a release branch that is not fully numbered', function () {
      const version = getReleaseVersionFromBranch('release/v0.8.x');
      expect(version).to.deep.equal({
        major: 0,
        minor: 8,
        patch: undefined,
      });
    });

    it('returns undefined for non-release branches', function () {
      const version = getReleaseVersionFromBranch('main');
      expect(version).to.be.undefined;
    });
  });

  describe('isReleasableBranch', function () {
    ['main', 'master', 'v2.x', 'release/v2.14.x', 'release/v2.14.3'].forEach(
      (branchName) => {
        it(`returns true for ${branchName}`, function () {
          expect(isReleasableBranch(branchName)).to.be.true;
        });
      }
    );

    ['feature', 'release/v2.x', 'v2', '2.x', '2.x.y', undefined].forEach(
      (branchName) => {
        it(`returns false for ${String(branchName)}`, function () {
          expect(isReleasableBranch(branchName)).to.be.false;
        });
      }
    );
  });

  describe('getReleaseVersionRestrictionFromBranch', function () {
    it('does not restrict tags on main or master', function () {
      expect(getReleaseVersionRestrictionFromBranch('main')).to.be.undefined;
      expect(getReleaseVersionRestrictionFromBranch('master')).to.be.undefined;
    });

    it('restricts tags to the major version on a version branch', function () {
      expect(getReleaseVersionRestrictionFromBranch('v2.x')).to.deep.equal({
        major: 2,
      });
    });

    it('restricts tags to the version on a release branch', function () {
      expect(
        getReleaseVersionRestrictionFromBranch('release/v2.14.3')
      ).to.deep.equal({ major: 2, minor: 14, patch: 3 });
      expect(
        getReleaseVersionRestrictionFromBranch('release/v2.14.x')
      ).to.deep.equal({ major: 2, minor: 14, patch: undefined });
    });

    it('returns undefined for non-release branches', function () {
      expect(getReleaseVersionRestrictionFromBranch('feature')).to.be.undefined;
      expect(getReleaseVersionRestrictionFromBranch(undefined)).to.be.undefined;
    });
  });
});
