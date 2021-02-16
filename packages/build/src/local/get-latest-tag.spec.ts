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
      spawnSync.returns({
        stdout: [
          '95a23557 (tag: v0.7.0-testrelease2, tag: v0.7.0-draft.7, master, origin/master) chore(build): always bump package version number MONGOSH-505 (#579)',
          '9e508cbc (tag: v0.7.0-testrelease1, tag: v0.7.0-draft.6) chore(build): use cross-spawn for lerna MONGOSH-505 (#576)',
          'a83b40fd (tag: v0.7.0-draft.8) feat(build): exclude mongocryptd from packaging (#591)', // this probably does not happen in practice - but let's be sure
          'f5a37b21 (tag: v0.7.0-draft.5) chore(build): ensure git 2.24 is installed in centos MONGOSH-505 (#575)',
          'ca53790a (tag: v0.7.0-draft.4) add debugging for failures',
          'f11fe50a (tag: v0.7.0-draft.3) chore(shell-api): throw error if FLE is not available MONGOSH-514 (#573)',
          'd586985e (tag: v0.7.0-testrelease, tag: v0.7.0-draft.2) chore(build): setup triggering releases with tags MONGOSH-505 (#571)',
          '040d0b2b (tag: v0.7.0-draft.1) Restructure evergreen config MONGOSH-505 (#567)',
          'b8db879f (tag: v0.6.1) v0.6.1',
        ].join('\n')
      });

      const result = getLatestDraftOrReleaseTagFromLog(
        'somePath',
        spawnSync
      );
      expect(result).to.deep.equal({
        commit: 'a83b40fd',
        tag: {
          semverName: '0.7.0-draft.8',
          releaseVersion: '0.7.0',
          draftVersion: 8
        }
      });
    });

    it('extracts the latest release tag', () => {
      spawnSync.returns({
        stdout: [
          'e96f0fd7 (tag: v0.7.0) fix(build): ignore .npmrc MONGOSH-521 (#602)',
          'a83b40fd (tag: v0.7.0-draft.8) feat(build): exclude mongocryptd from packaging (#591)',
          '95a23557 (tag: v0.7.0-testrelease2, tag: v0.7.0-draft.7) chore(build): always bump package version number MONGOSH-505 (#579)',
          '9e508cbc (tag: v0.7.0-testrelease1, tag: v0.7.0-draft.6) chore(build): use cross-spawn for lerna MONGOSH-505 (#576)',
          'f5a37b21 (tag: v0.7.0-draft.5) chore(build): ensure git 2.24 is installed in centos MONGOSH-505 (#575)',
          'ca53790a (tag: v0.7.0-draft.4) add debugging for failures',
          'f11fe50a (tag: v0.7.0-draft.3) chore(shell-api): throw error if FLE is not available MONGOSH-514 (#573)',
          'd586985e (tag: v0.7.0-testrelease, tag: v0.7.0-draft.2) chore(build): setup triggering releases with tags MONGOSH-505 (#571)',
          '040d0b2b (tag: v0.7.0-draft.1) Restructure evergreen config MONGOSH-505 (#567)',
          'b8db879f (tag: v0.6.1) v0.6.1',
        ].join('\n')
      });

      const result = getLatestDraftOrReleaseTagFromLog(
        'somePath',
        spawnSync
      );
      expect(result).to.deep.equal({
        commit: 'e96f0fd7',
        tag: {
          semverName: '0.7.0',
          releaseVersion: '0.7.0',
          draftVersion: undefined
        }
      });
    });
  });
});
