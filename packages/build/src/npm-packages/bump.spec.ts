import { expect } from 'chai';
import path from 'path';
import type { SinonStub } from 'sinon';
import sinon from 'sinon';
import { bumpNpmPackages } from './bump';

describe('npm-packages bumpNpmPackages', function () {
  let spawnSync: SinonStub;

  beforeEach(function () {
    spawnSync = sinon.stub();
  });

  it('does not do anything if no version or placeholder version is specified', function () {
    bumpNpmPackages('', spawnSync);
    bumpNpmPackages('0.0.0-dev.0', spawnSync);
    expect(spawnSync).to.not.have.been.called;
  });

  it('calls lerna to bump package version', function () {
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
    bumpNpmPackages('0.7.0', spawnSync);
    expect(spawnSync).to.have.been.calledWith(
      lernaBin,
      [
        'version',
        '0.7.0',
        '--no-changelog',
        '--no-push',
        '--exact',
        '--no-git-tag-version',
        '--force-publish',
        '--yes',
      ],
      sinon.match.any
    );
    expect(spawnSync).to.have.been.calledWith(
      'git',
      ['status', '--porcelain'],
      sinon.match.any
    );
  });
});
