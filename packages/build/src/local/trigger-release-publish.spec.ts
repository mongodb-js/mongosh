import { expect } from 'chai';
import sinon from 'sinon';
import type { EvergreenApi, EvergreenTask } from '../evergreen';
import type { RepositoryStatus, TaggedCommit } from '../git';
import {
  getEvergreenProjectForBranch,
  triggerReleasePublish,
  verifyEvergreenStatusFn,
} from './trigger-release-publish';

describe('local trigger-release-publish', function () {
  describe('triggerReleasePublish', function () {
    let verifyGitStatus: sinon.SinonStub;
    let getLatestDraftOrReleaseTagFromLog: sinon.SinonStub;
    let confirm: sinon.SinonStub;
    let verifyEvergreenStatus: sinon.SinonStub;
    let spawnSync: sinon.SinonStub;

    const mainRepoStatus: RepositoryStatus = {
      branch: { local: 'main', tracking: 'origin/main', diverged: false },
      clean: true,
      hasUnpushedTags: false,
    };

    beforeEach(function () {
      verifyGitStatus = sinon.stub().returns(mainRepoStatus);
      getLatestDraftOrReleaseTagFromLog = sinon.stub();
      confirm = sinon.stub();
      verifyEvergreenStatus = sinon.stub();
      spawnSync = sinon.stub();
    });

    it('creates a new release tag and pushes when everything is good', async function () {
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

      await triggerReleasePublish(
        'root',
        verifyGitStatus,
        getLatestDraftOrReleaseTagFromLog,
        confirm,
        verifyEvergreenStatus,
        spawnSync
      );

      expect(verifyGitStatus).to.have.been.called;
      expect(getLatestDraftOrReleaseTagFromLog).to.have.been.calledWith(
        'root',
        undefined
      );
      expect(confirm).to.have.been.called;
      expect(verifyEvergreenStatus).to.have.been.calledWith(
        latestTag,
        'mongosh'
      );
      expect(spawnSync).to.have.been.calledTwice;
      expect(spawnSync.getCall(0)).calledWith(
        'git',
        ['tag', '-m', 'v0.8.0 from main', 'v0.8.0', 'hash'],
        sinon.match.any
      );
      expect(spawnSync.getCall(1)).calledWith(
        'git',
        ['push', 'origin', 'v0.8.0'],
        sinon.match.any
      );
    });

    it('only considers tags of the branch version on a version branch', async function () {
      const versionBranchRepoStatus: RepositoryStatus = {
        branch: { local: 'v2.x', tracking: 'origin/v2.x', diverged: false },
        clean: true,
        hasUnpushedTags: false,
      };
      verifyGitStatus.returns(versionBranchRepoStatus);
      const latestTag: TaggedCommit = {
        commit: 'hash',
        tag: {
          draftVersion: 1,
          releaseVersion: '2.14.1',
          semverName: '2.14.1-draft.1',
        },
      };
      getLatestDraftOrReleaseTagFromLog.returns(latestTag);
      confirm.resolves(true);

      await triggerReleasePublish(
        'root',
        verifyGitStatus,
        getLatestDraftOrReleaseTagFromLog,
        confirm,
        verifyEvergreenStatus,
        spawnSync
      );

      expect(getLatestDraftOrReleaseTagFromLog).to.have.been.calledWith(
        'root',
        { major: 2 }
      );
      expect(verifyEvergreenStatus).to.have.been.calledWith(
        latestTag,
        'mongosh-2.x'
      );
      expect(spawnSync.getCall(0)).calledWith(
        'git',
        ['tag', '-m', 'v2.14.1 from v2.x', 'v2.14.1', 'hash'],
        sinon.match.any
      );
    });

    it('fails if no previous tag is found', async function () {
      getLatestDraftOrReleaseTagFromLog.returns(undefined);
      try {
        await triggerReleasePublish(
          'root',
          verifyGitStatus,
          getLatestDraftOrReleaseTagFromLog,
          confirm,
          verifyEvergreenStatus,
          spawnSync
        );
      } catch (e: any) {
        expect(e.message).to.contain(
          'Failed to find a prior tag to release from'
        );
        expect(verifyGitStatus).to.have.been.called;
        expect(confirm).to.not.have.been.called;
        expect(verifyEvergreenStatus).to.not.have.been.called;
        expect(spawnSync).to.not.have.been.called;
        return;
      }
      expect.fail('Expected error');
    });

    it('fails if the previous tag is not a draft', async function () {
      const latestTag: TaggedCommit = {
        commit: 'hash',
        tag: {
          draftVersion: undefined,
          releaseVersion: '0.8.0',
          semverName: '0.8.0',
        },
      };
      getLatestDraftOrReleaseTagFromLog.returns(latestTag);

      try {
        await triggerReleasePublish(
          'root',
          verifyGitStatus,
          getLatestDraftOrReleaseTagFromLog,
          confirm,
          verifyEvergreenStatus,
          spawnSync
        );
      } catch (e: any) {
        expect(e.message).to.contain("but it's not a draft");
        expect(verifyGitStatus).to.have.been.called;
        expect(confirm).to.not.have.been.called;
        expect(verifyEvergreenStatus).to.not.have.been.called;
        expect(spawnSync).to.not.have.been.called;
        return;
      }
      expect.fail('Expected error');
    });

    it('fails if evergreen check fails', async function () {
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
      const expectedError = new Error('that failed');
      verifyEvergreenStatus.rejects(expectedError);

      try {
        await triggerReleasePublish(
          'root',
          verifyGitStatus,
          getLatestDraftOrReleaseTagFromLog,
          confirm,
          verifyEvergreenStatus,
          spawnSync
        );
      } catch (e: any) {
        expect(e).to.equal(expectedError);
        expect(verifyGitStatus).to.have.been.called;
        expect(confirm).to.have.been.called;
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
      confirm.resolves(false);

      try {
        await triggerReleasePublish(
          'root',
          verifyGitStatus,
          getLatestDraftOrReleaseTagFromLog,
          confirm,
          verifyEvergreenStatus,
          spawnSync
        );
      } catch (e: any) {
        expect(e.message).to.contain('User aborted');
        expect(verifyGitStatus).to.have.been.called;
        expect(confirm).to.have.been.called;
        expect(spawnSync).to.not.have.been.called;
        return;
      }
      expect.fail('Expected error');
    });
  });

  describe('verifyEvergreenStatus', function () {
    let evergreenProvider: Promise<EvergreenApi>;
    let getTasks: sinon.SinonStub;

    const exampleTag: TaggedCommit = {
      commit: 'sha',
      tag: {
        draftVersion: 5,
        releaseVersion: '0.8.2',
        semverName: '0.8.2-draft.5',
      },
    };

    const failedTask: EvergreenTask = {
      task_id: 'task1',
      version_id: 'v1',
      build_variant: 'windows',
      display_name: 'Task 1',
      status: 'failed',
    };
    const successTask: EvergreenTask = {
      task_id: 'task2',
      version_id: 'v2',
      build_variant: 'windows',
      display_name: 'Task 2',
      status: 'success',
    };

    beforeEach(function () {
      getTasks = sinon.stub();
      evergreenProvider = Promise.resolve({
        getTasks,
      } as unknown as EvergreenApi);
    });

    it('works if all tasks are successful', async function () {
      getTasks.resolves([successTask]);
      await verifyEvergreenStatusFn(
        exampleTag,
        'mongosh-2.x',
        evergreenProvider
      );
      expect(getTasks).to.have.been.calledWith(
        'mongosh-2.x',
        'sha',
        'v0.8.2-draft.5'
      );
    });

    it('fails if evergreen fails', async function () {
      const expectedError = new Error('failed');
      getTasks.rejects(expectedError);
      try {
        await verifyEvergreenStatusFn(
          exampleTag,
          'mongosh-2.x',
          evergreenProvider
        );
      } catch (e: any) {
        expect(e).to.equal(expectedError);
        return;
      }
      expect.fail('Expected error');
    });

    it('fails if there are failed tasks and user cancels', async function () {
      getTasks.resolves([successTask, failedTask]);
      const confirm = sinon.stub().resolves(false);
      try {
        await verifyEvergreenStatusFn(
          exampleTag,
          'mongosh-2.x',
          evergreenProvider,
          confirm
        );
      } catch (e: any) {
        expect(e.message).to.contain(
          'Some Evergreen tasks were not successful'
        );
        expect(getTasks).to.have.been.calledWith(
          'mongosh-2.x',
          'sha',
          'v0.8.2-draft.5'
        );
        return;
      }
      expect.fail('Expected error');
    });

    it('continues if there are failed tasks but user acknowledges', async function () {
      getTasks.resolves([successTask, failedTask]);
      const confirm = sinon.stub().resolves(true);
      await verifyEvergreenStatusFn(
        exampleTag,
        'mongosh-2.x',
        evergreenProvider,
        confirm
      );
      expect(confirm).to.have.been.called;
    });
  });

  describe('getEvergreenProjectForBranch', function () {
    it('uses the mongosh project for main and master', function () {
      expect(getEvergreenProjectForBranch('main')).to.equal('mongosh');
      expect(getEvergreenProjectForBranch('master')).to.equal('mongosh');
    });

    it('uses the project of the release line for version branches', function () {
      expect(getEvergreenProjectForBranch('v2.x')).to.equal('mongosh-2.x');
      expect(getEvergreenProjectForBranch('release/v2.14.x')).to.equal(
        'mongosh-2.x'
      );
      expect(getEvergreenProjectForBranch('release/v2.14.3')).to.equal(
        'mongosh-2.x'
      );
      expect(getEvergreenProjectForBranch('v3.x')).to.equal('mongosh-3.x');
    });
  });
});
