import { expect } from 'chai';
import sinon from 'sinon';
import { getLatestDraftOrReleaseTagFromLog } from './get-latest-tag';

describe('local get-latest-tag', () => {
  let spawnSync: sinon.SinonStub;

  beforeEach(() => {
    spawnSync = sinon.stub();
  });

  describe('getLatestDraftOrReleaseTagFromLog', () => {
    it('extracts the latest draft tag', () => {
      spawnSync.onFirstCall().returns({
        stdout: [
          'v0.7.9',
          'v0.8.0-draft.0',
          'v0.8.0-draft.1',
          'v0.8.0-draft.10',
          'v0.8.0-draft.2'
        ].join('\n')
      });
      spawnSync.onSecondCall().returns({
        stdout: 'tagHash'
      });

      const result = getLatestDraftOrReleaseTagFromLog(
        'somePath',
        spawnSync
      );
      expect(result).to.deep.equal({
        commit: 'tagHash',
        tag: {
          semverName: '0.8.0-draft.10',
          releaseVersion: '0.8.0',
          draftVersion: 10
        }
      });
    });

    it('extracts the latest release tag', () => {
      spawnSync.onFirstCall().returns({
        stdout: [
          'v0.8.0',
          'v0.8.0-draft.0',
          'v0.8.0-draft.1',
          'v0.8.0-draft.10',
          'v0.8.1',
          'v0.8.0-draft.2',
          'v0.8.1-draft.0',
        ].join('\n')
      });
      spawnSync.onSecondCall().returns({
        stdout: 'tagHash'
      });

      const result = getLatestDraftOrReleaseTagFromLog(
        'somePath',
        spawnSync
      );
      expect(result).to.deep.equal({
        commit: 'tagHash',
        tag: {
          semverName: '0.8.1',
          releaseVersion: '0.8.1',
          draftVersion: undefined
        }
      });
    });
  });
});
