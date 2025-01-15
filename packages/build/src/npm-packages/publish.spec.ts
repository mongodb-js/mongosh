import { expect } from 'chai';
import path from 'path';
import type { SinonStub } from 'sinon';
import sinon from 'sinon';
import { publishToNpm } from './publish';

describe('npm-packages publishToNpm', function () {
  let listNpmPackages: SinonStub;
  let markBumpedFilesAsAssumeUnchanged: SinonStub;
  let spawnSync: SinonStub;
  const lernaBin = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    'node_modules',
    '.bin',
    'lerna'
  );

  beforeEach(function () {
    listNpmPackages = sinon.stub();
    markBumpedFilesAsAssumeUnchanged = sinon.stub();
    spawnSync = sinon.stub();
  });

  it('throws if mongosh is not existent when publishing all', function () {
    const packages = [{ name: 'packageA', version: '0.7.0' }];
    listNpmPackages.returns(packages);

    expect(() =>
      publishToNpm(
        { isDryRun: false, useAuxiliaryPackagesOnly: false },
        listNpmPackages,
        markBumpedFilesAsAssumeUnchanged,
        spawnSync
      )
    ).throws('mongosh package not found');
  });

  it('takes mongosh version and pushes tags', function () {
    const packages = [
      { name: 'packageA', version: '0.7.0' },
      { name: 'mongosh', version: '1.2.0' },
    ];
    listNpmPackages.returns(packages);

    publishToNpm(
      { isDryRun: false, useAuxiliaryPackagesOnly: false },
      listNpmPackages,
      markBumpedFilesAsAssumeUnchanged,
      spawnSync
    );

    expect(spawnSync).calledWith('git', ['tag', '-a', '1.2.0', '-m', '1.2.0']);
    expect(spawnSync).calledWith('git', ['push', '--follow-tags']);
  });

  it('does not manually push tags with auxiliary packages', function () {
    const packages = [
      { name: 'packageA', version: '0.7.0' },
      { name: 'mongosh', version: '1.2.0' },
    ];
    listNpmPackages.returns(packages);

    publishToNpm(
      { isDryRun: false, useAuxiliaryPackagesOnly: true },
      listNpmPackages,
      markBumpedFilesAsAssumeUnchanged,
      spawnSync
    );

    expect(spawnSync).not.calledWith('git', [
      'tag',
      '-a',
      '1.2.0',
      '-m',
      '1.2.0',
    ]);
    expect(spawnSync).not.calledWith('git', ['push', '--follow-tags']);
  });

  it('calls lerna to publish packages for a real version', function () {
    const packages = [
      { name: 'packageA', version: '0.7.0' },
      { name: 'mongosh', version: '1.2.0' },
    ];
    listNpmPackages.returns(packages);

    publishToNpm(
      { isDryRun: false, useAuxiliaryPackagesOnly: false },
      listNpmPackages,
      markBumpedFilesAsAssumeUnchanged,
      spawnSync
    );

    expect(markBumpedFilesAsAssumeUnchanged).to.have.been.calledWith(
      packages,
      true
    );
    expect(spawnSync).to.have.been.calledWith(
      lernaBin,
      [
        'publish',
        'from-package',
        '--no-private',
        '--no-changelog',
        '--exact',
        '--yes',
        '--no-verify-access',
      ],
      sinon.match.any
    );
    expect(markBumpedFilesAsAssumeUnchanged).to.have.been.calledWith(
      packages,
      false
    );
  });

  it('reverts the assume unchanged even on spawn failure', function () {
    const packages = [{ name: 'packageA', version: '0.7.0' }];
    listNpmPackages.returns(packages);
    spawnSync.throws(new Error('meeep'));

    try {
      publishToNpm(
        { isDryRun: false, useAuxiliaryPackagesOnly: false },
        listNpmPackages,
        markBumpedFilesAsAssumeUnchanged,
        spawnSync
      );
    } catch (e: any) {
      expect(markBumpedFilesAsAssumeUnchanged).to.have.been.calledWith(
        packages,
        true
      );
      expect(spawnSync).to.have.been.called;
      expect(markBumpedFilesAsAssumeUnchanged).to.have.been.calledWith(
        packages,
        false
      );
      return;
    }
    expect.fail('Expected error');
  });
});
