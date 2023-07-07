import { expect } from 'chai';
import sinon from 'sinon';
import type { RepositoryStatus, TagDetails, TaggedCommit } from '../git';
import {
  computeNextTagNameFn,
  triggerReleaseDraft,
} from './trigger-release-draft';

describe('local trigger-release-draft', function () {
  describe('triggerReleaseDraft', function () {
    let verifyGitStatus: sinon.SinonStub;
    let getLatestDraftOrReleaseTagFromLog: sinon.SinonStub;
    let choose: sinon.SinonStub;
    let confirm: sinon.SinonStub;
    let spawnSync: sinon.SinonStub;

    const cleanRepoStatus: RepositoryStatus = {
      branch: {
        local: 'main',
        tracking: 'origin/main',
        diverged: false,
      },
      clean: true,
      hasUnpushedTags: false,
    };

    beforeEach(function () {
      verifyGitStatus = sinon.stub().returns(cleanRepoStatus);
      getLatestDraftOrReleaseTagFromLog = sinon.stub();
      choose = sinon.stub();
      confirm = sinon.stub();
      spawnSync = sinon.stub();
    });

    it('creates a new draft and pushes when everything is good', async function () {
      const latestTag: TaggedCommit = {
        commit: 'hash',
        tag: {
          draftVersion: 7,
          releaseVersion: '0.8.0',
          semverName: '0.8.0-draft.7',
        },
      };

      getLatestDraftOrReleaseTagFromLog.returns(latestTag);
      confirm.resolves(true);

      await triggerReleaseDraft(
        'root',
        verifyGitStatus,
        getLatestDraftOrReleaseTagFromLog,
        choose,
        confirm,
        spawnSync
      );

      expect(verifyGitStatus).to.have.been.called;
      expect(choose).to.not.have.been.called;
      expect(confirm).to.have.been.called;
      expect(spawnSync).to.have.been.calledTwice;
      expect(spawnSync.getCall(0)).calledWith(
        'git',
        ['tag', 'v0.8.0-draft.8'],
        sinon.match.any
      );
      expect(spawnSync.getCall(1)).calledWith(
        'git',
        ['push', 'origin', 'v0.8.0-draft.8'],
        sinon.match.any
      );
    });

    it('asks for the bump type and pushes a new draft if previous tag was a release on main', async function () {
      const latestTag: TaggedCommit = {
        commit: 'hash',
        tag: {
          draftVersion: undefined,
          releaseVersion: '0.8.0',
          semverName: '0.8.0',
        },
      };

      getLatestDraftOrReleaseTagFromLog.returns(latestTag);
      choose.resolves('minor');
      confirm.resolves(true);

      await triggerReleaseDraft(
        'root',
        verifyGitStatus,
        getLatestDraftOrReleaseTagFromLog,
        choose,
        confirm,
        spawnSync
      );

      expect(verifyGitStatus).to.have.been.called;
      expect(choose).to.have.been.called;
      expect(confirm).to.have.been.called;
      expect(spawnSync).to.have.been.calledTwice;
      expect(spawnSync.getCall(0)).calledWith(
        'git',
        ['tag', 'v0.9.0-draft.0'],
        sinon.match.any
      );
      expect(spawnSync.getCall(1)).calledWith(
        'git',
        ['push', 'origin', 'v0.9.0-draft.0'],
        sinon.match.any
      );
    });

    it('automatically does a patch when on a release branch (for a support release)', async function () {
      const repoStatus: RepositoryStatus = {
        branch: {
          local: 'release/v0.8.2',
          tracking: 'origin/release/v0.8.2',
          diverged: false,
        },
        clean: true,
        hasUnpushedTags: false,
      };

      const latestTag: TaggedCommit = {
        commit: 'hash',
        tag: {
          draftVersion: undefined,
          releaseVersion: '0.8.2',
          semverName: '0.8.2',
        },
      };

      verifyGitStatus.returns(repoStatus);
      getLatestDraftOrReleaseTagFromLog.returns(latestTag);
      confirm.resolves(true);

      await triggerReleaseDraft(
        'root',
        verifyGitStatus,
        getLatestDraftOrReleaseTagFromLog,
        choose,
        confirm,
        spawnSync
      );

      expect(verifyGitStatus).to.have.been.called;
      expect(confirm).to.have.been.calledTwice;
      expect(spawnSync).to.have.been.calledTwice;
      expect(spawnSync.getCall(0)).calledWith(
        'git',
        ['tag', 'v0.8.3-draft.0'],
        sinon.match.any
      );
      expect(spawnSync.getCall(1)).calledWith(
        'git',
        ['push', 'origin', 'v0.8.3-draft.0'],
        sinon.match.any
      );
    });

    it('fails if no previous tag is found', async function () {
      getLatestDraftOrReleaseTagFromLog.returns(undefined);
      try {
        await triggerReleaseDraft(
          'root',
          verifyGitStatus,
          getLatestDraftOrReleaseTagFromLog,
          choose,
          confirm,
          spawnSync
        );
      } catch (e: any) {
        expect(e.message).to.contain(
          'Could not find a previous draft or release tag.'
        );
        expect(verifyGitStatus).to.have.been.called;
        expect(choose).to.not.have.been.called;
        expect(confirm).to.not.have.been.called;
        expect(spawnSync).to.not.have.been.called;
        return;
      }
      expect.fail('Expected error');
    });

    it('aborts if user does not confirm', async function () {
      const latestTag: TaggedCommit = {
        commit: 'hash',
        tag: {
          draftVersion: 7,
          releaseVersion: '0.8.0',
          semverName: '0.8.0-draft.7',
        },
      };
      getLatestDraftOrReleaseTagFromLog.returns(latestTag);
      confirm.onFirstCall().resolves(true);
      confirm.onSecondCall().resolves(false);

      try {
        await triggerReleaseDraft(
          'root',
          verifyGitStatus,
          getLatestDraftOrReleaseTagFromLog,
          choose,
          confirm,
          spawnSync
        );
      } catch (e: any) {
        expect(e.message).to.contain('User aborted');
        expect(verifyGitStatus).to.have.been.called;
        expect(choose).to.not.have.been.called;
        expect(confirm).to.have.been.called;
        expect(spawnSync).to.not.have.been.called;
        return;
      }
      expect.fail('Expected error');
    });
  });

  describe('computeNextTagName', function () {
    const draftTag: TagDetails = {
      semverName: '0.8.0-draft.8',
      draftVersion: 8,
      releaseVersion: '0.8.0',
    };
    const releaseTag: TagDetails = {
      semverName: '0.8.0',
      draftVersion: undefined,
      releaseVersion: '0.8.0',
    };

    it('computes the next draft bump', function () {
      const result = computeNextTagNameFn(draftTag, 'draft');
      expect(result).to.equal('v0.8.0-draft.9');
    });
    it('computes the next patch bump', function () {
      const result = computeNextTagNameFn(releaseTag, 'patch');
      expect(result).to.equal('v0.8.1-draft.0');
    });
    it('computes the next minor bump', function () {
      const result = computeNextTagNameFn(releaseTag, 'minor');
      expect(result).to.equal('v0.9.0-draft.0');
    });
    it('computes the next major bump', function () {
      const result = computeNextTagNameFn(releaseTag, 'major');
      expect(result).to.equal('v1.0.0-draft.0');
    });
    it('fails on unknown bump type', function () {
      try {
        computeNextTagNameFn(releaseTag, 'what' as any);
      } catch (e: any) {
        expect(e.message).to.contain('unexpected bump type');
        return;
      }
      expect.fail('Expected error');
    });
  });
});
