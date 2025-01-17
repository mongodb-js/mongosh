import { expect } from 'chai';
import path from 'path';
import type { SinonStub } from 'sinon';
import sinon from 'sinon';
import fs from 'fs/promises';
import type { NpmPublisherConfig } from './npm-publisher';
import { NpmPublisher } from './npm-publisher';
import type { PackageInfo } from '@mongodb-js/monorepo-tools';

describe('npm-packages NpmPublisher', function () {
  let testPublisher: NpmPublisher;
  let getPackagesInTopologicalOrderStub: SinonStub;
  let markBumpedFilesAsAssumeUnchangedStub: SinonStub;
  let spawnSync: SinonStub;
  let writeFileStub: sinon.SinonStub;
  let readFileStub: sinon.SinonStub;
  let setPublisherStub: sinon.SinonStub;

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
  const packages: PackageInfo[] = [
    {
      name: 'packageA',
      version: '0.7.0',
      location: 'packages/package1',
    } as PackageInfo,
    {
      name: 'mongosh',
      version: '1.2.0',
      location: 'packages/mongosh',
    } as PackageInfo,
  ];

  function setupTestPublisher(
    config: NpmPublisherConfig,
    { stubPublisher = true } = {}
  ) {
    testPublisher = new NpmPublisher(config);

    getPackagesInTopologicalOrderStub = sinon.stub(
      testPublisher,
      'getPackagesInTopologicalOrder'
    );
    getPackagesInTopologicalOrderStub.resolves([]);
    markBumpedFilesAsAssumeUnchangedStub = sinon
      .stub(testPublisher, 'markBumpedFilesAsAssumeUnchanged')
      .resolves();
    spawnSync = sinon.stub(testPublisher, 'spawnSync').resolves();

    if (stubPublisher) {
      setPublisherStub = sinon
        .stub(testPublisher, 'setReleasePublisher')
        .resolves();
    }

    for (const packageInfo of packages) {
      readFileStub
        .withArgs(path.join(packageInfo.location, 'package.json'), 'utf8')
        .resolves(
          JSON.stringify({
            name: packageInfo.name,
            version: packageInfo.version,
          })
        );
    }
  }

  beforeEach(function () {
    writeFileStub = sinon.stub(fs, 'writeFile');
    writeFileStub.resolves();

    readFileStub = sinon.stub(fs, 'readFile');
    readFileStub.throws('Unset path read from stub');
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('publish', function () {
    describe('when releasing mongosh', function () {
      beforeEach(function () {
        setupTestPublisher({
          isDryRun: false,
          useAuxiliaryPackagesOnly: false,
          publisher: 'test-publisher',
        });
      });

      afterEach(function () {
        sinon.restore();
      });

      it('throws if mongosh package is not found ', async function () {
        const packages = [{ name: 'packageA', version: '0.7.0' }];
        getPackagesInTopologicalOrderStub.resolves(packages);

        try {
          await testPublisher.publish();
          expect.fail('should throw');
        } catch (error) {
          expect((error as Error).message).equals('mongosh package not found');
        }
      });

      it('throws if publisher is not set', function () {
        getPackagesInTopologicalOrderStub.resolves(packages);
        try {
          new NpmPublisher({
            useAuxiliaryPackagesOnly: false,
            publisher: '',
            isDryRun: false,
          });
          expect.fail('should throw');
        } catch (error) {
          expect((error as Error).message).equals(
            'Publisher is required for publishing mongosh'
          );
        }
      });

      it('calls setReleasePublisher when it is set', async function () {
        getPackagesInTopologicalOrderStub.resolves(packages);
        await testPublisher.publish();
        expect(setPublisherStub).calledOnceWith(testPublisher.config.publisher);
      });

      it('takes mongosh version and pushes tags', async function () {
        getPackagesInTopologicalOrderStub.resolves(packages);

        await testPublisher.publish();

        expect(spawnSync).calledWith('git', [
          'tag',
          '-a',
          'v1.2.0',
          '-m',
          'v1.2.0',
        ]);
        expect(spawnSync).calledWith('git', ['push', '--follow-tags']);
      });

      it('calls lerna to publish packages', async function () {
        getPackagesInTopologicalOrderStub.resolves(packages);

        await testPublisher.publish();

        expect(markBumpedFilesAsAssumeUnchangedStub).to.have.been.calledWith(
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
        expect(markBumpedFilesAsAssumeUnchangedStub).to.have.been.calledWith(
          packages,
          false
        );
      });

      it('reverts the assume unchanged even on spawn failure', async function () {
        getPackagesInTopologicalOrderStub.resolves(packages);
        spawnSync.throws(new Error('meeep'));

        try {
          await testPublisher.publish();
        } catch (e: any) {
          expect(markBumpedFilesAsAssumeUnchangedStub).to.have.been.calledWith(
            packages,
            true
          );
          expect(spawnSync).to.have.been.called;
          expect(markBumpedFilesAsAssumeUnchangedStub).to.have.been.calledWith(
            packages,
            false
          );
          return;
        }
        expect.fail('Expected error');
      });
    });

    describe('when releasing auxiliary packages', function () {
      beforeEach(function () {
        setupTestPublisher({
          isDryRun: false,
          useAuxiliaryPackagesOnly: true,
          publisher: 'test-publisher',
        });
      });

      it('does not manually push tags with auxiliary packages', async function () {
        getPackagesInTopologicalOrderStub.resolves(packages);

        await testPublisher.publish();

        expect(spawnSync).not.calledWith('git', [
          'tag',
          '-a',
          '1.2.0',
          '-m',
          '1.2.0',
        ]);
        expect(spawnSync).not.calledWith('git', ['push', '--follow-tags']);
      });
    });
  });

  describe('markBumpedFilesAsAssumeUnchanged', function () {
    let expectedFiles: string[];
    let spawnSync: SinonStub;

    beforeEach(function () {
      expectedFiles = [
        path.resolve(__dirname, '..', '..', '..', '..', 'lerna.json'),
        path.resolve(__dirname, '..', '..', '..', '..', 'package.json'),
        path.resolve(__dirname, '..', '..', '..', '..', 'package-lock.json'),
      ];
      for (const { location } of packages) {
        expectedFiles.push(path.resolve(location, 'package.json'));
      }

      spawnSync = sinon.stub();
    });

    it('marks files with --assume-unchanged', function () {
      testPublisher.markBumpedFilesAsAssumeUnchanged(packages, true, spawnSync);
      expectedFiles.forEach((f) => {
        expect(spawnSync).to.have.been.calledWith(
          'git',
          ['update-index', '--assume-unchanged', f],
          sinon.match.any
        );
      });
    });

    it('marks files with --no-assume-unchanged', function () {
      testPublisher.markBumpedFilesAsAssumeUnchanged(
        packages,
        false,
        spawnSync
      );
      expectedFiles.forEach((f) => {
        expect(spawnSync).to.have.been.calledWith(
          'git',
          ['update-index', '--no-assume-unchanged', f],
          sinon.match.any
        );
      });
    });
  });

  describe('setReleasePublisher', function () {
    const publisherName = 'test-publisher-name';
    beforeEach(function () {
      setupTestPublisher(
        {
          isDryRun: false,
          useAuxiliaryPackagesOnly: false,
          publisher: 'test-publisher',
        },
        { stubPublisher: false }
      );
    });

    afterEach(function () {
      sinon.restore();
    });

    it('should set the releasePublisher for each package and write the updated package.json', async function () {
      getPackagesInTopologicalOrderStub.resolves(packages);
      await testPublisher.setReleasePublisher(publisherName, packages);

      expect(readFileStub).has.callCount(packages.length);
      expect(writeFileStub).has.callCount(packages.length);

      expect(writeFileStub.firstCall.args[0]).to.equal(
        path.join(packages[0].location, 'package.json')
      );
      expect(
        JSON.parse(writeFileStub.firstCall.args[1] as string)
      ).to.deep.equal({
        name: 'packageA',
        version: '0.7.0',
        releasePublisher: publisherName,
      });

      expect(writeFileStub.secondCall.args[0]).to.equal(
        path.join(packages[1].location, 'package.json')
      );
      expect(
        JSON.parse(writeFileStub.secondCall.args[1] as string)
      ).to.deep.equal({
        name: 'mongosh',
        version: '1.2.0',
        releasePublisher: publisherName,
      });
    });
  });
});
