import { expect } from 'chai';
import path from 'path';
import sinon, { SinonStub } from 'sinon';
import { publishNpmPackages } from './publish';

describe('npm-packages publishNpmPackages', () => {
  let listNpmPackages: SinonStub;
  let markBumpedFilesAsAssumeUnchanged: SinonStub;
  let spawnSync: SinonStub;

  beforeEach(() => {
    listNpmPackages = sinon.stub();
    markBumpedFilesAsAssumeUnchanged = sinon.stub();
    spawnSync = sinon.stub();
  });

  it('fails if packages have different versions', () => {
    listNpmPackages.returns([
      { name: 'packageA', version: '0.0.1' },
      { name: 'packageB', version: '0.0.2' }
    ]);
    try {
      publishNpmPackages(
        false,
        listNpmPackages,
        markBumpedFilesAsAssumeUnchanged,
        spawnSync
      );
    } catch (e: any) {
      expect(markBumpedFilesAsAssumeUnchanged).to.not.have.been.called;
      expect(spawnSync).to.not.have.been.called;
      return;
    }
    expect.fail('Expected error');
  });

  it('fails if packages have placeholder versions', () => {
    listNpmPackages.returns([
      { name: 'packageA', version: '0.0.0-dev.0' },
      { name: 'packageB', version: '0.0.0-dev.0' }
    ]);
    try {
      publishNpmPackages(
        false,
        listNpmPackages,
        markBumpedFilesAsAssumeUnchanged,
        spawnSync
      );
    } catch (e: any) {
      expect(markBumpedFilesAsAssumeUnchanged).to.not.have.been.called;
      expect(spawnSync).to.not.have.been.called;
      return;
    }
    expect.fail('Expected error');
  });

  it('calls lerna to publish packages for a real version', () => {
    const lernaBin = path.resolve(__dirname, '..', '..', '..', '..', 'node_modules', '.bin', 'lerna');
    const packages = [
      { name: 'packageA', version: '0.7.0' }
    ];
    listNpmPackages.returns(packages);

    publishNpmPackages(
      false,
      listNpmPackages,
      markBumpedFilesAsAssumeUnchanged,
      spawnSync
    );

    expect(markBumpedFilesAsAssumeUnchanged).to.have.been.calledWith(packages, true);
    expect(spawnSync).to.have.been.calledWith(
      lernaBin,
      ['publish', 'from-package', '--no-changelog', '--no-push', '--exact', '--no-git-tag-version', '--force-publish', '--yes', '--no-verify-access'],
      sinon.match.any
    );
    expect(markBumpedFilesAsAssumeUnchanged).to.have.been.calledWith(packages, false);
  });

  it('reverts the assume unchanged even on spawn failure', () => {
    const packages = [
      { name: 'packageA', version: '0.7.0' }
    ];
    listNpmPackages.returns(packages);
    spawnSync.throws(new Error('meeep'));

    try {
      publishNpmPackages(
        false,
        listNpmPackages,
        markBumpedFilesAsAssumeUnchanged,
        spawnSync
      );
    } catch (e: any) {
      expect(markBumpedFilesAsAssumeUnchanged).to.have.been.calledWith(packages, true);
      expect(spawnSync).to.have.been.called;
      expect(markBumpedFilesAsAssumeUnchanged).to.have.been.calledWith(packages, false);
      return;
    }
    expect.fail('Expected error');
  });
});
