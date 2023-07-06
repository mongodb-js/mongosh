import { expect } from 'chai';
import sinon from 'sinon';
import type { EvergreenApi, EvergreenTask } from '../evergreen';
import type { TaggedCommit } from '../git';
import {
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

    beforeEach(function () {
      verifyGitStatus = sinon.stub();
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
      expect(confirm).to.have.been.called;
      expect(verifyEvergreenStatus).to.have.been.called;
      expect(spawnSync).to.have.been.calledTwice;
      expect(spawnSync.getCall(0)).calledWith(
        'git',
        ['tag', 'v0.8.0', 'hash'],
        sinon.match.any
      );
      expect(spawnSync.getCall(1)).calledWith(
        'git',
        ['push', 'origin', 'v0.8.0'],
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
      await verifyEvergreenStatusFn(exampleTag, evergreenProvider);
      expect(getTasks).to.have.been.calledWith(
        'mongosh',
        'sha',
        'v0.8.2-draft.5'
      );
    });

    it('fails if evergreen fails', async function () {
      const expectedError = new Error('failed');
      getTasks.rejects(expectedError);
      try {
        await verifyEvergreenStatusFn(exampleTag, evergreenProvider);
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
        await verifyEvergreenStatusFn(exampleTag, evergreenProvider, confirm);
      } catch (e: any) {
        expect(e.message).to.contain(
          'Some Evergreen tasks were not successful'
        );
        expect(getTasks).to.have.been.calledWith(
          'mongosh',
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
      await verifyEvergreenStatusFn(exampleTag, evergreenProvider, confirm);
      expect(confirm).to.have.been.called;
    });
  });
});
