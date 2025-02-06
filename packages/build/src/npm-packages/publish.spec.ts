import { expect } from 'chai';
import path from 'path';
import type { SinonStub } from 'sinon';
import sinon from 'sinon';
import { publishToNpm } from './publish';

describe('npm-packages publishToNpm', function () {
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
    spawnSync = sinon.stub();
  });

  it('calls lerna to publish packages for a real version', function () {
    publishToNpm({ isDryRun: false }, spawnSync);

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
