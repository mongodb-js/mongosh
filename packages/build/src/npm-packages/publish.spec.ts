import { expect } from 'chai';
import path from 'path';
import type { SinonStub } from 'sinon';
import sinon from 'sinon';
import { PackagePublisher } from './publish';
import { MONGOSH_RELEASE_PACKAGES } from './constants';
import type { PackagePublisherConfig } from './types';

describe('PackagePublisher', function () {
  let spawnSync: SinonStub;
  let listNpmPackages: SinonStub;
  let existsTag: SinonStub;
  let testPublisher: PackagePublisher;

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

  const mongoshVersion = '1.2.0';
  const allReleasablePackages = [
    { name: 'packageA', version: '0.7.0' },
    { name: 'packageB', version: '1.7.0' },
    { name: 'packageC', version: '1.3.0' },
    { name: 'mongosh', version: mongoshVersion },
    { name: '@mongosh/cli-repl', version: mongoshVersion },
  ];
  const auxiliaryPackages = allReleasablePackages.filter(
    (p) => !MONGOSH_RELEASE_PACKAGES.includes(p.name)
  );
  const mongoshReleasePackages = allReleasablePackages.filter((p) =>
    MONGOSH_RELEASE_PACKAGES.includes(p.name)
  );

  function setupTestPublisher(config: PackagePublisherConfig) {
    spawnSync = sinon.stub();

    testPublisher = new PackagePublisher(config, { spawnSync });

    spawnSync.returns(undefined);

    listNpmPackages = sinon.stub(testPublisher, 'listNpmPackages');
    listNpmPackages.returns(allReleasablePackages);

    existsTag = sinon.stub(testPublisher, 'existsTag');
    existsTag.returns(false);
  }

  describe('publish()', function () {
    beforeEach(function () {
      setupTestPublisher({ isDryRun: false, useAuxiliaryPackagesOnly: false });
    });

    it('calls lerna to publish packages for a real version', function () {
      testPublisher.publishToNpm();

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

  describe('pushTags()', function () {
    describe('with specific configurations', function () {
      it('skips tag push if it is a dry run', function () {
        setupTestPublisher({
          isDryRun: true,
          useAuxiliaryPackagesOnly: false,
        });

        existsTag.withArgs(`v${mongoshVersion}`).returns(true);

        testPublisher.pushTags();

        expect(spawnSync).not.calledWith('git', [
          'tag',
          '-a',
          `v${mongoshVersion}`,
          '-m',
          `v${mongoshVersion}`,
        ]);

        expect(spawnSync).not.calledWith('git', ['push', '--tags']);
      });
    });

    afterEach(function () {
      sinon.restore();
    });

    it('throws if mongosh is not existent when publishing all', function () {
      setupTestPublisher({ isDryRun: false, useAuxiliaryPackagesOnly: false });

      const packages = [{ name: 'packageA', version: '0.7.0' }];
      listNpmPackages.returns(packages);

      expect(() => testPublisher.pushTags()).throws(
        'mongosh package not found'
      );
    });

    it('takes mongosh version and pushes tags when releasing', function () {
      setupTestPublisher({ isDryRun: false, useAuxiliaryPackagesOnly: false });

      testPublisher.pushTags();

      for (const packageInfo of allReleasablePackages) {
        expect(spawnSync).calledWith('git', [
          'tag',
          '-a',
          `${packageInfo.name}@${packageInfo.version}`,
          '-m',
          `${packageInfo.name}@${packageInfo.version}`,
        ]);
      }

      expect(spawnSync).calledWith('git', [
        'tag',
        '-a',
        `v${mongoshVersion}`,
        '-m',
        `v${mongoshVersion}`,
      ]);
      expect(spawnSync).calledWith('git', ['push', '--tags']);
    });

    it('pushes only package tags when using auxiliary packages', function () {
      setupTestPublisher({ isDryRun: false, useAuxiliaryPackagesOnly: true });

      testPublisher.pushTags();

      for (const packageInfo of auxiliaryPackages) {
        expect(spawnSync).calledWith('git', [
          'tag',
          '-a',
          `${packageInfo.name}@${packageInfo.version}`,
          '-m',
          `${packageInfo.name}@${packageInfo.version}`,
        ]);
      }

      for (const packageInfo of mongoshReleasePackages) {
        expect(spawnSync).not.calledWith('git', [
          'tag',
          '-a',
          `${packageInfo.name}@${packageInfo.version}`,
          '-m',
          `${packageInfo.name}@${packageInfo.version}`,
        ]);
      }

      expect(spawnSync).not.calledWith('git', [
        'tag',
        '-a',
        `v${mongoshVersion}`,
        '-m',
        `v${mongoshVersion}`,
      ]);
      expect(spawnSync).calledWith('git', ['push', '--tags']);
    });

    it('skips pushing version tags which already exist', function () {
      setupTestPublisher({ isDryRun: false, useAuxiliaryPackagesOnly: true });

      const packagesToSkip = [
        allReleasablePackages[0],
        allReleasablePackages[1],
      ];

      for (const packageInfo of packagesToSkip) {
        existsTag
          .withArgs(`${packageInfo.name}@${packageInfo.version}`)
          .returns(true);
      }

      testPublisher.pushTags();

      for (const packageInfo of auxiliaryPackages.filter(
        (p) => !packagesToSkip.includes(p)
      )) {
        expect(spawnSync).calledWith('git', [
          'tag',
          '-a',
          `${packageInfo.name}@${packageInfo.version}`,
          '-m',
          `${packageInfo.name}@${packageInfo.version}`,
        ]);
      }

      for (const packageInfo of [
        ...mongoshReleasePackages,
        ...packagesToSkip,
      ]) {
        expect(spawnSync).not.calledWith('git', [
          'tag',
          '-a',
          `${packageInfo.name}@${packageInfo.version}`,
          '-m',
          `${packageInfo.name}@${packageInfo.version}`,
        ]);
      }

      expect(spawnSync).not.calledWith('git', [
        'tag',
        '-a',
        `v${mongoshVersion}`,
        '-m',
        `v${mongoshVersion}`,
      ]);
      expect(spawnSync).calledWith('git', ['push', '--tags']);
    });

    it('skips mongosh release tag push if it exists', function () {
      setupTestPublisher({ isDryRun: false, useAuxiliaryPackagesOnly: false });

      existsTag.withArgs(`v${mongoshVersion}`).returns(true);

      testPublisher.pushTags();

      expect(spawnSync).not.calledWith('git', [
        'tag',
        '-a',
        `v${mongoshVersion}`,
        '-m',
        `v${mongoshVersion}`,
      ]);
      expect(spawnSync).calledWith('git', ['push', '--tags']);
    });
  });

  describe('existsTag()', function () {
    it('returns true with existing tags', function () {
      expect(testPublisher.existsTag('v1.0.0')).equals(true);
    });

    it('return false with tags that do not exist', function () {
      expect(testPublisher.existsTag('this-tag-will-never-exist-12345')).equals(
        false
      );
    });
  });

  describe('listNpmPackages()', function () {
    before(function () {
      if (process.version.startsWith('v16.')) return this.skip();
    });

    it('lists packages', function () {
      const packages = testPublisher.listNpmPackages();
      expect(packages.length).to.be.greaterThan(1);
      for (const { name, version } of packages) {
        expect(name).to.be.a('string');
        expect(version).to.be.a('string');
      }
    });
  });
});
