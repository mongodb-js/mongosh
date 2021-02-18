import { expect } from 'chai';
import sinon from 'sinon';
import { EvergreenApi, EvergreenTask } from '../evergreen';
import { TaggedCommit } from './get-latest-tag';
import { triggerReleasePublish, verifyEvergreenStatusFn } from './trigger-release-publish';

describe('local trigger-release-publish', () => {
  describe('triggerReleasePublish', () => {
    let verifyGitStatus: sinon.SinonStub;
    let getLatestDraftOrReleaseTagFromLog:sinon.SinonStub;
    let confirm: sinon.SinonStub;
    let verifyEvergreenStatus: sinon.SinonStub;
    let spawnSync: sinon.SinonStub;

    beforeEach(() => {
      verifyGitStatus = sinon.stub();
      getLatestDraftOrReleaseTagFromLog = sinon.stub();
      confirm = sinon.stub();
      verifyEvergreenStatus = sinon.stub();
      spawnSync = sinon.stub();
    });

    it('creates a new release tag and pushes when everything is good', async() => {
      const latestTag: TaggedCommit = {
        commit: 'hash',
        tag: {
          draftVersion: 7,
          releaseVersion: '0.8.0',
          semverName: '0.8.0-draft.7'
        }
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
      expect(spawnSync.getCall(0)).calledWith('git', ['tag', 'v0.8.0', 'hash'], sinon.match.any);
      expect(spawnSync.getCall(1)).calledWith('git', ['push', '--tags'], sinon.match.any);
    });

    it('fails if no previous tag is found', async() => {
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
      } catch (e) {
        expect(e.message).to.contain('Failed to find a prior tag to release from');
        expect(verifyGitStatus).to.have.been.called;
        expect(confirm).to.not.have.been.called;
        expect(verifyEvergreenStatus).to.not.have.been.called;
        expect(spawnSync).to.not.have.been.called;
        return;
      }
      expect.fail('Expected error');
    });

    it('fails if the previous tag is not a draft', async() => {
      const latestTag: TaggedCommit = {
        commit: 'hash',
        tag: {
          draftVersion: undefined,
          releaseVersion: '0.8.0',
          semverName: '0.8.0'
        }
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
      } catch (e) {
        expect(e.message).to.contain('but it\'s not a draft');
        expect(verifyGitStatus).to.have.been.called;
        expect(confirm).to.not.have.been.called;
        expect(verifyEvergreenStatus).to.not.have.been.called;
        expect(spawnSync).to.not.have.been.called;
        return;
      }
      expect.fail('Expected error');
    });

    it('fails if evergreen check fails', async() => {
      const latestTag: TaggedCommit = {
        commit: 'hash',
        tag: {
          draftVersion: 7,
          releaseVersion: '0.8.0',
          semverName: '0.8.0-draft.7'
        }
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
      } catch (e) {
        expect(e).to.equal(expectedError);
        expect(verifyGitStatus).to.have.been.called;
        expect(confirm).to.have.been.called;
        expect(spawnSync).to.not.have.been.called;
        return;
      }
      expect.fail('Expected error');
    });

    it('aborts if user does not confirm', async() => {
      const latestTag: TaggedCommit = {
        commit: 'hash',
        tag: {
          draftVersion: 7,
          releaseVersion: '0.8.0',
          semverName: '0.8.0-draft.7'
        }
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
      } catch (e) {
        expect(e.message).to.contain('User aborted');
        expect(verifyGitStatus).to.have.been.called;
        expect(confirm).to.have.been.called;
        expect(spawnSync).to.not.have.been.called;
        return;
      }
      expect.fail('Expected error');
    });
  });

  describe('verifyEvergreenStatus', () => {
    let evergreenProvider: Promise<EvergreenApi>;
    let getTasks: sinon.SinonStub;

    const failedTask: EvergreenTask = {
      task_id: 'task1',
      version_id: 'v1',
      build_variant: 'windows',
      display_name: 'Task 1',
      status: 'failed'
    };
    const successTask: EvergreenTask = {
      task_id: 'task2',
      version_id: 'v2',
      build_variant: 'windows',
      display_name: 'Task 2',
      status: 'success'
    };

    beforeEach(() => {
      getTasks = sinon.stub();
      evergreenProvider = Promise.resolve({
        getTasks
      } as unknown as EvergreenApi);
    });

    it('works if all tasks are successful', async() => {
      getTasks.resolves([successTask]);
      await verifyEvergreenStatusFn('sha', evergreenProvider);
      expect(getTasks).to.have.been.calledWith('mongosh', 'sha');
    });

    it('fails if evergreen fails', async() => {
      const expectedError = new Error('failed');
      getTasks.rejects(expectedError);
      try {
        await verifyEvergreenStatusFn('sha', evergreenProvider);
      } catch (e) {
        expect(e).to.equal(expectedError);
        return;
      }
      expect.fail('Expected error');
    });

    it('fails if there are failed tasks', async() => {
      getTasks.resolves([successTask, failedTask]);
      try {
        await verifyEvergreenStatusFn('sha', evergreenProvider);
      } catch (e) {
        expect(e.message).to.contain('Some Evergreen tasks were not successful');
        expect(getTasks).to.have.been.calledWith('mongosh', 'sha');
        return;
      }
      expect.fail('Expected error');
    });
  });
});
