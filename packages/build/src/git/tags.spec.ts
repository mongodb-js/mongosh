import { expect } from 'chai';
import sinon from 'sinon';
import { getLatestDraftOrReleaseTagFromLog } from './tags';

describe('git tags', () => {
  let spawnSync: sinon.SinonStub;

  beforeEach(() => {
    spawnSync = sinon.stub();
  });

  describe('getLatestDraftOrReleaseTagFromLog', () => {
    [
      {
        restriction: undefined,
        expected: {
          semverName: '0.8.1',
          releaseVersion: '0.8.1',
          draftVersion: undefined
        }
      },
      {
        restriction: { major: 0, minor: 8, patch: 0 },
        expected: {
          semverName: '0.8.0',
          releaseVersion: '0.8.0',
          draftVersion: undefined
        }
      },
      {
        restriction: { major: 0, minor: 8, patch: undefined },
        expected: {
          semverName: '0.8.1',
          releaseVersion: '0.8.1',
          draftVersion: undefined
        }
      }
    ].forEach(({ restriction, expected }) => {
      it(`extracts the latest tag when restricted to ${JSON.stringify(restriction)}`, () => {
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
          restriction,
          spawnSync
        );
        expect(result).to.deep.equal({
          commit: 'tagHash',
          tag: expected
        });
      });
    });
  });
});
