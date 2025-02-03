import { expect } from 'chai';
import { existsTag, pushTags } from './push-tags';
import sinon from 'sinon';
import { MONGOSH_RELEASE_PACKAGES } from './constants';

describe('pushing tags', function () {
  let spawnSync: sinon.SinonStub;
  let listNpmPackages: sinon.SinonStub;

  describe('existsTag', function () {
    it('returns true with existing tags', function () {
      expect(existsTag('v1.0.0')).equals(true);
    });

    it('return false with tags that do not exist', function () {
      expect(existsTag('this-tag-will-never-exist-12345')).equals(false);
    });
  });

  describe('pushTags', function () {
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
    let existsVersionTag: sinon.SinonStub;

    beforeEach(function () {
      spawnSync = sinon.stub();
      spawnSync.returns(undefined);

      listNpmPackages = sinon.stub();
      listNpmPackages.returns(allReleasablePackages);
      existsVersionTag = sinon.stub();
      existsVersionTag.returns(false);
    });

    afterEach(function () {
      sinon.restore();
    });

    it('throws if mongosh is not existent when publishing all', function () {
      const packages = [{ name: 'packageA', version: '0.7.0' }];
      listNpmPackages.returns(packages);

      expect(() =>
        pushTags(
          {
            isDryRun: false,
            useAuxiliaryPackagesOnly: false,
          },
          listNpmPackages,
          existsVersionTag,
          spawnSync
        )
      ).throws('mongosh package not found');
    });

    it('takes mongosh version and pushes tags when releasing', function () {
      pushTags(
        {
          isDryRun: false,
          useAuxiliaryPackagesOnly: false,
        },
        listNpmPackages,
        existsVersionTag,
        spawnSync
      );

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
      expect(spawnSync).calledWith('git', ['push', '--follow-tags']);
    });

    it('pushes only package tags when using auxiliary packages', function () {
      pushTags(
        {
          isDryRun: false,
          useAuxiliaryPackagesOnly: true,
        },
        listNpmPackages,
        existsVersionTag,
        spawnSync
      );

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
      expect(spawnSync).calledWith('git', ['push', '--follow-tags']);
    });

    it('skips pushing version tags which already exist', function () {
      const packagesToSkip = [
        allReleasablePackages[0],
        allReleasablePackages[1],
      ];

      for (const packageInfo of packagesToSkip) {
        existsVersionTag
          .withArgs(`${packageInfo.name}@${packageInfo.version}`)
          .returns(true);
      }

      pushTags(
        {
          isDryRun: false,
          useAuxiliaryPackagesOnly: true,
        },
        listNpmPackages,
        existsVersionTag,
        spawnSync
      );

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
      expect(spawnSync).calledWith('git', ['push', '--follow-tags']);
    });

    it('skips mongosh release tag push if it exists', function () {
      existsVersionTag.withArgs(`v${mongoshVersion}`).returns(true);

      pushTags(
        {
          useAuxiliaryPackagesOnly: false,
          isDryRun: false,
        },
        listNpmPackages,
        existsVersionTag,
        spawnSync
      );

      expect(spawnSync).not.calledWith('git', [
        'tag',
        '-a',
        `v${mongoshVersion}`,
        '-m',
        `v${mongoshVersion}`,
      ]);
      expect(spawnSync).calledWith('git', ['push', '--follow-tags']);
    });

    it('skips tag push if it is a dry run', function () {
      existsVersionTag.withArgs(`v${mongoshVersion}`).returns(true);

      pushTags(
        {
          useAuxiliaryPackagesOnly: false,
          isDryRun: true,
        },
        listNpmPackages,
        existsVersionTag,
        spawnSync
      );

      expect(spawnSync).not.calledWith('git', [
        'tag',
        '-a',
        `v${mongoshVersion}`,
        '-m',
        `v${mongoshVersion}`,
      ]);

      expect(spawnSync).not.calledWith('git', ['push', '--follow-tags']);
    });
  });
});
