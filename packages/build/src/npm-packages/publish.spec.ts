import { expect } from 'chai';
import path from 'path';
import type { SinonStub } from 'sinon';
import sinon from 'sinon';
import { publishToNpm } from './publish';

describe('npm-packages publishToNpm', function () {
  let listNpmPackages: SinonStub;
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
    spawnSync = sinon.stub();
  });

  it('calls lerna to publish packages for a real version', function () {
    const packages = [
      { name: 'packageA', version: '0.7.0' },
      { name: 'mongosh', version: '1.2.0' },
    ];
    listNpmPackages.returns(packages);

    publishToNpm({ isDryRun: false }, listNpmPackages);

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
  });
});
