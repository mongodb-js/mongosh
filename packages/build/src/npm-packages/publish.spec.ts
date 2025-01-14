import { expect } from 'chai';
import path from 'path';
import type { SinonStub } from 'sinon';
import sinon from 'sinon';
import { publishToNpm, setReleasePublisher } from './publish';
import { promises as fs } from 'fs';
import type { PackageInfo } from '@mongodb-js/monorepo-tools';

describe('npm-packages publishToNpm', function () {
  let getPackagesInTopologicalOrder: SinonStub;
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
  const packages = [
    { name: 'packageA', version: '0.7.0', location: '/packages/packageA' },
    { name: 'mongosh', version: '1.2.0', location: '/packages/mongosh' },
  ];

  beforeEach(function () {
    getPackagesInTopologicalOrder = sinon.stub();
    markBumpedFilesAsAssumeUnchanged = sinon.stub();
    spawnSync = sinon.stub();
    process.env.MONGOSH_RELEASE_PUBLISHER = 'test-publisher';
  });

  it('throws if mongosh is not existent when publishing all', async function () {
    const packages = [{ name: 'packageA', version: '0.7.0' }];
    getPackagesInTopologicalOrder.resolves(packages);
    try {
      await publishToNpm(
        { isDryRun: false, useAuxiliaryPackagesOnly: false },
        getPackagesInTopologicalOrder,
        markBumpedFilesAsAssumeUnchanged,
        spawnSync
      );
      expect.fail('should throw');
    } catch (error) {
      expect((error as Error).message).equals('mongosh package not found');
    }
  });

  it('throws if publisher is not set when publishing all', async function () {
    getPackagesInTopologicalOrder.resolves(packages);

    try {
      await publishToNpm(
        { isDryRun: false, useAuxiliaryPackagesOnly: false },
        getPackagesInTopologicalOrder,
        markBumpedFilesAsAssumeUnchanged,
        spawnSync
      );
      expect.fail('should throw');
    } catch (error) {
      expect((error as Error).message).equals(
        'MONGOSH_RELEASE_PUBLISHER is required for publishing mongosh'
      );
    }
  });

  it('takes mongosh version and pushes tags', async function () {
    getPackagesInTopologicalOrder.resolves(packages);

    await publishToNpm(
      { isDryRun: false, useAuxiliaryPackagesOnly: false },
      getPackagesInTopologicalOrder,
      markBumpedFilesAsAssumeUnchanged,
      spawnSync
    );

    expect(spawnSync).calledWith('git', ['tag', '-a', '1.2.0', '-m', '1.2.0']);
    expect(spawnSync).calledWith('git', ['push', '--follow-tags']);
  });

  it('does not manually push tags with auxiliary packages', async function () {
    getPackagesInTopologicalOrder.resolves(packages);

    await publishToNpm(
      { isDryRun: false, useAuxiliaryPackagesOnly: true },
      getPackagesInTopologicalOrder,
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

  it('calls lerna to publish packages for a real version', async function () {
    getPackagesInTopologicalOrder.resolves(packages);

    await publishToNpm(
      { isDryRun: false, useAuxiliaryPackagesOnly: false },
      getPackagesInTopologicalOrder,
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

  it('reverts the assume unchanged even on spawn failure', async function () {
    getPackagesInTopologicalOrder.resolves(packages);
    spawnSync.throws(new Error('meeep'));

    try {
      await publishToNpm(
        { isDryRun: false, useAuxiliaryPackagesOnly: false },
        getPackagesInTopologicalOrder,
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

  describe('setReleasePublisher', function () {
    let writeFileStub: sinon.SinonStub;
    let readFileStub: sinon.SinonStub;

    const packages = [
      { name: 'package1', version: '1.0.0', location: 'packages/package1' },
      { name: 'package2', version: '2.0.0', location: 'packages/package2' },
    ];

    beforeEach(function () {
      writeFileStub = sinon.stub(fs, 'writeFile').resolves();

      readFileStub = sinon.stub(fs, 'readFile');
      readFileStub.throws();
      readFileStub.withArgs('packages/package1/package.json', 'utf8').resolves(
        JSON.stringify({
          name: packages[0].name,
          version: packages[0].version,
        })
      );
      readFileStub.withArgs('packages/package2/package.json', 'utf8').resolves(
        JSON.stringify({
          name: packages[1].name,
          version: packages[1].version,
        })
      );
    });

    afterEach(function () {
      sinon.restore();
    });

    it('should set the releasePublisher for each package and write the updated package.json', async function () {
      const publisher = 'test-publisher';
      await setReleasePublisher(publisher, packages as PackageInfo[]);

      expect(writeFileStub.calledTwice).to.be.true;

      expect(writeFileStub.firstCall.args[0]).to.equal(
        'packages/package1/package.json'
      );
      expect(JSON.parse(writeFileStub.firstCall.args[1])).to.deep.equal({
        name: 'package1',
        version: '1.0.0',
        releasePublisher: 'test-publisher',
      });

      expect(writeFileStub.secondCall.args[0]).to.equal(
        'packages/package2/package.json'
      );
      expect(JSON.parse(writeFileStub.secondCall.args[1])).to.deep.equal({
        name: 'package2',
        version: '2.0.0',
        releasePublisher: 'test-publisher',
      });
    });
  });
});
